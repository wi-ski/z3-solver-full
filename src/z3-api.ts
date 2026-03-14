import type { EmscriptenModule, Z3_context, Z3_solver, Z3_solver_callback, Z3_ast, Z3_sort, Z3_func_decl, Z3_symbol, Z3_model, Z3_optimize, Z3_lbool } from './types.js';

type Z3_ast_vector = number;
type Z3_params = number;
type Z3_stats = number;

/**
 * Z3 C API surface via ccall — every function the Possibility Engine needs.
 *
 * Array-taking functions (mk_and, mk_or, mk_add, …) marshal JS
 * number arrays to the WASM heap automatically.
 */
export interface Z3Api {
  // Config / context / refcount
  mk_config(): number;
  del_config(cfg: number): void;
  mk_context(cfg: number): Z3_context;
  mk_context_rc(cfg: number): Z3_context;
  del_context(ctx: Z3_context): void;
  inc_ref(ctx: Z3_context, ast: Z3_ast): void;
  dec_ref(ctx: Z3_context, ast: Z3_ast): void;

  // Sorts
  mk_bool_sort(ctx: Z3_context): Z3_sort;
  mk_int_sort(ctx: Z3_context): Z3_sort;
  mk_real_sort(ctx: Z3_context): Z3_sort;
  mk_bv_sort(ctx: Z3_context, sz: number): Z3_sort;
  mk_enumeration_sort(ctx: Z3_context, name: Z3_symbol, n: number, enumNames: number, enumConsts: number, enumTesters: number): Z3_sort;
  mk_finite_domain_sort(ctx: Z3_context, name: Z3_symbol, size: number): Z3_sort;

  // Symbols
  mk_string_symbol(ctx: Z3_context, s: string): Z3_symbol;
  mk_int_symbol(ctx: Z3_context, i: number): Z3_symbol;

  // Constants / values
  mk_const(ctx: Z3_context, sym: Z3_symbol, sort: Z3_sort): Z3_ast;
  mk_true(ctx: Z3_context): Z3_ast;
  mk_false(ctx: Z3_context): Z3_ast;
  mk_int(ctx: Z3_context, n: number, sort: Z3_sort): Z3_ast;
  mk_int64(ctx: Z3_context, n: number, sort: Z3_sort): Z3_ast;
  mk_real(ctx: Z3_context, num: number, den: number): Z3_ast;
  mk_numeral(ctx: Z3_context, numStr: string, sort: Z3_sort): Z3_ast;
  mk_string(ctx: Z3_context, s: string): Z3_ast;

  // Boolean operations
  mk_not(ctx: Z3_context, a: Z3_ast): Z3_ast;
  mk_and(ctx: Z3_context, args: Z3_ast[]): Z3_ast;
  mk_or(ctx: Z3_context, args: Z3_ast[]): Z3_ast;
  mk_implies(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_iff(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_xor(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_eq(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_distinct(ctx: Z3_context, args: Z3_ast[]): Z3_ast;
  mk_ite(ctx: Z3_context, cond: Z3_ast, then_: Z3_ast, else_: Z3_ast): Z3_ast;

  // Arithmetic operations
  mk_add(ctx: Z3_context, args: Z3_ast[]): Z3_ast;
  mk_sub(ctx: Z3_context, args: Z3_ast[]): Z3_ast;
  mk_mul(ctx: Z3_context, args: Z3_ast[]): Z3_ast;
  mk_div(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_mod(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_rem(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_power(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_unary_minus(ctx: Z3_context, a: Z3_ast): Z3_ast;
  mk_le(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_lt(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_ge(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_gt(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;

  // Bitvector operations
  mk_bvadd(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_bvsub(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_bvand(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;
  mk_bvor(ctx: Z3_context, a: Z3_ast, b: Z3_ast): Z3_ast;

  // Solver
  mk_solver(ctx: Z3_context): Z3_solver;
  mk_simple_solver(ctx: Z3_context): Z3_solver;
  solver_inc_ref(ctx: Z3_context, solver: Z3_solver): void;
  solver_dec_ref(ctx: Z3_context, solver: Z3_solver): void;
  solver_assert(ctx: Z3_context, solver: Z3_solver, ast: Z3_ast): void;
  solver_assert_and_track(ctx: Z3_context, solver: Z3_solver, ast: Z3_ast, track: Z3_ast): void;
  solver_push(ctx: Z3_context, solver: Z3_solver): void;
  solver_pop(ctx: Z3_context, solver: Z3_solver, n: number): void;
  solver_reset(ctx: Z3_context, solver: Z3_solver): void;
  solver_get_num_scopes(ctx: Z3_context, solver: Z3_solver): number;
  solver_set_initial_value(ctx: Z3_context, solver: Z3_solver, variable: Z3_ast, value: Z3_ast): void;
  solver_set_params(ctx: Z3_context, solver: Z3_solver, params: Z3_params): void;
  solver_get_model(ctx: Z3_context, solver: Z3_solver): Z3_model;
  solver_get_unsat_core(ctx: Z3_context, solver: Z3_solver): Z3_ast_vector;
  solver_get_assertions(ctx: Z3_context, solver: Z3_solver): Z3_ast_vector;
  solver_get_statistics(ctx: Z3_context, solver: Z3_solver): Z3_stats;
  solver_to_string(ctx: Z3_context, solver: Z3_solver): string;
  solver_propagate_register(ctx: Z3_context, solver: Z3_solver, e: Z3_ast): void;
  solver_propagate_consequence(ctx: Z3_context, cb: Z3_solver_callback, fixed: Z3_ast[], eqLhs: Z3_ast[], eqRhs: Z3_ast[], consequent: Z3_ast): void;

  // AST vectors
  ast_vector_size(ctx: Z3_context, vec: Z3_ast_vector): number;
  ast_vector_get(ctx: Z3_context, vec: Z3_ast_vector, i: number): Z3_ast;

  // AST introspection
  ast_to_string(ctx: Z3_context, ast: Z3_ast): string;
  get_sort(ctx: Z3_context, ast: Z3_ast): Z3_sort;
  get_sort_kind(ctx: Z3_context, sort: Z3_sort): number;
  sort_to_string(ctx: Z3_context, sort: Z3_sort): string;
  get_ast_kind(ctx: Z3_context, ast: Z3_ast): number;
  is_eq_ast(ctx: Z3_context, a: Z3_ast, b: Z3_ast): boolean;

  // Params
  mk_params(ctx: Z3_context): Z3_params;
  params_set_uint(ctx: Z3_context, p: Z3_params, k: Z3_symbol, v: number): void;
  params_set_bool(ctx: Z3_context, p: Z3_params, k: Z3_symbol, v: boolean): void;
  params_set_symbol(ctx: Z3_context, p: Z3_params, k: Z3_symbol, v: Z3_symbol): void;
  params_to_string(ctx: Z3_context, p: Z3_params): string;
  params_dec_ref(ctx: Z3_context, p: Z3_params): void;

  // Model
  model_eval(ctx: Z3_context, model: Z3_model, t: Z3_ast, completion: boolean): Z3_ast | null;
  model_to_string(ctx: Z3_context, model: Z3_model): string;
  model_inc_ref(ctx: Z3_context, model: Z3_model): void;
  model_dec_ref(ctx: Z3_context, model: Z3_model): void;
  get_bool_value(ctx: Z3_context, ast: Z3_ast): number;
  get_numeral_string(ctx: Z3_context, ast: Z3_ast): string;

  // Optimize
  mk_optimize(ctx: Z3_context): Z3_optimize;
  optimize_assert(ctx: Z3_context, opt: Z3_optimize, ast: Z3_ast): void;
  optimize_maximize(ctx: Z3_context, opt: Z3_optimize, ast: Z3_ast): number;
  optimize_minimize(ctx: Z3_context, opt: Z3_optimize, ast: Z3_ast): number;
  optimize_check(ctx: Z3_context, opt: Z3_optimize, numAssumptions: number, assumptions: number): Z3_lbool;
  optimize_get_model(ctx: Z3_context, opt: Z3_optimize): Z3_model;
  optimize_push(ctx: Z3_context, opt: Z3_optimize): void;
  optimize_pop(ctx: Z3_context, opt: Z3_optimize): void;

  // Quantifiers
  mk_forall_const(ctx: Z3_context, weight: number, numBound: number, bound: number, numPatterns: number, patterns: number, body: Z3_ast): Z3_ast;
  mk_exists_const(ctx: Z3_context, weight: number, numBound: number, bound: number, numPatterns: number, patterns: number, body: Z3_ast): Z3_ast;

  // Error checking
  get_error_code(ctx: Z3_context): number;
  get_error_msg(ctx: Z3_context, code: number): string;
}

function withArray<T>(mod: EmscriptenModule, ptrs: number[], fn: (buf: number, len: number) => T): T {
  if (ptrs.length === 0) return fn(0, 0);
  const buf = mod._malloc(ptrs.length * 4);
  for (let i = 0; i < ptrs.length; i++) {
    mod.HEAP32[(buf >> 2) + i] = ptrs[i];
  }
  try {
    return fn(buf, ptrs.length);
  } finally {
    mod._free(buf);
  }
}

export function createZ3Api(mod: EmscriptenModule): Z3Api {
  const N = 'number';
  const S = 'string';
  const B = 'boolean';

  function cc(name: string, ret: string | null, args: string[], vals: unknown[]): any {
    return mod.ccall('Z3_' + name, ret, args, vals);
  }

  return {
    mk_config: () => cc('mk_config', N, [], []),
    del_config: (cfg) => cc('del_config', null, [N], [cfg]),
    mk_context: (cfg) => cc('mk_context', N, [N], [cfg]) as Z3_context,
    mk_context_rc: (cfg) => cc('mk_context_rc', N, [N], [cfg]) as Z3_context,
    del_context: (ctx) => cc('del_context', null, [N], [ctx]),
    inc_ref: (ctx, ast) => cc('inc_ref', null, [N, N], [ctx, ast]),
    dec_ref: (ctx, ast) => cc('dec_ref', null, [N, N], [ctx, ast]),

    mk_bool_sort: (ctx) => cc('mk_bool_sort', N, [N], [ctx]) as Z3_sort,
    mk_int_sort: (ctx) => cc('mk_int_sort', N, [N], [ctx]) as Z3_sort,
    mk_real_sort: (ctx) => cc('mk_real_sort', N, [N], [ctx]) as Z3_sort,
    mk_bv_sort: (ctx, sz) => cc('mk_bv_sort', N, [N, N], [ctx, sz]) as Z3_sort,
    mk_enumeration_sort: (ctx, name, n, enumNames, enumConsts, enumTesters) =>
      cc('mk_enumeration_sort', N, [N, N, N, N, N, N], [ctx, name, n, enumNames, enumConsts, enumTesters]) as Z3_sort,
    mk_finite_domain_sort: (ctx, name, size) =>
      cc('mk_finite_domain_sort', N, [N, N, N], [ctx, name, size]) as Z3_sort,

    mk_string_symbol: (ctx, s) => cc('mk_string_symbol', N, [N, S], [ctx, s]) as Z3_symbol,
    mk_int_symbol: (ctx, i) => cc('mk_int_symbol', N, [N, N], [ctx, i]) as Z3_symbol,

    mk_const: (ctx, sym, sort) => cc('mk_const', N, [N, N, N], [ctx, sym, sort]) as Z3_ast,
    mk_true: (ctx) => cc('mk_true', N, [N], [ctx]) as Z3_ast,
    mk_false: (ctx) => cc('mk_false', N, [N], [ctx]) as Z3_ast,
    mk_int: (ctx, n, sort) => cc('mk_int', N, [N, N, N], [ctx, n, sort]) as Z3_ast,
    mk_int64: (ctx, n, sort) => cc('mk_int64', N, [N, N, N], [ctx, n, sort]) as Z3_ast,
    mk_real: (ctx, num, den) => cc('mk_real', N, [N, N, N], [ctx, num, den]) as Z3_ast,
    mk_numeral: (ctx, numStr, sort) => cc('mk_numeral', N, [N, S, N], [ctx, numStr, sort]) as Z3_ast,
    mk_string: (ctx, s) => cc('mk_string', N, [N, S], [ctx, s]) as Z3_ast,

    mk_not: (ctx, a) => cc('mk_not', N, [N, N], [ctx, a]) as Z3_ast,
    mk_and: (ctx, args) => withArray(mod, args as number[], (buf, len) =>
      cc('mk_and', N, [N, N, N], [ctx, len, buf])) as Z3_ast,
    mk_or: (ctx, args) => withArray(mod, args as number[], (buf, len) =>
      cc('mk_or', N, [N, N, N], [ctx, len, buf])) as Z3_ast,
    mk_implies: (ctx, a, b) => cc('mk_implies', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_iff: (ctx, a, b) => cc('mk_iff', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_xor: (ctx, a, b) => cc('mk_xor', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_eq: (ctx, a, b) => cc('mk_eq', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_distinct: (ctx, args) => withArray(mod, args as number[], (buf, len) =>
      cc('mk_distinct', N, [N, N, N], [ctx, len, buf])) as Z3_ast,
    mk_ite: (ctx, cond, then_, else_) => cc('mk_ite', N, [N, N, N, N], [ctx, cond, then_, else_]) as Z3_ast,

    mk_add: (ctx, args) => withArray(mod, args as number[], (buf, len) =>
      cc('mk_add', N, [N, N, N], [ctx, len, buf])) as Z3_ast,
    mk_sub: (ctx, args) => withArray(mod, args as number[], (buf, len) =>
      cc('mk_sub', N, [N, N, N], [ctx, len, buf])) as Z3_ast,
    mk_mul: (ctx, args) => withArray(mod, args as number[], (buf, len) =>
      cc('mk_mul', N, [N, N, N], [ctx, len, buf])) as Z3_ast,
    mk_div: (ctx, a, b) => cc('mk_div', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_mod: (ctx, a, b) => cc('mk_mod', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_rem: (ctx, a, b) => cc('mk_rem', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_power: (ctx, a, b) => cc('mk_power', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_unary_minus: (ctx, a) => cc('mk_unary_minus', N, [N, N], [ctx, a]) as Z3_ast,
    mk_le: (ctx, a, b) => cc('mk_le', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_lt: (ctx, a, b) => cc('mk_lt', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_ge: (ctx, a, b) => cc('mk_ge', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_gt: (ctx, a, b) => cc('mk_gt', N, [N, N, N], [ctx, a, b]) as Z3_ast,

    mk_bvadd: (ctx, a, b) => cc('mk_bvadd', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_bvsub: (ctx, a, b) => cc('mk_bvsub', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_bvand: (ctx, a, b) => cc('mk_bvand', N, [N, N, N], [ctx, a, b]) as Z3_ast,
    mk_bvor: (ctx, a, b) => cc('mk_bvor', N, [N, N, N], [ctx, a, b]) as Z3_ast,

    mk_solver: (ctx) => cc('mk_solver', N, [N], [ctx]) as Z3_solver,
    mk_simple_solver: (ctx) => cc('mk_simple_solver', N, [N], [ctx]) as Z3_solver,
    solver_inc_ref: (ctx, solver) => cc('solver_inc_ref', null, [N, N], [ctx, solver]),
    solver_dec_ref: (ctx, solver) => cc('solver_dec_ref', null, [N, N], [ctx, solver]),
    solver_assert: (ctx, solver, ast) => cc('solver_assert', null, [N, N, N], [ctx, solver, ast]),
    solver_assert_and_track: (ctx, solver, ast, track) =>
      cc('solver_assert_and_track', null, [N, N, N, N], [ctx, solver, ast, track]),
    solver_push: (ctx, solver) => cc('solver_push', null, [N, N], [ctx, solver]),
    solver_pop: (ctx, solver, n) => cc('solver_pop', null, [N, N, N], [ctx, solver, n]),
    solver_reset: (ctx, solver) => cc('solver_reset', null, [N, N], [ctx, solver]),
    solver_get_num_scopes: (ctx, solver) => cc('solver_get_num_scopes', N, [N, N], [ctx, solver]) as number,
    solver_set_initial_value: (ctx, solver, variable, value) =>
      cc('solver_set_initial_value', null, [N, N, N, N], [ctx, solver, variable, value]),
    solver_set_params: (ctx, solver, params) =>
      cc('solver_set_params', null, [N, N, N], [ctx, solver, params]),
    solver_get_model: (ctx, solver) => cc('solver_get_model', N, [N, N], [ctx, solver]) as Z3_model,
    solver_get_unsat_core: (ctx, solver) => cc('solver_get_unsat_core', N, [N, N], [ctx, solver]),
    solver_get_assertions: (ctx, solver) => cc('solver_get_assertions', N, [N, N], [ctx, solver]),
    solver_get_statistics: (ctx, solver) => cc('solver_get_statistics', N, [N, N], [ctx, solver]),
    solver_to_string: (ctx, solver) => cc('solver_to_string', S, [N, N], [ctx, solver]),
    solver_propagate_register: (ctx, solver, e) =>
      cc('solver_propagate_register', null, [N, N, N], [ctx, solver, e]),

    solver_propagate_consequence(ctx, cb, fixed, eqLhs, eqRhs, consequent) {
      withArray(mod, fixed as number[], (fixedBuf, fixedLen) => {
        withArray(mod, eqLhs as number[], (lhsBuf) => {
          withArray(mod, eqRhs as number[], (rhsBuf) => {
            cc('solver_propagate_consequence', null,
              [N, N, N, N, N, N, N, N],
              [ctx, cb, fixedLen, fixedBuf, eqLhs.length, lhsBuf, rhsBuf, consequent]);
          });
        });
      });
    },

    ast_vector_size: (ctx, vec) => cc('ast_vector_size', N, [N, N], [ctx, vec]) as number,
    ast_vector_get: (ctx, vec, i) => cc('ast_vector_get', N, [N, N, N], [ctx, vec, i]) as Z3_ast,

    ast_to_string: (ctx, ast) => cc('ast_to_string', S, [N, N], [ctx, ast]),
    get_sort: (ctx, ast) => cc('get_sort', N, [N, N], [ctx, ast]) as Z3_sort,
    get_sort_kind: (ctx, sort) => cc('get_sort_kind', N, [N, N], [ctx, sort]) as number,
    sort_to_string: (ctx, sort) => cc('sort_to_string', S, [N, N], [ctx, sort]),
    get_ast_kind: (ctx, ast) => cc('get_ast_kind', N, [N, N], [ctx, ast]) as number,
    is_eq_ast: (ctx, a, b) => !!cc('is_eq_ast', N, [N, N, N], [ctx, a, b]),

    mk_params: (ctx) => cc('mk_params', N, [N], [ctx]),
    params_set_uint: (ctx, p, k, v) => cc('params_set_uint', null, [N, N, N, N], [ctx, p, k, v]),
    params_set_bool: (ctx, p, k, v) => cc('params_set_bool', null, [N, N, N, N], [ctx, p, k, v ? 1 : 0]),
    params_set_symbol: (ctx, p, k, v) => cc('params_set_symbol', null, [N, N, N, N], [ctx, p, k, v]),
    params_to_string: (ctx, p) => cc('params_to_string', S, [N, N], [ctx, p]),
    params_dec_ref: (ctx, p) => cc('params_dec_ref', null, [N, N], [ctx, p]),

    model_eval(ctx, model, t, completion) {
      const outPtr = mod._malloc(4);
      try {
        const ok = cc('model_eval', B, [N, N, N, B, N], [ctx, model, t, completion, outPtr]);
        if (!ok) return null;
        return mod.HEAP32[outPtr >> 2] as Z3_ast;
      } finally {
        mod._free(outPtr);
      }
    },
    model_to_string: (ctx, model) => cc('model_to_string', S, [N, N], [ctx, model]),
    model_inc_ref: (ctx, model) => cc('model_inc_ref', null, [N, N], [ctx, model]),
    model_dec_ref: (ctx, model) => cc('model_dec_ref', null, [N, N], [ctx, model]),

    get_bool_value: (ctx, ast) => cc('get_bool_value', N, [N, N], [ctx, ast]),
    get_numeral_string: (ctx, ast) => cc('get_numeral_string', S, [N, N], [ctx, ast]),

    mk_optimize: (ctx) => cc('mk_optimize', N, [N], [ctx]) as Z3_optimize,
    optimize_assert: (ctx, opt, ast) => cc('optimize_assert', null, [N, N, N], [ctx, opt, ast]),
    optimize_maximize: (ctx, opt, ast) => cc('optimize_maximize', N, [N, N, N], [ctx, opt, ast]),
    optimize_minimize: (ctx, opt, ast) => cc('optimize_minimize', N, [N, N, N], [ctx, opt, ast]),
    optimize_check: (ctx, opt, numAssumptions, assumptions) =>
      cc('optimize_check', N, [N, N, N, N], [ctx, opt, numAssumptions, assumptions]) as Z3_lbool,
    optimize_get_model: (ctx, opt) => cc('optimize_get_model', N, [N, N], [ctx, opt]) as Z3_model,
    optimize_push: (ctx, opt) => cc('optimize_push', null, [N, N], [ctx, opt]),
    optimize_pop: (ctx, opt) => cc('optimize_pop', null, [N, N], [ctx, opt]),

    mk_forall_const: (ctx, weight, numBound, bound, numPatterns, patterns, body) =>
      cc('mk_forall_const', N, [N, N, N, N, N, N, N], [ctx, weight, numBound, bound, numPatterns, patterns, body]) as Z3_ast,
    mk_exists_const: (ctx, weight, numBound, bound, numPatterns, patterns, body) =>
      cc('mk_exists_const', N, [N, N, N, N, N, N, N], [ctx, weight, numBound, bound, numPatterns, patterns, body]) as Z3_ast,

    get_error_code: (ctx) => cc('get_error_code', N, [N], [ctx]),
    get_error_msg: (ctx, code) => cc('get_error_msg', S, [N, N], [ctx, code]),
  };
}
