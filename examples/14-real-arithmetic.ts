/**
 * Real arithmetic via the solve() DSL.
 *
 * Demonstrates Real variables, rational literals, division,
 * comparison operators, and model extraction of rational values.
 *
 * Run:  npx tsx examples/14-real-arithmetic.ts
 *
 * Output:
 *   SAT
 *   x = 1.5 (or 3/2)
 *   y = 0.5 (or 1/2)
 *   x + y = 2
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();

  const result = z3.solve(({ Real, RealVal, assert }) => {
    const x = Real('x');
    const y = Real('y');

    assert(x.add(y).eq(RealVal(2)));
    assert(x.ge(RealVal(0)));
    assert(y.ge(RealVal(0)));
    assert(x.gt(y));
    assert(x.le(RealVal(3, 2)));
  });

  console.log(result.sat ? 'SAT' : 'UNSAT');
  if (result.sat) {
    const x = result.model.get('x') as number;
    const y = result.model.get('y') as number;
    console.log(`x = ${x}`);
    console.log(`y = ${y}`);
    console.log(`x + y = ${x + y}`);
  }

  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
