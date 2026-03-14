import type { EmscriptenModule, UnsafeZ3Api, Z3_lbool } from './types.js';

/**
 * Build the UnsafeZ3 raw API surface.
 *
 * These are the functions that exist in the WASM binary (verified via
 * createExportWrapper in z3-built.js) but are not surfaced by the
 * z3-solver JS wrapper because they take callback function pointers,
 * void* user_context, bool out-params, or return Z3_char_ptr.
 *
 * Each function is exposed as a thin ccall wrapper. The caller is
 * responsible for providing valid WASM pointers (from addFunction,
 * _malloc, etc.) and managing lifetimes.
 */
export function createUnsafeZ3(mod: EmscriptenModule): UnsafeZ3Api {
  const N = 'number';
  const nul = null;

  return {
    // ── Clause stream ────────────────────────────────────────────
    // void Z3_solver_register_on_clause(ctx, solver, void* user_ctx, Z3_on_clause_eh)
    Z3_solver_register_on_clause(ctx, solver, userCtx, onClauseCb) {
      mod.ccall(
        'Z3_solver_register_on_clause',
        nul,
        [N, N, N, N],
        [ctx, solver, userCtx, onClauseCb],
      );
    },

    // ── User propagator lifecycle ────────────────────────────────
    // void Z3_solver_propagate_init(ctx, solver, void* user_ctx, push_eh, pop_eh, fresh_eh)
    Z3_solver_propagate_init(ctx, solver, userCtx, pushCb, popCb, freshCb) {
      mod.ccall(
        'Z3_solver_propagate_init',
        nul,
        [N, N, N, N, N, N],
        [ctx, solver, userCtx, pushCb, popCb, freshCb],
      );
    },

    // void Z3_solver_propagate_fixed(ctx, solver, fixed_eh)
    Z3_solver_propagate_fixed(ctx, solver, fixedCb) {
      mod.ccall(
        'Z3_solver_propagate_fixed',
        nul,
        [N, N, N],
        [ctx, solver, fixedCb],
      );
    },

    // void Z3_solver_propagate_final(ctx, solver, final_eh)
    Z3_solver_propagate_final(ctx, solver, finalCb) {
      mod.ccall(
        'Z3_solver_propagate_final',
        nul,
        [N, N, N],
        [ctx, solver, finalCb],
      );
    },

    // void Z3_solver_propagate_eq(ctx, solver, eq_eh)
    Z3_solver_propagate_eq(ctx, solver, eqCb) {
      mod.ccall(
        'Z3_solver_propagate_eq',
        nul,
        [N, N, N],
        [ctx, solver, eqCb],
      );
    },

    // void Z3_solver_propagate_diseq(ctx, solver, eq_eh)
    Z3_solver_propagate_diseq(ctx, solver, diseqCb) {
      mod.ccall(
        'Z3_solver_propagate_diseq',
        nul,
        [N, N, N],
        [ctx, solver, diseqCb],
      );
    },

    // void Z3_solver_propagate_created(ctx, solver, created_eh)
    Z3_solver_propagate_created(ctx, solver, createdCb) {
      mod.ccall(
        'Z3_solver_propagate_created',
        nul,
        [N, N, N],
        [ctx, solver, createdCb],
      );
    },

    // void Z3_solver_propagate_decide(ctx, solver, decide_eh)
    Z3_solver_propagate_decide(ctx, solver, decideCb) {
      mod.ccall(
        'Z3_solver_propagate_decide',
        nul,
        [N, N, N],
        [ctx, solver, decideCb],
      );
    },

    // void Z3_solver_propagate_on_binding(ctx, solver, on_binding_eh)
    Z3_solver_propagate_on_binding(ctx, solver, onBindingCb) {
      mod.ccall(
        'Z3_solver_propagate_on_binding',
        nul,
        [N, N, N],
        [ctx, solver, onBindingCb],
      );
    },

    // ── Value / marshaling gaps ──────────────────────────────────

    // Z3_char_ptr Z3_get_lstring(ctx, ast, unsigned* length)
    Z3_get_lstring(ctx, ast, lengthPtr) {
      return mod.ccall(
        'Z3_get_lstring',
        N,
        [N, N, N],
        [ctx, ast, lengthPtr],
      ) as number;
    },

    // bool Z3_fpa_get_numeral_sign(ctx, ast, bool* sgn)
    Z3_fpa_get_numeral_sign(ctx, ast, sgnPtr) {
      return mod.ccall(
        'Z3_fpa_get_numeral_sign',
        'boolean',
        [N, N, N],
        [ctx, ast, sgnPtr],
      ) as boolean;
    },

    // int Z3_solver_check(ctx, solver) — synchronous, main thread
    Z3_solver_check(ctx, solver) {
      return mod.ccall(
        'Z3_solver_check',
        N,
        [N, N],
        [ctx, solver],
      ) as Z3_lbool;
    },

    // void Z3_interrupt(ctx)
    Z3_interrupt(ctx) {
      mod.ccall('Z3_interrupt', nul, [N], [ctx]);
    },

    // void Z3_set_error_handler(ctx, error_handler_cb)
    Z3_set_error_handler(ctx, errorHandlerCb) {
      mod.ccall('Z3_set_error_handler', nul, [N, N], [ctx, errorHandlerCb]);
    },

    // void Z3_optimize_register_model_eh(ctx, opt, void* user_ctx, model_cb)
    Z3_optimize_register_model_eh(ctx, opt, userCtx, modelCb) {
      mod.ccall('Z3_optimize_register_model_eh', nul, [N, N, N, N], [ctx, opt, userCtx, modelCb]);
    },

    // void Z3_fixedpoint_init(ctx, fp, void* state)
    Z3_fixedpoint_init(ctx, fp, userCtx) {
      mod.ccall('Z3_fixedpoint_init', nul, [N, N, N], [ctx, fp, userCtx]);
    },

    // void Z3_fixedpoint_set_reduce_assign_callback(ctx, fp, cb)
    Z3_fixedpoint_set_reduce_assign_callback(ctx, fp, cb) {
      mod.ccall('Z3_fixedpoint_set_reduce_assign_callback', nul, [N, N, N], [ctx, fp, cb]);
    },

    // void Z3_fixedpoint_set_reduce_app_callback(ctx, fp, cb)
    Z3_fixedpoint_set_reduce_app_callback(ctx, fp, cb) {
      mod.ccall('Z3_fixedpoint_set_reduce_app_callback', nul, [N, N, N], [ctx, fp, cb]);
    },

    // void Z3_fixedpoint_add_callback(ctx, fp, void* state, push_cb, pop_cb)
    Z3_fixedpoint_add_callback(ctx, fp, userCtx, pushCb, popCb) {
      mod.ccall('Z3_fixedpoint_add_callback', nul, [N, N, N, N, N], [ctx, fp, userCtx, pushCb, popCb]);
    },

    // void Z3_fixedpoint_add_constraint(ctx, fp, constraint, level)
    Z3_fixedpoint_add_constraint(ctx, fp, constraint, level) {
      mod.ccall('Z3_fixedpoint_add_constraint', nul, [N, N, N, N], [ctx, fp, constraint, level]);
    },

    // int Z3_rcf_interval(ctx, a, bool* li, bool* lo, rcf_num* l, bool* ui, bool* uo, rcf_num* u)
    Z3_rcf_interval(
      ctx,
      a,
      lowerIsInfPtr,
      lowerIsOpenPtr,
      lowerPtr,
      upperIsInfPtr,
      upperIsOpenPtr,
      upperPtr,
    ) {
      return mod.ccall(
        'Z3_rcf_interval',
        N,
        [N, N, N, N, N, N, N, N],
        [
          ctx,
          a,
          lowerIsInfPtr,
          lowerIsOpenPtr,
          lowerPtr,
          upperIsInfPtr,
          upperIsOpenPtr,
          upperPtr,
        ],
      ) as number;
    },
  };
}
