import type { Z3_ast, Z3_context } from '../types.js';

export type Z3Low = Record<string, any>;

export class Expr {
  constructor(
    readonly ctx: Z3_context,
    readonly Z3: Z3Low,
    readonly ast: Z3_ast,
    readonly name?: string,
  ) {}

  eq(other: Expr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_eq(this.ctx, this.ast, other.ast));
  }

  neq(other: Expr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3,
      this.Z3.mk_not(this.ctx, this.Z3.mk_eq(this.ctx, this.ast, other.ast)));
  }

  toString(): string {
    return this.Z3.ast_to_string(this.ctx, this.ast);
  }
}

export class BoolExpr extends Expr {
  and(...others: BoolExpr[]): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3,
      this.Z3.mk_and(this.ctx, [this.ast, ...others.map(o => o.ast)]));
  }

  or(...others: BoolExpr[]): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3,
      this.Z3.mk_or(this.ctx, [this.ast, ...others.map(o => o.ast)]));
  }

  not(): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_not(this.ctx, this.ast));
  }

  implies(other: BoolExpr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_implies(this.ctx, this.ast, other.ast));
  }

  iff(other: BoolExpr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_iff(this.ctx, this.ast, other.ast));
  }

  xor(other: BoolExpr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_xor(this.ctx, this.ast, other.ast));
  }

  ite<T extends Expr>(then_: T, else_: T): T {
    return new (then_.constructor as any)(this.ctx, this.Z3,
      this.Z3.mk_ite(this.ctx, this.ast, then_.ast, else_.ast));
  }
}

export class ArithExpr extends Expr {
  add(...others: ArithExpr[]): ArithExpr {
    return new ArithExpr(this.ctx, this.Z3,
      this.Z3.mk_add(this.ctx, [this.ast, ...others.map(o => o.ast)]));
  }

  sub(...others: ArithExpr[]): ArithExpr {
    return new ArithExpr(this.ctx, this.Z3,
      this.Z3.mk_sub(this.ctx, [this.ast, ...others.map(o => o.ast)]));
  }

  mul(...others: ArithExpr[]): ArithExpr {
    return new ArithExpr(this.ctx, this.Z3,
      this.Z3.mk_mul(this.ctx, [this.ast, ...others.map(o => o.ast)]));
  }

  div(other: ArithExpr): ArithExpr {
    return new ArithExpr(this.ctx, this.Z3, this.Z3.mk_div(this.ctx, this.ast, other.ast));
  }

  mod(other: ArithExpr): IntExpr {
    return new IntExpr(this.ctx, this.Z3, this.Z3.mk_mod(this.ctx, this.ast, other.ast));
  }

  rem(other: ArithExpr): IntExpr {
    return new IntExpr(this.ctx, this.Z3, this.Z3.mk_rem(this.ctx, this.ast, other.ast));
  }

  power(exp: ArithExpr): ArithExpr {
    return new ArithExpr(this.ctx, this.Z3, this.Z3.mk_power(this.ctx, this.ast, exp.ast));
  }

  neg(): ArithExpr {
    return new ArithExpr(this.ctx, this.Z3, this.Z3.mk_unary_minus(this.ctx, this.ast));
  }

  le(other: ArithExpr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_le(this.ctx, this.ast, other.ast));
  }

  lt(other: ArithExpr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_lt(this.ctx, this.ast, other.ast));
  }

  ge(other: ArithExpr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_ge(this.ctx, this.ast, other.ast));
  }

  gt(other: ArithExpr): BoolExpr {
    return new BoolExpr(this.ctx, this.Z3, this.Z3.mk_gt(this.ctx, this.ast, other.ast));
  }
}

export class IntExpr extends ArithExpr {}
export class RealExpr extends ArithExpr {}
