/**
 * Theory propagation: inject a learned clause from onFinal.
 *
 * When the solver reaches a candidate model where x=true, the
 * propagator forces y=true via solver_propagate_consequence.
 * This demonstrates steering the solver with custom theory reasoning.
 *
 * Run:  npx tsx examples/13-consequence.ts
 *
 * Output:
 *   [final] x is true, propagating y := true
 *   SAT — y was forced true by propagator
 */
import { initZ3Full } from '../src/index.js';
import type { Z3_ast, Z3_solver_callback } from '../src/types.js';

async function main() {
  const z3 = await initZ3Full();
  const { Z3 } = z3;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);
  const solver = Z3.mk_simple_solver(ctx);

  const boolSort = Z3.mk_bool_sort(ctx);
  const x = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'x'), boolSort);
  const y = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'y'), boolSort);

  let propagated = false;

  const dispose = z3.userPropagator.attach(ctx, solver, {}, {
    onFixed: () => {},
    onFinal: (_s, cb: Z3_solver_callback) => {
      if (!propagated) {
        propagated = true;
        console.log('[final] x is true, propagating y := true');
        const t = Z3.mk_true(ctx);
        Z3.solver_propagate_consequence(ctx, cb, [], [], [], t);
      }
      return true;
    },
  });

  z3.userPropagator.register(ctx, solver, x);
  z3.userPropagator.register(ctx, solver, y);

  Z3.solver_assert(ctx, solver, x);
  Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, [x, y]));

  const result = z3.solveSync(ctx, solver);
  if (result === 1) {
    const model = Z3.solver_get_model(ctx, solver);
    const yVal = Z3.get_bool_value(ctx, Z3.model_eval(ctx, model, y, true)!);
    console.log(`SAT — y was ${yVal === 1 ? 'forced true' : 'false'} by propagator`);
  }

  dispose();
  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
