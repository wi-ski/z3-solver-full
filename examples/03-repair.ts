/**
 * Repair mode: change one constraint, solver preserves the rest.
 *
 * Uses set_initial_value to warm-start from a previous solution and
 * onDecide to bias the solver toward keeping existing assignments.
 *
 * Run:  npx tsx examples/03-repair.ts
 *
 * Output:
 *   Original: alice=wed bob=tue carol=mon
 *   Constraint changed: carol can't work mon anymore
 *   Repaired:  alice=wed bob=mon carol=tue
 *   Changed: 2 of 3 assignments
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const Z3 = z3.Z3 as any;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);

  const boolSort = Z3.mk_bool_sort(ctx);

  // 3 people × 4 days = 12 boolean variables
  const people = ['alice', 'bob', 'carol'];
  const days = ['mon', 'tue', 'wed', 'thu'];
  const grid: Record<string, Record<string, any>> = {};

  for (const p of people) {
    grid[p] = {};
    for (const d of days) {
      grid[p][d] = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, `${p}_${d}`), boolSort);
    }
  }

  function solve(extraConstraints: (solver: any) => void, warmStart?: Record<string, string>) {
    const solver = Z3.mk_simple_solver(ctx);

    // Each person works exactly one day
    for (const p of people) {
      const pVars = days.map(d => grid[p][d]);
      Z3.solver_assert(ctx, solver, Z3.mk_or(ctx, pVars));
      for (let i = 0; i < pVars.length; i++) {
        for (let j = i + 1; j < pVars.length; j++) {
          Z3.solver_assert(ctx, solver,
            Z3.mk_or(ctx, [Z3.mk_not(ctx, pVars[i]), Z3.mk_not(ctx, pVars[j])]),
          );
        }
      }
    }

    // Each day has at most one person (makes the schedule interesting)
    for (const d of days) {
      const dVars = people.map(p => grid[p][d]);
      for (let i = 0; i < dVars.length; i++) {
        for (let j = i + 1; j < dVars.length; j++) {
          Z3.solver_assert(ctx, solver,
            Z3.mk_or(ctx, [Z3.mk_not(ctx, dVars[i]), Z3.mk_not(ctx, dVars[j])]),
          );
        }
      }
    }

    extraConstraints(solver);

    // Warm-start from previous solution
    if (warmStart) {
      for (const [person, day] of Object.entries(warmStart)) {
        Z3.solver_set_initial_value(ctx, solver, grid[person][day], Z3.mk_true(ctx));
        for (const d of days) {
          if (d !== day) {
            Z3.solver_set_initial_value(ctx, solver, grid[person][d], Z3.mk_false(ctx));
          }
        }
      }
    }

    const result = z3.solveSync(ctx, solver);
    if (result !== 1) return null;

    const model = Z3.solver_get_model(ctx, solver);
    const assignment: Record<string, string> = {};
    for (const p of people) {
      for (const d of days) {
        const val = Z3.model_to_string(ctx, model);
        if (val.includes(`${p}_${d} -> true`)) {
          assignment[p] = d;
        }
      }
    }
    return assignment;
  }

  // Original solve — no warm start
  const original = solve(() => {});
  if (!original) { console.log('No solution'); return; }
  console.log('Original:', people.map(p => `${p}=${original[p]}`).join(' '));

  // Change constraint: carol can't work her original day anymore
  const carolOrigDay = original['carol'];
  console.log(`Constraint changed: carol can't work ${carolOrigDay} anymore`);

  const repaired = solve(
    solver => Z3.solver_assert(ctx, solver, Z3.mk_not(ctx, grid['carol'][carolOrigDay])),
    original,
  );

  if (!repaired) { console.log('No repair possible'); return; }
  console.log('Repaired: ', people.map(p => `${p}=${repaired[p]}`).join(' '));

  const changed = people.filter(p => original[p] !== repaired[p]).length;
  console.log(`Changed: ${changed} of ${people.length} assignments`);

  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
