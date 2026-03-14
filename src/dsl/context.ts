import type { Z3_context, Z3_solver, Z3_ast, Z3_sort, EmscriptenModule } from '../types.js';
import { BoolExpr, IntExpr, RealExpr, ArithExpr, Expr, type Z3Low } from './types.js';

export interface PropagatorCallback {
  conflict(fixed: Expr[]): void;
  propagate(consequent: BoolExpr, fixed: Expr[], eqs?: [Expr, Expr][]): void;
}

export interface PropagatorConfig {
  variables: Expr[];
  onFixed?(cb: PropagatorCallback, term: Z3_ast, value: Z3_ast): void;
  onEq?(cb: PropagatorCallback, lhs: Z3_ast, rhs: Z3_ast): void;
  onDiseq?(cb: PropagatorCallback, lhs: Z3_ast, rhs: Z3_ast): void;
  onFinal?(cb: PropagatorCallback): boolean | void;
  onDecide?(cb: PropagatorCallback, term: Z3_ast, idx: number, phase: boolean): void;
  onCreated?(cb: PropagatorCallback, term: Z3_ast): void;
}

export class SolveContext {
  readonly ctx: Z3_context;
  readonly solver: Z3_solver;
  readonly Z3: Z3Low;

  private readonly vars = new Map<string, { expr: Expr; ast: Z3_ast; sort: 'bool' | 'int' | 'real' | 'enum' }>();
  private readonly tracked = new Map<string, Z3_ast>();
  private readonly enumSorts = new Map<string, { values: string[] }>();
  private propagatorConfig: PropagatorConfig | null = null;
  private _objectives: Array<{ kind: 'min' | 'max'; expr: ArithExpr }> = [];

  constructor(Z3: Z3Low, private readonly em: EmscriptenModule) {
    this.Z3 = Z3;
    const cfg = Z3.mk_config();
    this.ctx = Z3.mk_context(cfg);
    Z3.del_config(cfg);
    this.solver = Z3.mk_simple_solver(this.ctx);

    this.Bool = this.Bool.bind(this);
    this.Int = this.Int.bind(this);
    this.Real = this.Real.bind(this);
    this.IntVal = this.IntVal.bind(this);
    this.RealVal = this.RealVal.bind(this);
    this.BoolVal = this.BoolVal.bind(this);
    this.assert = this.assert.bind(this);
    this.track = this.track.bind(this);
    this.distinct = this.distinct.bind(this);
    this.ite = this.ite.bind(this);
    this.Enum = this.Enum.bind(this);
    this.EnumVal = this.EnumVal.bind(this);
    this.push = this.push.bind(this);
    this.pop = this.pop.bind(this);
    this.check = this.check.bind(this);
    this.setTimeout = this.setTimeout.bind(this);
    this.minimize = this.minimize.bind(this);
    this.maximize = this.maximize.bind(this);
    this.propagate = this.propagate.bind(this);
    this.debug = this.debug.bind(this);
  }

  // ── Variables ─────────────────────────────────────────────

  Bool(name: string): BoolExpr {
    const sort = this.Z3.mk_bool_sort(this.ctx);
    const ast = this.Z3.mk_const(this.ctx, this.Z3.mk_string_symbol(this.ctx, name), sort);
    const expr = new BoolExpr(this.ctx, this.Z3, ast, name);
    this.vars.set(name, { expr, ast, sort: 'bool' });
    return expr;
  }

  Int(name: string): IntExpr {
    const sort = this.Z3.mk_int_sort(this.ctx);
    const ast = this.Z3.mk_const(this.ctx, this.Z3.mk_string_symbol(this.ctx, name), sort);
    const expr = new IntExpr(this.ctx, this.Z3, ast, name);
    this.vars.set(name, { expr, ast, sort: 'int' });
    return expr;
  }

  Real(name: string): RealExpr {
    const sort = this.Z3.mk_real_sort(this.ctx);
    const ast = this.Z3.mk_const(this.ctx, this.Z3.mk_string_symbol(this.ctx, name), sort);
    const expr = new RealExpr(this.ctx, this.Z3, ast, name);
    this.vars.set(name, { expr, ast, sort: 'real' });
    return expr;
  }

  Enum(sortName: string, values: readonly string[]): { val: (v: string) => IntExpr; var: (name: string) => IntExpr; values: readonly string[] } {
    const self = this;
    const valueToInt = new Map<string, number>();
    for (let i = 0; i < values.length; i++) valueToInt.set(values[i], i);
    this.enumSorts.set(sortName, { values: [...values] });

    return {
      values,
      val: (v: string) => {
        const idx = valueToInt.get(v);
        if (idx === undefined) throw new Error(`Unknown enum value '${v}' for sort '${sortName}'`);
        return self.IntVal(idx);
      },
      var: (name: string) => {
        const expr = self.Int(name);
        self.vars.set(name, { ...self.vars.get(name)!, sort: 'enum' });
        self.assert(expr.ge(self.IntVal(0)), expr.lt(self.IntVal(values.length)));
        return expr;
      },
    };
  }

  // ── Literals ──────────────────────────────────────────────

  IntVal(n: number): IntExpr {
    return new IntExpr(this.ctx, this.Z3, this.Z3.mk_int(this.ctx, n, this.Z3.mk_int_sort(this.ctx)));
  }

  RealVal(num: number, den: number = 1): RealExpr {
    return new RealExpr(this.ctx, this.Z3, this.Z3.mk_real(this.ctx, num, den));
  }

  BoolVal(v: boolean): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, v ? this.Z3.mk_true(this.ctx) : this.Z3.mk_false(this.ctx));
  }

  EnumVal(sortName: string, value: string): IntExpr {
    const info = this.enumSorts.get(sortName);
    if (!info) throw new Error(`Unknown enum sort '${sortName}'`);
    const idx = info.values.indexOf(value);
    if (idx === -1) throw new Error(`Unknown enum value '${value}' for sort '${sortName}'`);
    return new IntExpr(this.ctx, this.Z3, this.Z3.mk_int(this.ctx, idx, this.Z3.mk_int_sort(this.ctx)));
  }

  // ── Assertions ────────────────────────────────────────────

  assert(...exprs: BoolExpr[]): void {
    for (const e of exprs) {
      this.Z3.solver_assert(this.ctx, this.solver, e.ast);
    }
  }

  track(name: string, expr: BoolExpr): void {
    const trackAst = this.Z3.mk_const(
      this.ctx, this.Z3.mk_string_symbol(this.ctx, name), this.Z3.mk_bool_sort(this.ctx),
    );
    this.tracked.set(name, expr.ast);
    this.Z3.solver_assert_and_track(this.ctx, this.solver, expr.ast, trackAst);
  }

  // ── Combinators ───────────────────────────────────────────

  distinct(...exprs: Expr[]): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3,
      this.Z3.mk_distinct(this.ctx, exprs.map(e => e.ast)));
  }

  ite<T extends Expr>(cond: BoolExpr, then_: T, else_: T): T {
    return new (then_.constructor as any)(this.ctx, this.Z3,
      this.Z3.mk_ite(this.ctx, cond.ast, then_.ast, else_.ast));
  }

  // ── Incremental ───────────────────────────────────────────

  push(): void { this.Z3.solver_push(this.ctx, this.solver); }
  pop(n: number = 1): void { this.Z3.solver_pop(this.ctx, this.solver, n); }

  check(): 'sat' | 'unsat' | 'unknown' {
    const r = this.em.ccall('Z3_solver_check', 'number', ['number', 'number'], [this.ctx, this.solver]) as number;
    return r === 1 ? 'sat' : r === -1 ? 'unsat' : 'unknown';
  }

  // ── Config ────────────────────────────────────────────────

  setTimeout(ms: number): void {
    const params = this.Z3.mk_params(this.ctx);
    this.Z3.params_set_uint(this.ctx, params, this.Z3.mk_string_symbol(this.ctx, 'timeout'), ms);
    this.Z3.solver_set_params(this.ctx, this.solver, params);
    this.Z3.params_dec_ref(this.ctx, params);
  }

  // ── Optimization ──────────────────────────────────────────

  minimize(expr: ArithExpr): void { this._objectives.push({ kind: 'min', expr }); }
  maximize(expr: ArithExpr): void { this._objectives.push({ kind: 'max', expr }); }

  // ── Propagator ────────────────────────────────────────────

  propagate(config: PropagatorConfig): void { this.propagatorConfig = config; }

  // ── Debug ─────────────────────────────────────────────────

  debug(expr: Expr): string { return this.Z3.ast_to_string(this.ctx, expr.ast); }

  // ── Internals ─────────────────────────────────────────────

  /** @internal */ getPropagatorConfig() { return this.propagatorConfig; }
  /** @internal */ getVars() { return this.vars; }
  /** @internal */ hasTracked() { return this.tracked.size > 0; }
  /** @internal */ getObjectives() { return this._objectives; }
  /** @internal */ getEnumSorts() { return this.enumSorts; }
  /** @internal */ destroy() { this.Z3.del_context(this.ctx); }
}
