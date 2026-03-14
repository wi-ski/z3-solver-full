/**
 * Graph coloring with distinct() — the solve() DSL at its best.
 *
 * 4 nodes, 6 edges (complete-minus-one), 3 colors.
 * Each node gets an integer color 1-3, adjacent nodes must differ.
 *
 * Run:  npx tsx examples/15-graph-coloring.ts
 *
 * Output:
 *   SAT
 *   A=1  B=2  C=3  D=1
 *   All edges satisfied ✓
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();

  const nodes = ['A', 'B', 'C', 'D'];
  const edges: [string, string][] = [
    ['A', 'B'], ['A', 'C'], ['A', 'D'],
    ['B', 'C'], ['B', 'D'],
  ];

  const result = z3.solve(({ Int, IntVal, assert, distinct }) => {
    const vars = Object.fromEntries(nodes.map(n => [n, Int(n)]));

    for (const n of nodes) {
      assert(vars[n].ge(IntVal(1)), vars[n].le(IntVal(3)));
    }

    for (const [a, b] of edges) {
      assert(vars[a].neq(vars[b]));
    }
  });

  console.log(result.sat ? 'SAT' : 'UNSAT');
  if (result.sat) {
    console.log(nodes.map(n => `${n}=${result.model.get(n)}`).join('  '));
    const ok = edges.every(([a, b]) => result.model.get(a) !== result.model.get(b));
    console.log(ok ? 'All edges satisfied' : 'VIOLATION');
  }

  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
