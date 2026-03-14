/**
 * Low-level escape hatch: register raw WASM callback function pointers.
 *
 * For when the ergonomic API doesn't cover your use case. You get direct
 * access to addFunction/removeFunction, ccall, and every Z3 WASM export.
 *
 * Run:  npx tsx examples/07-unsafe-raw.ts
 *
 * Output:
 *   Registered callback at table slot <N>
 *   fixed_eh called: userCtx=42 term=<ptr> value=<ptr>
 *   SAT
 *   Callback cleaned up
 */
import { initZ3Full, CALLBACK_SIGNATURES } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const Z3 = z3.Z3 as any;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);
  const solver = Z3.mk_simple_solver(ctx);

  // Register raw callback function pointers using the registry
  const pushPtr = z3.registry.addCallback(CALLBACK_SIGNATURES.Z3_push_eh,
    (_userCtx: number, _cb: number) => {},
  );
  const popPtr = z3.registry.addCallback(CALLBACK_SIGNATURES.Z3_pop_eh,
    (_userCtx: number, _cb: number, _n: number) => {},
  );
  const freshPtr = z3.registry.addCallback(CALLBACK_SIGNATURES.Z3_fresh_eh,
    (userCtx: number, _newCtx: number) => userCtx,
  );

  const fixedPtr = z3.registry.addCallback(CALLBACK_SIGNATURES.Z3_fixed_eh,
    (userCtx: number, _cb: number, term: number, value: number) => {
      console.log(`fixed_eh called: userCtx=${userCtx} term=${term} value=${value}`);
    },
  );

  const finalPtr = z3.registry.addCallback(CALLBACK_SIGNATURES.Z3_final_eh,
    (_userCtx: number, _cb: number) => 1, // return true (accept model)
  );

  console.log(`Registered callback at table slot ${fixedPtr}`);

  // Wire directly through UnsafeZ3
  const USER_CTX = 42;
  z3.UnsafeZ3.Z3_solver_propagate_init(ctx, solver, USER_CTX, pushPtr, popPtr, freshPtr);
  z3.UnsafeZ3.Z3_solver_propagate_fixed(ctx, solver, fixedPtr);
  z3.UnsafeZ3.Z3_solver_propagate_final(ctx, solver, finalPtr);

  const boolSort = Z3.mk_bool_sort(ctx);
  const x = Z3.mk_const(ctx, Z3.mk_string_symbol(ctx, 'raw_x'), boolSort);
  Z3.solver_propagate_register(ctx, solver, x);
  Z3.solver_assert(ctx, solver, x);

  const result = z3.solveSync(ctx, solver);
  console.log(result === 1 ? 'SAT' : 'UNSAT');

  // Clean up all callback pointers
  z3.registry.removeCallback(pushPtr);
  z3.registry.removeCallback(popPtr);
  z3.registry.removeCallback(freshPtr);
  z3.registry.removeCallback(fixedPtr);
  z3.registry.removeCallback(finalPtr);
  console.log('Callback cleaned up');

  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
