export { initZ3Full } from './init.js';
export type { Z3Full, UserPropagatorApi, InspectApi, ErrorsApi } from './init.js';

export { createZ3Api } from './z3-api.js';
export type { Z3Api } from './z3-api.js';
export { HandleTable } from './handle-table.js';
export { CallbackRegistry } from './callback-registry.js';
export { createUnsafeZ3 } from './unsafe.js';
export { attachUserPropagator } from './user-propagator.js';
export { registerClauseStream, readClauseDeps } from './callbacks.js';
export { getExactString, getFpaSign, getRcfInterval } from './model-inspection.js';
export { setErrorMode, checkError } from './errors.js';
export type { ErrorMode } from './errors.js';

export { SolveContext, type PropagatorConfig, type PropagatorCallback } from './dsl/context.js';
export { Expr, BoolExpr, IntExpr, RealExpr, ArithExpr } from './dsl/types.js';
export type { SolveResult, SolveStatus, SolveBuilder } from './dsl/solve.js';

export type {
  EmscriptenModule,
  WasmFnPtr,
  Z3_context,
  Z3_solver,
  Z3_solver_callback,
  Z3_ast,
  Z3_ast_vector,
  Z3_sort,
  Z3_func_decl,
  Z3_symbol,
  Z3_model,
  Z3_optimize,
  Z3_fixedpoint,
  Z3_rcf_num,
  Z3_lbool,
  UnsafeZ3Api,
  UserPropagatorCallbacks,
  ClauseEvent,
  ClauseStreamCallbacks,
  RcfInterval,
  Disposer,
} from './types.js';

export { CALLBACK_SIGNATURES } from './types.js';
