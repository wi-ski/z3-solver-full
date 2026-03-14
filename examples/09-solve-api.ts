/**
 * High-level solve() API — no contexts, no pointers, no dispose.
 *
 * One call builds constraints, attaches a propagator, solves, extracts
 * the model, and cleans everything up.
 *
 * Run:  npx tsx examples/09-solve-api.ts
 *
 * Output:
 *   fixed: <term> = <value>
 *   fixed: <term> = <value>
 *   SAT
 *   alice_works = true
 *   bob_works = true
 *   x + 2 <= y - 10: x=-12, y=0
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();

  // ── Boolean scheduling with propagator ────────────────
  const schedule = z3.solve(({ Bool, assert, propagate }) => {
    const alice = Bool('alice_works');
    const bob = Bool('bob_works');

    assert(alice.or(bob));           // at least one works
    assert(alice.implies(bob));      // if alice works, bob must too

    propagate({
      variables: [alice, bob],
      onFixed(_cb, term, value) {
        console.log(`fixed: ${term} = ${value}`);
      },
      onFinal() { return true; },
    });
  });

  console.log(schedule.sat ? 'SAT' : 'UNSAT');
  for (const [name, value] of schedule.model) {
    console.log(`${name} = ${value}`);
  }

  // ── Integer arithmetic ────────────────────────────────
  const math = z3.solve(({ Int, IntVal, assert }) => {
    const x = Int('x');
    const y = Int('y');
    assert(x.add(IntVal(2)).le(y.sub(IntVal(10))));
  });

  if (math.sat) {
    console.log(`x + 2 <= y - 10: x=${math.model.get('x')}, y=${math.model.get('y')}`);
  }

  // ── Error handling ────────────────────────────────────
  try {
    z3.solve(({ Bool, assert, propagate }) => {
      const x = Bool('x');
      assert(x);
      propagate({
        variables: [x],
        onFixed(_cb) { throw new Error('domain error'); },
        onFinal() { return true; },
      });
    });
  } catch (err: any) {
    console.log(`Caught: ${err.message}`);
  }

  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
