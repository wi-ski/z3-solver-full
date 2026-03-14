/**
 * Propagator lifecycle: onPush, onPop, onCreated during push/pop scopes.
 *
 * Shows how the solver notifies your propagator when scopes are
 * pushed/popped (backtracking), and when expressions are internalized.
 *
 * Run:  npx tsx examples/10-propagator-lifecycle.ts
 *
 * Output:
 *   [push]  scope opened
 *   [created] term internalized: <ptr>
 *   [fixed] x = true
 *   [final] accepting model
 *   SAT in scope
 *   [pop]   1 scope(s) closed
 *   Lifecycle complete
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const { Z3 } = z3;

  const { ctx, solver } = (() => {
    const cfg = Z3.mk_config();
    const ctx = Z3.mk_context(cfg);
    Z3.del_config(cfg);
    return { ctx, solver: Z3.mk_simple_solver(ctx) };
  })();

  const dispose = z3.userPropagator.attach(ctx, solver, {}, {
    onPush: () => console.log('[push]  scope opened'),
    onPop: (_s, _cb, n) => console.log(`[pop]   ${n} scope(s) closed`),
    onCreated: (_s, _cb, term) => console.log(`[created] term internalized: ${term}`),
    onFixed: (_s, _cb, _term, _val) => console.log('[fixed] x = true'),
    onFinal: () => { console.log('[final] accepting model'); return true; },
  });

  const boolSort = Z3.mk_bool_sort(ctx);
  const x = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'x'), boolSort);
  z3.userPropagator.register(ctx, solver, x);

  Z3.solver_push(ctx, solver);
  Z3.solver_assert(ctx, solver, x);

  const result = z3.solveSync(ctx, solver);
  console.log(result === 1 ? 'SAT in scope' : 'not SAT');

  Z3.solver_pop(ctx, solver, 1);
  console.log('Lifecycle complete');

  dispose();
  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
