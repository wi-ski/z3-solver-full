/**
 * Callback exception handling: errors in callbacks propagate cleanly.
 *
 * When user code throws inside a callback (onFixed, onFinal, etc.),
 * the error is caught, Z3 is interrupted, and the original error
 * is re-thrown from solveSync. The solver is not corrupted.
 *
 * Run:  npx tsx examples/08-error-boundary.ts
 *
 * Output:
 *   Caught from solveSync: Error: schedule conflict detected
 *   Context still usable: true (SAT on new solver)
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const Z3 = z3.Z3 as any;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);
  const solver = Z3.mk_simple_solver(ctx);

  const boolSort = Z3.mk_bool_sort(ctx);
  const x = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'x'), boolSort);

  // Attach a propagator that throws when a variable is assigned
  const dispose = z3.userPropagator.attach(ctx, solver, {}, {
    onFixed(_state, _cb, _term, _value) {
      throw new Error('schedule conflict detected');
    },
    onFinal() { return true; },
  });

  Z3.solver_propagate_register(ctx, solver, x);
  Z3.solver_assert(ctx, solver, x);

  try {
    z3.solveSync(ctx, solver);
    console.log('ERROR: should have thrown');
  } catch (err: any) {
    console.log(`Caught from solveSync: ${err}`);
  }

  dispose();

  // The context is still usable — create a new solver and solve
  const solver2 = Z3.mk_simple_solver(ctx);
  const y = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'y'), boolSort);
  Z3.solver_assert(ctx, solver2, y);
  const result = z3.solveSync(ctx, solver2);
  console.log(`Context still usable: ${result === 1} (SAT on new solver)`);

  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
