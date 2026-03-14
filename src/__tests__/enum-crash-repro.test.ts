import { describe, it, expect } from 'vitest';
import { initZ3Full } from '../init.js';
import type { Z3Full } from '../init.js';

let z3: Z3Full;
async function setup(): Promise<Z3Full> {
  if (!z3) z3 = await initZ3Full();
  return z3;
}

describe('Enum crash repro', () => {
  it('Enum.var + Int + assert in single solve', async () => {
    const z = await setup();
    const result = z.solve(({ Int, IntVal, assert, Enum }) => {
      const ps = Enum('Player', ['actor', 'role', 'place', 'transaction']);
      ps.var('p_et_a');
      const pat = Int('pat_rel_ab');
      assert(pat.eq(IntVal(7)));
    });
    expect(result.sat).toBe(true);
  });

  it('two sequential solves with Enum', async () => {
    const z = await setup();
    
    const r1 = z.solve(({ Int, IntVal, assert, Enum }) => {
      const ps = Enum('P1', ['actor', 'role', 'place', 'transaction']);
      ps.var('p1');
      const pat = Int('pat1');
      assert(pat.eq(IntVal(3)));
    });
    expect(r1.sat).toBe(true);

    const r2 = z.solve(({ Int, IntVal, assert, Enum }) => {
      const ps = Enum('P2', ['actor', 'role', 'place', 'transaction']);
      ps.var('p2');
      const pat = Int('pat2');
      assert(pat.eq(IntVal(5)));
    });
    expect(r2.sat).toBe(true);
  });

  it('Enum at engine scale: 30 vars + 360 tracked implications', async () => {
    const z = await setup();
    const players = ['actor','role','place','outer_place','item','specific_item',
      'assembly','part','container','content','group','member',
      'transaction','composite_transaction','line_item','follow_up_transaction'];

    const result = z.solve(({ Int, IntVal, assert, track, Enum }) => {
      const ps = Enum('PP', players);
      
      for (let i = 0; i < 30; i++) {
        ps.var('e' + i);
      }
      
      const patVars = [];
      for (let i = 0; i < 30; i++) {
        const p = Int('p' + i);
        assert(p.ge(IntVal(1)), p.le(IntVal(12)));
        patVars.push(p);
      }
      
      for (let r = 0; r < 30; r++) {
        for (let p = 1; p <= 12; p++) {
          const patEq = patVars[r]!.eq(IntVal(p));
          const entEq = Int('e' + r).eq(ps.val(players[p % players.length]!));
          track(`impl_${r}_${p}`, patEq.implies(entEq));
        }
      }
    });
    
    expect(result.sat).toBe(true);
  });
});
