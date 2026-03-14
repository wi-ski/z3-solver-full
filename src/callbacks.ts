import type { CallbackRegistry } from './callback-registry.js';
import type {
  UnsafeZ3Api,
  EmscriptenModule,
  Z3_context,
  Z3_solver,
  Z3_ast,
  Z3_ast_vector,
  ClauseStreamCallbacks,
  Disposer,
} from './types.js';
import { CALLBACK_SIGNATURES } from './types.js';

/**
 * Register a clause lifecycle event stream on a solver.
 *
 * Z3's CDCL(T) engine emits events when clauses are added, inferred,
 * or deleted during search. This function wires those events to a JS
 * callback with structured event data.
 *
 * C signature:
 *   void Z3_solver_register_on_clause(
 *     Z3_context c, Z3_solver s, void* user_context,
 *     Z3_on_clause_eh on_clause_eh)
 *
 * Callback signature:
 *   void on_clause(void* ctx, Z3_ast proof_hint, unsigned n,
 *                  unsigned const* deps, Z3_ast_vector literals)
 *
 * Returns a disposer that removes the WASM callback pointer.
 */
export function registerClauseStream(
  mod: EmscriptenModule,
  raw: UnsafeZ3Api,
  registry: CallbackRegistry,
  ctx: Z3_context,
  solver: Z3_solver,
  callbacks: ClauseStreamCallbacks,
): Disposer {
  const handleId = registry.createHandle(callbacks);

  const cbPtr = registry.addCallback(
    CALLBACK_SIGNATURES.Z3_on_clause_eh,
    (
      _userCtx: number,
      proofHint: number,
      numDeps: number,
      depsPtr: number,
      literals: number,
    ) => {
      const cbs = registry.getHandle<ClauseStreamCallbacks>(_userCtx);
      cbs.onClause({
        proofHint: proofHint as unknown as Z3_ast,
        numDeps,
        depsPtr,
        literals: literals as unknown as Z3_ast_vector,
      });
    },
  );

  raw.Z3_solver_register_on_clause(ctx, solver, handleId, cbPtr);

  return () => {
    registry.removeCallback(cbPtr);
    registry.deleteHandle(handleId);
  };
}

/**
 * Read the deps array from a clause event.
 *
 * The on_clause callback receives a pointer to an array of unsigned ints
 * (dependency indices). This helper reads `n` values from that pointer.
 */
export function readClauseDeps(
  mod: EmscriptenModule,
  depsPtr: number,
  n: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    result.push(mod.HEAPU32[(depsPtr >> 2) + i]);
  }
  return result;
}
