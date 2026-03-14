import type { Z3_ast, Z3_model, Z3_lbool, Z3_solver_callback, Disposer } from '../types.js';
import type { CallbackRegistry } from '../callback-registry.js';
import type { CallbackErrorChannel } from '../user-propagator.js';
import { attachUserPropagator } from '../user-propagator.js';
import type { EmscriptenModule, UnsafeZ3Api } from '../types.js';
import { SolveContext, type PropagatorConfig, type PropagatorCallback } from './context.js';
import type { Z3Low } from './types.js';
import { BoolExpr, Expr } from './types.js';

export type SolveStatus = 'sat' | 'unsat' | 'unknown';

export interface SolveResult {
  status: SolveStatus;
  sat: boolean;
  unsat: boolean;
  unknown: boolean;
  model: Map<string, boolean | number | string>;
  unsatCore: string[];
  rawResult: Z3_lbool;
}

export type SolveBuilder = (ctx: SolveContext) => void;

export function createSolveFunction(
  em: EmscriptenModule,
  Z3: Z3Low,
  UnsafeZ3: UnsafeZ3Api,
  registry: CallbackRegistry,
  errorChannel: CallbackErrorChannel,
) {
  return function solve(builder: SolveBuilder): SolveResult {
    const sctx = new SolveContext(Z3, em);
    let propagatorDispose: Disposer | null = null;

    try {
      builder(sctx);

      const propConfig = sctx.getPropagatorConfig();
      if (propConfig) {
        function makeCb(rawCb: Z3_solver_callback): PropagatorCallback {
          return {
            conflict(fixed: Expr[]) {
              Z3.solver_propagate_consequence(
                sctx.ctx, rawCb,
                fixed.map(e => e.ast), [], [],
                Z3.mk_false(sctx.ctx),
              );
            },
            propagate(consequent: BoolExpr, fixed: Expr[], eqs?: [Expr, Expr][]) {
              Z3.solver_propagate_consequence(
                sctx.ctx, rawCb,
                fixed.map(e => e.ast),
                eqs ? eqs.map(([l]) => l.ast) : [],
                eqs ? eqs.map(([, r]) => r.ast) : [],
                consequent.ast,
              );
            },
          };
        }

        propagatorDispose = attachUserPropagator(
          em, UnsafeZ3, registry,
          sctx.ctx, sctx.solver,
          {},
          {
            onFixed: propConfig.onFixed
              ? (_s, rawCb, term, value) => propConfig.onFixed!(makeCb(rawCb), term, value)
              : undefined,
            onEq: propConfig.onEq
              ? (_s, rawCb, lhs, rhs) => propConfig.onEq!(makeCb(rawCb), lhs, rhs)
              : undefined,
            onDiseq: propConfig.onDiseq
              ? (_s, rawCb, lhs, rhs) => propConfig.onDiseq!(makeCb(rawCb), lhs, rhs)
              : undefined,
            onFinal: propConfig.onFinal
              ? (_s, rawCb) => propConfig.onFinal!(makeCb(rawCb))
              : () => true,
            onCreated: propConfig.onCreated
              ? (_s, rawCb, term) => propConfig.onCreated!(makeCb(rawCb), term)
              : undefined,
            onDecide: propConfig.onDecide
              ? (_s, rawCb, term, idx, phase) => propConfig.onDecide!(makeCb(rawCb), term, idx, phase)
              : undefined,
          },
          errorChannel,
        );

        for (const variable of propConfig.variables) {
          Z3.solver_propagate_register(sctx.ctx, sctx.solver, variable.ast);
        }
      }

      errorChannel.error = null;
      const rawResult = UnsafeZ3.Z3_solver_check(sctx.ctx, sctx.solver) as Z3_lbool;
      if (errorChannel.error) {
        const err = errorChannel.error;
        errorChannel.error = null;
        throw err;
      }

      const status: SolveStatus = rawResult === 1 ? 'sat' : rawResult === -1 ? 'unsat' : 'unknown';
      const model = new Map<string, boolean | number | string>();
      const unsatCore: string[] = [];

      if (rawResult === -1 && sctx.hasTracked()) {
        const coreVec = Z3.solver_get_unsat_core(sctx.ctx, sctx.solver);
        const coreSize = Z3.ast_vector_size(sctx.ctx, coreVec);
        for (let i = 0; i < coreSize; i++) {
          unsatCore.push(Z3.ast_to_string(sctx.ctx, Z3.ast_vector_get(sctx.ctx, coreVec, i)));
        }
      }

      if (rawResult === 1) {
        const z3Model = Z3.solver_get_model(sctx.ctx, sctx.solver);
        const vars = sctx.getVars();

        for (const [name, info] of vars) {
          const evald = Z3.model_eval(sctx.ctx, z3Model, info.ast, true);
          if (evald == null) continue;

          switch (info.sort) {
            case 'bool': {
              model.set(name, Z3.get_bool_value(sctx.ctx, evald) === 1);
              break;
            }
            case 'int': {
              model.set(name, parseInt(Z3.get_numeral_string(sctx.ctx, evald), 10));
              break;
            }
            case 'real': {
              const str = Z3.get_numeral_string(sctx.ctx, evald);
              if (str.includes('/')) {
                const [num, den] = str.split('/');
                model.set(name, parseInt(num, 10) / parseInt(den, 10));
              } else {
                model.set(name, parseFloat(str));
              }
              break;
            }
            case 'enum': {
              const idx = parseInt(Z3.get_numeral_string(sctx.ctx, evald), 10);
              for (const es of sctx.getEnumSorts().values()) {
                if (idx < es.values.length) { model.set(name, es.values[idx]); break; }
              }
              if (!model.has(name)) model.set(name, String(idx));
              break;
            }
          }
        }
      }

      return { status, sat: status === 'sat', unsat: status === 'unsat', unknown: status === 'unknown', model, unsatCore, rawResult };
    } finally {
      if (propagatorDispose) propagatorDispose();
      sctx.destroy();
    }
  };
}
