/**
 * Enumerate multiple solutions by solving repeatedly with blocking clauses.
 *
 * After each SAT result, extracts the model, prints the assignment,
 * then adds a constraint that blocks that exact assignment and solves again.
 *
 * Uses mk_context_rc (reference-counted) because multiple solve calls
 * with model extraction require proper AST lifetime management.
 *
 * Run:  npx tsx examples/04-alternatives.ts
 *
 * Output:
 *   Solution 1: a=true  b=true  c=false
 *   Solution 2: a=false b=true  c=true
 *   Solution 3: a=true  b=false c=true
 *   Solution 4: a=true  b=true  c=true
 *   Found 4 alternatives
 */
import { initZ3Full } from "../src/index.js";

async function main() {
  const z3 = await initZ3Full();
  const Z3 = z3.Z3 as any;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context_rc(cfg);
  Z3.del_config(cfg);
  const solver = Z3.mk_simple_solver(ctx);
  Z3.solver_inc_ref(ctx, solver);

  const boolSort = Z3.mk_bool_sort(ctx);
  const names = ["a", "b", "c"];
  const vars = names.map((n) => {
    const v = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, n), boolSort);
    Z3.inc_ref(ctx, v);
    return v;
  });

  // At least two must be true
  Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, [vars[0], vars[1]]));
  Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, [vars[1], vars[2]]));
  Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, [vars[0], vars[2]]));

  let count = 0;
  while (true) {
    const result = z3.solveSync(ctx, solver);
    if (result !== 1) break;

    count++;
    const model = Z3.solver_get_model(ctx, solver);
    Z3.model_inc_ref(ctx, model);

    const vals = vars.map((v: any) => Z3.get_bool_value(ctx, Z3.model_eval(ctx, model, v, true)) === 1);
    Z3.model_dec_ref(ctx, model);

    console.log(`Solution ${count}: ` + names.map((n, i) => `${n}=${String(vals[i]).padEnd(5)}`).join(" "));

    // Block this exact assignment
    const lits = vals.map((v: boolean, i: number) => (v ? Z3.mk_not(ctx, vars[i]) : vars[i]));
    Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, lits));
  }

  console.log(`Found ${count} alternatives`);

  vars.forEach((v: any) => Z3.dec_ref(ctx, v));
  Z3.solver_dec_ref(ctx, solver);
  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
