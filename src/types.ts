declare const __brand: unique symbol;
type Ptr<Tag extends string> = number & { readonly [__brand]: Tag };

export type Z3_context = Ptr<'Z3_context'>;
export type Z3_solver = Ptr<'Z3_solver'>;
export type Z3_solver_callback = Ptr<'Z3_solver_callback'>;
export type Z3_ast = Ptr<'Z3_ast'>;
export type Z3_ast_vector = Ptr<'Z3_ast_vector'>;
export type Z3_sort = Ptr<'Z3_sort'>;
export type Z3_func_decl = Ptr<'Z3_func_decl'>;
export type Z3_symbol = Ptr<'Z3_symbol'>;
export type Z3_model = Ptr<'Z3_model'>;
export type Z3_optimize = Ptr<'Z3_optimize'>;
export type Z3_fixedpoint = Ptr<'Z3_fixedpoint'>;
export type Z3_rcf_num = Ptr<'Z3_rcf_num'>;
export type Z3_lbool = -1 | 0 | 1;

export interface EmscriptenModule {
  ccall(
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ): unknown;
  addFunction(fn: Function, sig: string): number;
  removeFunction(ptr: number): void;
  UTF8ToString(ptr: number, maxBytesToRead?: number): string;
  _malloc(size: number): number;
  _free(ptr: number): void;

  HEAP8: Int8Array;
  HEAPU8: Uint8Array;
  HEAP16: Int16Array;
  HEAPU16: Uint16Array;
  HEAP32: Int32Array;
  HEAPU32: Uint32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
}

export type WasmFnPtr = number;

// Verified against actual C casts in Z3Prover/z3/src/api/api_solver.cpp.
export const CALLBACK_SIGNATURES = {
  Z3_push_eh: 'vii',
  Z3_pop_eh: 'viii',
  Z3_fresh_eh: 'iii',
  Z3_fixed_eh: 'viiii',
  Z3_eq_eh: 'viiii',
  Z3_diseq_eh: 'viiii',
  Z3_final_eh: 'iii',
  Z3_created_eh: 'viii',
  Z3_decide_eh: 'viiiii',
  Z3_on_binding_eh: 'iiiii',
  Z3_on_clause_eh: 'viiiii',
  Z3_error_handler: 'vii',
} as const;

export interface UserPropagatorCallbacks<S = unknown> {
  onPush?(state: S, cb: Z3_solver_callback): void;
  onPop?(state: S, cb: Z3_solver_callback, numScopes: number): void;
  onFresh?(state: S, newCtx: Z3_context): S;
  onFixed?(state: S, cb: Z3_solver_callback, term: Z3_ast, value: Z3_ast): void;
  onEq?(state: S, cb: Z3_solver_callback, lhs: Z3_ast, rhs: Z3_ast): void;
  onDiseq?(state: S, cb: Z3_solver_callback, lhs: Z3_ast, rhs: Z3_ast): void;
  onFinal?(state: S, cb: Z3_solver_callback): boolean | void;
  onCreated?(state: S, cb: Z3_solver_callback, term: Z3_ast): void;
  onDecide?(
    state: S,
    cb: Z3_solver_callback,
    term: Z3_ast,
    idx: number,
    phase: boolean,
  ): void;
  onBinding?(
    state: S,
    cb: Z3_solver_callback,
    quantifier: Z3_ast,
    instance: Z3_ast,
  ): boolean;
}

export interface ClauseEvent {
  proofHint: Z3_ast;
  numDeps: number;
  depsPtr: number;
  literals: Z3_ast_vector;
}

export interface ClauseStreamCallbacks {
  onClause(event: ClauseEvent): void;
}

export interface RcfInterval {
  lowerIsInf: boolean;
  lowerIsOpen: boolean;
  lower: Z3_rcf_num;
  upperIsInf: boolean;
  upperIsOpen: boolean;
  upper: Z3_rcf_num;
}

export interface UnsafeZ3Api {
  Z3_solver_register_on_clause(ctx: Z3_context, solver: Z3_solver, userCtx: number, onClauseCb: WasmFnPtr): void;
  Z3_solver_propagate_init(ctx: Z3_context, solver: Z3_solver, userCtx: number, pushCb: WasmFnPtr, popCb: WasmFnPtr, freshCb: WasmFnPtr): void;
  Z3_solver_propagate_fixed(ctx: Z3_context, solver: Z3_solver, fixedCb: WasmFnPtr): void;
  Z3_solver_propagate_final(ctx: Z3_context, solver: Z3_solver, finalCb: WasmFnPtr): void;
  Z3_solver_propagate_eq(ctx: Z3_context, solver: Z3_solver, eqCb: WasmFnPtr): void;
  Z3_solver_propagate_diseq(ctx: Z3_context, solver: Z3_solver, diseqCb: WasmFnPtr): void;
  Z3_solver_propagate_created(ctx: Z3_context, solver: Z3_solver, createdCb: WasmFnPtr): void;
  Z3_solver_propagate_decide(ctx: Z3_context, solver: Z3_solver, decideCb: WasmFnPtr): void;
  Z3_solver_propagate_on_binding(ctx: Z3_context, solver: Z3_solver, onBindingCb: WasmFnPtr): void;
  Z3_get_lstring(ctx: Z3_context, ast: Z3_ast, lengthPtr: number): number;
  Z3_fpa_get_numeral_sign(ctx: Z3_context, ast: Z3_ast, sgnPtr: number): boolean;
  Z3_rcf_interval(ctx: Z3_context, a: Z3_rcf_num, lowerIsInfPtr: number, lowerIsOpenPtr: number, lowerPtr: number, upperIsInfPtr: number, upperIsOpenPtr: number, upperPtr: number): number;
  Z3_solver_check(ctx: Z3_context, solver: Z3_solver): Z3_lbool;
  Z3_interrupt(ctx: Z3_context): void;

  // Callback-based error handler (requires custom build with this export)
  Z3_set_error_handler(ctx: Z3_context, errorHandlerCb: WasmFnPtr): void;

  // Optimize model streaming
  Z3_optimize_register_model_eh(ctx: Z3_context, opt: Z3_optimize, userCtx: number, modelCb: WasmFnPtr): void;

  // Fixedpoint custom-domain callbacks
  Z3_fixedpoint_init(ctx: Z3_context, fp: Z3_fixedpoint, userCtx: number): void;
  Z3_fixedpoint_set_reduce_assign_callback(ctx: Z3_context, fp: Z3_fixedpoint, cb: WasmFnPtr): void;
  Z3_fixedpoint_set_reduce_app_callback(ctx: Z3_context, fp: Z3_fixedpoint, cb: WasmFnPtr): void;
  Z3_fixedpoint_add_callback(ctx: Z3_context, fp: Z3_fixedpoint, userCtx: number, pushCb: WasmFnPtr, popCb: WasmFnPtr): void;
  Z3_fixedpoint_add_constraint(ctx: Z3_context, fp: Z3_fixedpoint, constraint: Z3_ast, level: number): void;
}

export type Disposer = () => void;
