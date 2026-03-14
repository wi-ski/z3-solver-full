/**
 * DSL-level theory propagation: inject clauses from propagate() callbacks.
 *
 * The solve() DSL's propagate() callbacks now receive a `cb` object with
 * two methods:
 *   cb.propagate(consequent, fixed)  — "if fixed hold, then consequent must hold"
 *   cb.conflict(fixed)               — "the fixed assignments lead to contradiction"
 *
 * This is the DSL equivalent of Z3_solver_propagate_consequence (example 13)
 * but without touching raw pointers or contexts.
 *
 * Run:  npx tsx examples/17-dsl-consequence.ts
 *
 * Output:
 *   [propagate] x is fixed, forcing y := true
 *   SAT — y was forced true by propagator
 *   x = true, y = true
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();

  // ── Force y=true when x becomes fixed ──────────────────
  const result = z3.solve(({ Bool, assert, propagate }) => {
    const x = Bool('x');
    const y = Bool('y');

    assert(x);
    assert(x.or(y));

    let forced = false;

    propagate({
      variables: [x, y],
      onFixed(cb, _term, _value) {
        if (!forced) {
          forced = true;
          console.log('[propagate] x is fixed, forcing y := true');
          cb.propagate(y, [x]);
        }
      },
      onFinal() { return true; },
    });
  });

  if (result.sat) {
    console.log(`SAT — y was ${result.model.get('y') ? 'forced true' : 'false'} by propagator`);
    console.log(`x = ${result.model.get('x')}, y = ${result.model.get('y')}`);
  }

  // ── Conflict injection: reject first candidate, accept second ──
  let attempts = 0;
  const r2 = z3.solve(({ Bool, assert, propagate }) => {
    const a = Bool('a');
    assert(a.or(a.not()));

    propagate({
      variables: [a],
      onFinal(cb) {
        attempts++;
        if (attempts === 1) {
          cb.conflict([]);
          return false;
        }
        return true;
      },
    });
  });

  console.log(`\nConflict test: ${r2.sat ? 'SAT' : 'UNSAT'} after ${attempts} attempts`);

  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
