import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import type {
  EmscriptenModule,
  Z3_context,
  Z3_solver,
  Z3_ast,
  Z3_optimize,
  Z3_rcf_num,
  Z3_lbool,
  UnsafeZ3Api,
  UserPropagatorCallbacks,
  Disposer,
  RcfInterval,
} from './types.js';
import { CallbackRegistry } from './callback-registry.js';
import { createUnsafeZ3 } from './unsafe.js';
import { createZ3Api, type Z3Api } from './z3-api.js';
import { attachUserPropagator, type CallbackErrorChannel } from './user-propagator.js';
import { getExactString, getFpaSign, getRcfInterval } from './model-inspection.js';
import { setErrorMode, checkError, type ErrorMode } from './errors.js';
import { createSolveFunction, type SolveBuilder, type SolveResult } from './dsl/solve.js';

export interface UserPropagatorApi {
  attach<S>(
    ctx: Z3_context,
    solver: Z3_solver,
    initialState: S,
    callbacks: UserPropagatorCallbacks<S>,
  ): Disposer;
  register(ctx: Z3_context, solver: Z3_solver, expr: Z3_ast): void;
}

export interface InspectApi {
  getExactString(ctx: Z3_context, ast: Z3_ast): { str: string; length: number };
  getFpaSign(ctx: Z3_context, ast: Z3_ast): { success: boolean; isNegative: boolean };
  getRcfInterval(ctx: Z3_context, a: Z3_rcf_num): { result: number; interval: RcfInterval };
}

export interface ErrorsApi {
  setMode(ctx: Z3_context, mode: ErrorMode): void;
  check(ctx: Z3_context): { code: number; message: string } | null;
}

export interface Z3Full {
  em: EmscriptenModule;
  Z3: Z3Api;
  UnsafeZ3: UnsafeZ3Api;
  registry: CallbackRegistry;
  userPropagator: UserPropagatorApi;
  inspect: InspectApi;
  errors: ErrorsApi;
  solveSync(ctx: Z3_context, solver: Z3_solver): Z3_lbool;
  solve(builder: SolveBuilder): SolveResult;
  dispose(): void;
}

export async function initZ3Full(): Promise<Z3Full> {
  const req = createRequire(import.meta.url);
  const vendorDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'vendor');
  const initZ3 = req(join(vendorDir, 'z3-built.cjs'));
  const wasmBinary = readFileSync(join(vendorDir, 'z3-built.wasm'));

  const em: EmscriptenModule = await initZ3({ wasmBinary });
  const Z3 = createZ3Api(em);
  const UnsafeZ3 = createUnsafeZ3(em);
  const registry = new CallbackRegistry(em);
  const errorChannel: CallbackErrorChannel = { error: null };
  const solve = createSolveFunction(em, Z3, UnsafeZ3, registry, errorChannel);

  return {
    em, Z3, UnsafeZ3, registry,
    userPropagator: {
      attach(ctx, solver, initialState, callbacks) {
        return attachUserPropagator(em, UnsafeZ3, registry, ctx, solver, initialState, callbacks, errorChannel);
      },
      register(ctx, solver, expr) {
        Z3.solver_propagate_register(ctx, solver, expr);
      },
    },
    inspect: {
      getExactString(ctx, ast) { return getExactString(em, UnsafeZ3, ctx, ast); },
      getFpaSign(ctx, ast) { return getFpaSign(em, UnsafeZ3, ctx, ast); },
      getRcfInterval(ctx, a) { return getRcfInterval(em, UnsafeZ3, ctx, a); },
    },
    errors: {
      setMode(ctx, mode) { setErrorMode(em, ctx, mode); },
      check(ctx) { return checkError(Z3, ctx); },
    },
    solveSync(ctx: Z3_context, solver: Z3_solver): Z3_lbool {
      errorChannel.error = null;
      const result = UnsafeZ3.Z3_solver_check(ctx, solver);
      if (errorChannel.error) {
        const err = errorChannel.error;
        errorChannel.error = null;
        throw err;
      }
      return result;
    },
    solve,
    dispose() { registry.dispose(); },
  };
}
