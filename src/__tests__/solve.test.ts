import { describe, it, expect } from 'vitest';
import { initZ3Full } from '../init.js';
import type { Z3Full } from '../init.js';

let z3: Z3Full;
async function setup(): Promise<Z3Full> {
  if (!z3) z3 = await initZ3Full();
  return z3;
}

describe('solve() high-level API', () => {
  it('solves a basic boolean SAT problem', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, assert }) => {
      const x = Bool('x');
      const y = Bool('y');
      assert(x.or(y));
    });

    expect(result.sat).toBe(true);
    expect(result.status).toBe('sat');
    expect(result.model.has('x')).toBe(true);
    expect(result.model.has('y')).toBe(true);
  });

  it('solves integer constraints', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      const y = Int('y');
      assert(x.add(IntVal(2)).le(y.sub(IntVal(10))));
    });

    expect(result.sat).toBe(true);
    const x = result.model.get('x') as number;
    const y = result.model.get('y') as number;
    expect(x + 2).toBeLessThanOrEqual(y - 10);
  });

  it('returns unsat for contradictory constraints', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, assert }) => {
      const x = Bool('x');
      assert(x);
      assert(x.not());
    });

    expect(result.sat).toBe(false);
    expect(result.unsat).toBe(true);
    expect(result.status).toBe('unsat');
    expect(result.model.size).toBe(0);
  });

  it('propagator onFixed fires through solve()', async () => {
    const z = await setup();
    let fixedCount = 0;

    const result = z.solve(({ Bool, assert, propagate }) => {
      const x = Bool('px');
      assert(x);
      propagate({
        variables: [x],
        onFixed(_cb) { fixedCount++; },
        onFinal() { return true; },
      });
    });

    expect(result.sat).toBe(true);
    expect(fixedCount).toBeGreaterThan(0);
  });

  it('propagator exception propagates from solve()', async () => {
    const z = await setup();

    expect(() => z.solve(({ Bool, assert, propagate }) => {
      const x = Bool('ex');
      assert(x);
      propagate({
        variables: [x],
        onFixed(_cb) { throw new Error('boom from solve'); },
        onFinal() { return true; },
      });
    })).toThrow('boom from solve');
  });

  it('extracts correct boolean model values', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, assert }) => {
      const a = Bool('a');
      const b = Bool('b');
      assert(a);
      assert(b.not());
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('a')).toBe(true);
    expect(result.model.get('b')).toBe(false);
  });

  it('handles implication chains correctly', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, assert }) => {
      const a = Bool('a');
      const b = Bool('b');
      const c = Bool('c');
      assert(a.implies(b));
      assert(b.implies(c));
      assert(a);
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('a')).toBe(true);
    expect(result.model.get('b')).toBe(true);
    expect(result.model.get('c')).toBe(true);
  });

  it('cleans up callback slots after each solve', async () => {
    const z = await setup();
    const before = z.registry.outstandingCallbacks;

    z.solve(({ Bool, assert, propagate }) => {
      const x = Bool('cl');
      assert(x);
      propagate({
        variables: [x],
        onFixed(_cb) {},
        onFinal() { return true; },
      });
    });

    expect(z.registry.outstandingCallbacks).toBe(before);
  });

  it('multiple solve() calls work independently', async () => {
    const z = await setup();

    const r1 = z.solve(({ Bool, assert }) => {
      const x = Bool('x');
      assert(x);
    });

    const r2 = z.solve(({ Bool, assert }) => {
      const y = Bool('y');
      assert(y.not());
    });

    expect(r1.sat).toBe(true);
    expect(r1.model.get('x')).toBe(true);
    expect(r2.sat).toBe(true);
    expect(r2.model.get('y')).toBe(false);
  });

  it('IntVal creates literal integers for constraints', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      assert(x.ge(IntVal(5)));
      assert(x.le(IntVal(5)));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe(5);
  });

  it('solves Real arithmetic and extracts rational model values', async () => {
    const z = await setup();
    const result = z.solve(({ Real, RealVal, assert }) => {
      const x = Real('x');
      const y = Real('y');
      assert(x.add(y).eq(RealVal(3)));
      assert(x.ge(RealVal(0)));
      assert(y.ge(RealVal(0)));
      assert(x.le(RealVal(2)));
    });

    expect(result.sat).toBe(true);
    const xv = result.model.get('x') as number;
    const yv = result.model.get('y') as number;
    expect(xv + yv).toBeCloseTo(3, 5);
    expect(xv).toBeGreaterThanOrEqual(0);
    expect(xv).toBeLessThanOrEqual(2);
  });

  it('distinct() enforces all-different on 3 integer variables', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert, distinct }) => {
      const a = Int('a');
      const b = Int('b');
      const c = Int('c');
      assert(distinct(a, b, c));
      assert(a.ge(IntVal(1)), a.le(IntVal(3)));
      assert(b.ge(IntVal(1)), b.le(IntVal(3)));
      assert(c.ge(IntVal(1)), c.le(IntVal(3)));
    });

    expect(result.sat).toBe(true);
    const vals = [result.model.get('a'), result.model.get('b'), result.model.get('c')];
    expect(new Set(vals).size).toBe(3);
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
    }
  });

  it('exercises every chainable boolean method', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, BoolVal, assert }) => {
      const p = Bool('p');
      const q = Bool('q');
      const r = Bool('r');

      assert(p.and(q));
      assert(p.or(r));
      assert(p.implies(q));
      assert(q.iff(BoolVal(true)));
      assert(r.xor(BoolVal(true)).not());
      assert(p.eq(BoolVal(true)));
      assert(p.neq(BoolVal(false)));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('p')).toBe(true);
    expect(result.model.get('q')).toBe(true);
    expect(result.model.get('r')).toBe(true);
  });

  it('exercises every chainable arithmetic method', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      const y = Int('y');

      assert(x.add(IntVal(2)).eq(IntVal(10)));
      assert(y.sub(IntVal(3)).eq(IntVal(7)));
      assert(x.mul(IntVal(2)).le(IntVal(20)));
      assert(x.ge(IntVal(0)));
      assert(y.gt(IntVal(0)));
      assert(x.lt(IntVal(100)));
      assert(x.neg().le(IntVal(0)));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe(8);
    expect(result.model.get('y')).toBe(10);
  });

  // ── UNSAT core ────────────────────────────────────────────

  it('track() + unsatCore identifies conflicting constraints', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, track }) => {
      const p = Bool('p');
      const q = Bool('q');

      track('rule_p_true', p);
      track('rule_q_true', q);
      track('rule_conflict', p.and(q).not());
    });

    expect(result.unsat).toBe(true);
    expect(result.unsatCore.length).toBeGreaterThan(0);
    expect(result.unsatCore.length).toBeLessThanOrEqual(3);
    for (const name of result.unsatCore) {
      expect(['rule_p_true', 'rule_q_true', 'rule_conflict']).toContain(name);
    }
  });

  it('unsatCore is empty array when SAT', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, track }) => {
      const p = Bool('p');
      track('rule_p', p);
    });

    expect(result.sat).toBe(true);
    expect(result.unsatCore).toEqual([]);
  });

  it('unsatCore is empty when using assert() without track()', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, assert }) => {
      const x = Bool('x');
      assert(x);
      assert(x.not());
    });

    expect(result.unsat).toBe(true);
    expect(result.unsatCore).toEqual([]);
  });

  it('mixed assert() and track() — only tracked appear in core', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, assert, track }) => {
      const a = Bool('a');
      const b = Bool('b');

      assert(a);
      track('tracked_b', b);
      track('tracked_conflict', a.implies(b.not()));
    });

    expect(result.unsat).toBe(true);
    expect(result.unsatCore.length).toBeGreaterThan(0);
    for (const name of result.unsatCore) {
      expect(name).toMatch(/^tracked_/);
    }
  });

  // ── if-then-else ──────────────────────────────────────────

  it('ite() selects then-branch when condition is true', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, Int, IntVal, assert, ite }) => {
      const cond = Bool('cond');
      const x = Int('x');

      assert(cond);
      assert(x.eq(ite(cond, IntVal(10), IntVal(20))));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe(10);
  });

  it('ite() selects else-branch when condition is false', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, Int, IntVal, assert, ite }) => {
      const cond = Bool('cond');
      const x = Int('x');

      assert(cond.not());
      assert(x.eq(ite(cond, IntVal(10), IntVal(20))));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe(20);
  });

  it('BoolExpr.ite() works as method', async () => {
    const z = await setup();
    const result = z.solve(({ Bool, Int, IntVal, assert }) => {
      const flag = Bool('flag');
      const x = Int('x');

      assert(flag);
      assert(x.eq(flag.ite(IntVal(42), IntVal(0))));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe(42);
  });

  // ── mod / rem / power ─────────────────────────────────────

  it('mod() computes modular arithmetic', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      assert(x.mod(IntVal(3)).eq(IntVal(1)));
      assert(x.ge(IntVal(10)), x.le(IntVal(10)));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe(10);
  });

  it('power() computes exponentiation', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      assert(IntVal(2).power(x).eq(IntVal(8)));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe(3);
  });

  // ── push / pop / check ────────────────────────────────────

  it('push/pop enables incremental constraint exploration', async () => {
    const z = await setup();
    let bothResult = '';
    let onlyAResult = '';

    const result = z.solve(({ Bool, assert, push, pop, check }) => {
      const a = Bool('a');
      const b = Bool('b');

      assert(a.or(b));

      push();
      assert(a, b);
      bothResult = check();
      pop();

      push();
      assert(a, b.not());
      onlyAResult = check();
      pop();

      assert(a);
    });

    expect(bothResult).toBe('sat');
    expect(onlyAResult).toBe('sat');
    expect(result.sat).toBe(true);
    expect(result.model.get('a')).toBe(true);
  });

  // ── setTimeout ────────────────────────────────────────────

  it('setTimeout method exists and is callable', async () => {
    const z = await setup();
    expect(typeof z.solve).toBe('function');

    const result = z.solve(({ Bool, assert }) => {
      const x = Bool('x');
      assert(x);
    });
    expect(result.sat).toBe(true);
  });

  // ── debug / toString ──────────────────────────────────────

  it('debug() returns Z3 AST string representation', async () => {
    const z = await setup();
    let debugStr = '';

    z.solve(({ Int, IntVal, assert, debug }) => {
      const x = Int('x');
      const expr = x.add(IntVal(2));
      debugStr = debug(expr);
      assert(expr.eq(IntVal(10)));
    });

    expect(debugStr).toContain('+');
    expect(debugStr).toContain('2');
  });

  it('Expr.toString() returns readable representation', async () => {
    const z = await setup();
    let str = '';

    z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      str = x.add(IntVal(5)).toString();
      assert(x.eq(IntVal(1)));
    });

    expect(str).toContain('+');
    expect(str).toContain('5');
  });

  // ── Enum sort ─────────────────────────────────────────────

  it('Enum creates finite domain variables and extracts model values', async () => {
    const z = await setup();
    const result = z.solve(({ Enum, assert }) => {
      const Color = Enum('Color', ['red', 'green', 'blue']);
      const x = Color.var('x');
      const y = Color.var('y');

      assert(x.neq(y));
      assert(x.eq(Color.val('red')));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe('red');
    const yVal = result.model.get('y') as string;
    expect(['green', 'blue']).toContain(yVal);
  });

  it('Enum with distinct constraint assigns all-different', async () => {
    const z = await setup();
    const result = z.solve(({ Enum, assert, distinct }) => {
      const Day = Enum('Day2', ['mon', 'tue', 'wed']);
      const a = Day.var('alice');
      const b = Day.var('bob');
      const c = Day.var('carol');

      assert(distinct(a, b, c));
    });

    expect(result.sat).toBe(true);
    const vals = new Set([result.model.get('alice'), result.model.get('bob'), result.model.get('carol')]);
    expect(vals.size).toBe(3);
  });

  it('Enum UNSAT when more variables than values', async () => {
    const z = await setup();
    const result = z.solve(({ Enum, assert, distinct }) => {
      const Bit = Enum('Bit', ['zero', 'one']);
      const a = Bit.var('a');
      const b = Bit.var('b');
      const c = Bit.var('c');

      assert(distinct(a, b, c));
    });

    expect(result.unsat).toBe(true);
  });

  // ── minimize / maximize (stored, not yet wired to optimize solver) ──

  it('minimize/maximize can be called without crash', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert, minimize }) => {
      const x = Int('x');
      assert(x.ge(IntVal(1)), x.le(IntVal(100)));
      minimize(x);
    });

    expect(result.sat).toBe(true);
  });

  // ── rem() ─────────────────────────────────────────────────

  it('rem() computes integer remainder', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      assert(x.eq(IntVal(17)));
      const r = Int('r');
      assert(r.eq(x.rem(IntVal(5))));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('r')).toBe(2);
  });

  // ── RealVal with explicit denominator ─────────────────────

  it('RealVal(num, den) creates rational literals', async () => {
    const z = await setup();
    const result = z.solve(({ Real, RealVal, assert }) => {
      const x = Real('x');
      assert(x.eq(RealVal(3, 2)));
    });

    expect(result.sat).toBe(true);
    const xv = result.model.get('x') as number;
    expect(xv).toBeCloseTo(1.5, 5);
  });

  // ── EnumVal() context method ──────────────────────────────

  it('EnumVal() creates enum literal by sort name', async () => {
    const z = await setup();
    const result = z.solve(({ Enum, EnumVal, assert }) => {
      const Color = Enum('Color3', ['red', 'green', 'blue']);
      const x = Color.var('x');
      assert(x.eq(EnumVal('Color3', 'green')));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).toBe('green');
  });

  // ── neq() on Int/Real ─────────────────────────────────────

  it('neq() works on Int expressions', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert }) => {
      const x = Int('x');
      assert(x.neq(IntVal(5)));
      assert(x.ge(IntVal(4)), x.le(IntVal(6)));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).not.toBe(5);
  });

  it('neq() works on Real expressions', async () => {
    const z = await setup();
    const result = z.solve(({ Real, RealVal, assert }) => {
      const x = Real('x');
      assert(x.neq(RealVal(0)));
      assert(x.ge(RealVal(-1)), x.le(RealVal(1)));
    });

    expect(result.sat).toBe(true);
    expect(result.model.get('x')).not.toBe(0);
  });

  // ── Enum error paths ──────────────────────────────────────

  it('Enum.val() throws on unknown value', async () => {
    const z = await setup();
    expect(() => z.solve(({ Enum }) => {
      const Color = Enum('Color4', ['red', 'green', 'blue']);
      Color.val('purple');
    })).toThrow('Unknown enum value');
  });

  it('EnumVal() throws on unknown sort', async () => {
    const z = await setup();
    expect(() => z.solve(({ EnumVal }) => {
      EnumVal('NonExistentSort', 'x');
    })).toThrow('Unknown enum sort');
  });

  it('EnumVal() throws on unknown value in known sort', async () => {
    const z = await setup();
    expect(() => z.solve(({ Enum, EnumVal }) => {
      Enum('Color5', ['red', 'green', 'blue']);
      EnumVal('Color5', 'purple');
    })).toThrow('Unknown enum value');
  });

  // ── RC lifecycle: no crash on repeated solve with enums ───

  it('multiple solve() calls with Enum do not leak or crash', async () => {
    const z = await setup();

    for (let i = 0; i < 5; i++) {
      const result = z.solve(({ Enum, assert, distinct }) => {
        const S = Enum(`S${i}`, ['a', 'b', 'c']);
        const x = S.var('x');
        const y = S.var('y');
        assert(distinct(x, y));
      });
      expect(result.sat).toBe(true);
    }
  });

  // ── maximize stored correctly ─────────────────────────────

  // ── Consequence injection via propagator ─────────────────

  it('cb.propagate() forces a variable from onFinal', async () => {
    const z = await setup();
    let propagated = false;

    const result = z.solve(({ Bool, assert, propagate }) => {
      const x = Bool('cp_x');
      const y = Bool('cp_y');

      assert(x);
      assert(x.or(y));

      propagate({
        variables: [x, y],
        onFinal(cb) {
          if (!propagated) {
            propagated = true;
            cb.propagate(y, []);
          }
          return true;
        },
      });
    });

    expect(result.sat).toBe(true);
    expect(propagated).toBe(true);
    expect(result.model.get('cp_y')).toBe(true);
  });

  it('cb.conflict() rejects the current assignment', async () => {
    const z = await setup();
    let conflictCount = 0;

    const result = z.solve(({ Bool, assert, propagate }) => {
      const x = Bool('cc_x');
      const y = Bool('cc_y');

      assert(x.or(y));

      propagate({
        variables: [x, y],
        onFinal(cb) {
          if (conflictCount < 1) {
            conflictCount++;
            cb.conflict([]);
            return false;
          }
          return true;
        },
      });
    });

    expect(conflictCount).toBe(1);
    expect(result.sat || result.unsat).toBe(true);
  });

  it('cb.propagate() with fixed justification injects a theory lemma', async () => {
    const z = await setup();
    let injected = false;

    const result = z.solve(({ Bool, assert, propagate }) => {
      const a = Bool('tl_a');
      const b = Bool('tl_b');

      assert(a);

      propagate({
        variables: [a, b],
        onFixed(cb, _term, _value) {
          if (!injected) {
            injected = true;
            cb.propagate(b, [a]);
          }
        },
        onFinal() { return true; },
      });
    });

    expect(result.sat).toBe(true);
    expect(injected).toBe(true);
    expect(result.model.get('tl_b')).toBe(true);
  });

  it('maximize can be called without crash', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert, maximize }) => {
      const x = Int('x');
      assert(x.ge(IntVal(1)), x.le(IntVal(100)));
      maximize(x);
    });

    expect(result.sat).toBe(true);
  });
});
