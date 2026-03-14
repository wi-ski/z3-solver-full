/**
 * Basic satisfiability check with Z3.
 *
 * Run:  npx tsx examples/01-hello.ts
 *
 * Output:
 *   SAT
 *   x = 0
 *   y = 12
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const Z3 = z3.Z3 as any;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);

  const solver = Z3.mk_simple_solver(ctx);
  const intSort = Z3.mk_int_sort(ctx);

  const x = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'x'), intSort);
  const y = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'y'), intSort);
  const two = Z3.mk_int(ctx, 2, intSort);
  const ten = Z3.mk_int(ctx, 10, intSort);

  // x + 2 <= y - 10
  Z3.solver_assert(ctx, solver,
    Z3.mk_le(ctx, Z3.mk_add(ctx, [x, two]), Z3.mk_sub(ctx, [y, ten])),
  );

  const result = z3.solveSync(ctx, solver);

  if (result === 1) {
    const model = Z3.solver_get_model(ctx, solver);
    console.log('SAT');
    console.log('x =', Z3.model_to_string(ctx, model).match(/x -> (.+)/)?.[1]);
    console.log('y =', Z3.model_to_string(ctx, model).match(/y -> (.+)/)?.[1]);
  } else {
    console.log(result === -1 ? 'UNSAT' : 'UNKNOWN');
  }

  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
