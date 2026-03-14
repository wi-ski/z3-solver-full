/**
 * Clause streaming: watch Z3's CDCL engine emit clauses in real time.
 *
 * Uses raw addFunction + ccall to register an on_clause callback.
 * Each clause event is printed as it arrives during solving.
 *
 * Run:  npx tsx examples/11-clause-stream.ts
 *
 * Output:
 *   Registered on_clause callback
 *   [clause] proof=<ptr> deps=0
 *   ... (more clause events)
 *   SAT — received N clause events
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const { Z3, em } = z3;

  const ctx = em.ccall('Z3_mk_context', 'number', ['number'], [0]);
  const solver = em.ccall('Z3_mk_solver', 'number', ['number'], [ctx]);
  em.ccall('Z3_solver_inc_ref', null, ['number', 'number'], [ctx, solver]);

  let count = 0;
  const cbPtr = em.addFunction(
    (_userCtx: number, proofHint: number, numDeps: number, _depsPtr: number, _literals: number) => {
      count++;
      if (count <= 5) console.log(`[clause] proof=${proofHint} deps=${numDeps}`);
    },
    'viiiii',
  );

  em.ccall('Z3_solver_register_on_clause', null,
    ['number', 'number', 'number', 'number'],
    [ctx, solver, 0, cbPtr]);
  console.log('Registered on_clause callback');

  const boolSort = Z3.mk_bool_sort(ctx as any);
  const vars = ['a', 'b', 'c', 'd'].map(name =>
    Z3.mk_const(ctx as any, Z3.mk_string_symbol(ctx as any, name), boolSort));

  Z3.solver_assert(ctx as any, solver as any, Z3.mk_or(ctx as any, [vars[0], vars[1]] as any));
  Z3.solver_assert(ctx as any, solver as any, Z3.mk_or(ctx as any, [vars[2], vars[3]] as any));
  Z3.solver_assert(ctx as any, solver as any, Z3.mk_or(ctx as any, [vars[0], vars[2]] as any));

  const result = em.ccall('Z3_solver_check', 'number', ['number', 'number'], [ctx, solver]);
  console.log(`${result === 1 ? 'SAT' : 'UNSAT'} — received ${count} clause events`);

  em.removeFunction(cbPtr);
  em.ccall('Z3_solver_dec_ref', null, ['number', 'number'], [ctx, solver]);
  em.ccall('Z3_del_context', null, ['number'], [ctx]);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
