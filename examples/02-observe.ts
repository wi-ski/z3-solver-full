/**
 * Watch the solver assign variables in real time.
 *
 * Attaches a user propagator that logs every assignment and equality
 * event as a timestamped timeline.
 *
 * Run:  npx tsx examples/02-observe.ts
 *
 * Output:
 *   [   0ms] fixed  term=<ptr> → val=<ptr>
 *   [   1ms] fixed  term=<ptr> → val=<ptr>
 *   [   1ms] final  2 events — accepting model
 *   SAT
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
  const names = ['alice_mon', 'alice_tue', 'bob_mon', 'bob_tue'];
  const vars = names.map(n =>
    Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, n), boolSort),
  );

  const timeline: Array<{ kind: string; ms: number; detail: string }> = [];
  const t0 = Date.now();

  const dispose = z3.userPropagator.attach(ctx, solver, {}, {
    onFixed(_state, _cb, term, value) {
      timeline.push({ kind: 'fixed', ms: Date.now() - t0, detail: `term=${term} → val=${value}` });
    },
    onEq(_state, _cb, lhs, rhs) {
      timeline.push({ kind: 'eq', ms: Date.now() - t0, detail: `${lhs} == ${rhs}` });
    },
    onDiseq(_state, _cb, lhs, rhs) {
      timeline.push({ kind: 'diseq', ms: Date.now() - t0, detail: `${lhs} != ${rhs}` });
    },
    onFinal() {
      timeline.push({ kind: 'final', ms: Date.now() - t0, detail: `${timeline.length} events — accepting model` });
      return true;
    },
  });

  for (const v of vars) Z3.solver_propagate_register(ctx, solver, v);

  // Alice works at least one day, Bob works at least one day
  Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, [vars[0], vars[1]]));
  Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, [vars[2], vars[3]]));

  z3.solveSync(ctx, solver);

  for (const e of timeline) {
    console.log(`[${String(e.ms).padStart(4)}ms] ${e.kind.padEnd(6)} ${e.detail}`);
  }
  console.log('SAT');

  dispose();
  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
