/**
 * Graceful interruption: cancel a solve from inside a callback.
 *
 * Calls Z3_interrupt from onFinal to stop the solver. The solver
 * returns "unknown" (0) instead of SAT/UNSAT. No crash, no corruption.
 *
 * Run:  npx tsx examples/12-interrupt.ts
 *
 * Output:
 *   [final] call #1 — interrupting solver
 *   Result: unknown (solver was interrupted)
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const { Z3, UnsafeZ3 } = z3;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);
  const solver = Z3.mk_simple_solver(ctx);

  let finalCalls = 0;

  const dispose = z3.userPropagator.attach(ctx, solver, {}, {
    onFinal: () => {
      finalCalls++;
      console.log(`[final] call #${finalCalls} — interrupting solver`);
      UnsafeZ3.Z3_interrupt(ctx);
      return false;
    },
  });

  const boolSort = Z3.mk_bool_sort(ctx);
  const x = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'x'), boolSort);
  z3.userPropagator.register(ctx, solver, x);
  Z3.solver_assert(ctx, solver, x);

  const result = z3.solveSync(ctx, solver);
  const label = result === 1 ? 'sat' : result === -1 ? 'unsat' : 'unknown';
  console.log(`Result: ${label} (solver was interrupted)`);

  dispose();
  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
