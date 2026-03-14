import { parentPort } from 'worker_threads';
import { initZ3Full } from '../dist/index.js';

let z3: Awaited<ReturnType<typeof initZ3Full>>;

parentPort!.on('message', async (req: { id: number; userId: string; min: number; max: number; sum: number }) => {
  if (!z3) z3 = await initZ3Full();

  const t0 = performance.now();
  const result = z3.solve(({ Int, IntVal, assert }) => {
    const x = Int('x');
    const y = Int('y');
    assert(x.ge(IntVal(req.min)), x.le(IntVal(req.max)));
    assert(y.ge(IntVal(req.min)), y.le(IntVal(req.max)));
    assert(x.add(y).eq(IntVal(req.sum)));
  });
  const ms = (performance.now() - t0).toFixed(0);

  const model = result.sat
    ? `x=${result.model.get('x')} y=${result.model.get('y')}`
    : '';

  parentPort!.postMessage({
    id: req.id,
    userId: req.userId,
    status: result.status.toUpperCase(),
    model,
    ms,
  });
});
