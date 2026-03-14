/**
 * Multi-user worker pool: 4 hot Z3 instances serving concurrent requests.
 *
 * Simulates 12 users submitting constraint problems simultaneously.
 * Each worker holds a persistent WASM instance (~25 MB). Requests are
 * routed deterministically by userId so the same user always hits the
 * same worker — no shared state, no locks.
 *
 * Run:  npx tsx examples/16-worker-pool.ts
 *
 * Output:
 *   Pool ready: 4 workers (~100 MB)
 *   [worker 0] user_alice  → SAT  x=3 y=7   (14ms)
 *   [worker 1] user_bob    → SAT  x=1 y=9   (2ms)
 *   ...
 *   All 12 requests completed
 */
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POOL_SIZE = 4;
const workerFile = join(__dirname, '16-solver-worker.ts');

const workers: Worker[] = [];
const pending = new Map<number, (result: any) => void>();
let nextId = 0;

for (let i = 0; i < POOL_SIZE; i++) {
  const w = new Worker(workerFile, {
    execArgv: ['--import', 'tsx/esm'],
  });
  w.on('message', (msg) => {
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  });
  w.on('error', (err) => console.error('Worker error:', err.message));
  workers.push(w);
}

function route(userId: string): number {
  const hash = crypto.createHash('md5').update(userId).digest();
  return hash.readUInt32BE(0) % POOL_SIZE;
}

function solve(userId: string, min: number, max: number, sum: number): Promise<any> {
  return new Promise((resolve) => {
    const id = nextId++;
    const workerIdx = route(userId);
    pending.set(id, resolve);
    workers[workerIdx].postMessage({ id, userId, min, max, sum });
  });
}

console.log(`Pool ready: ${POOL_SIZE} workers (~${POOL_SIZE * 25} MB)`);

const requests = [
  { userId: 'user_alice',   min: 1, max: 9, sum: 10 },
  { userId: 'user_bob',     min: 1, max: 9, sum: 10 },
  { userId: 'user_carol',   min: 1, max: 9, sum: 10 },
  { userId: 'user_dave',    min: 1, max: 9, sum: 10 },
  { userId: 'user_eve',     min: 1, max: 9, sum: 15 },
  { userId: 'user_frank',   min: 1, max: 9, sum: 15 },
  { userId: 'user_grace',   min: 1, max: 5, sum: 3  },
  { userId: 'user_heidi',   min: 1, max: 5, sum: 3  },
  { userId: 'user_alice',   min: 1, max: 9, sum: 8  },
  { userId: 'user_bob',     min: 1, max: 9, sum: 12 },
  { userId: 'user_carol',   min: 2, max: 4, sum: 100 },
  { userId: 'user_dave',    min: 1, max: 9, sum: 2  },
];

const results = await Promise.all(
  requests.map(r => solve(r.userId, r.min, r.max, r.sum))
);

for (const r of results) {
  const workerIdx = route(r.userId);
  const pad = r.userId.padEnd(12);
  console.log(`[worker ${workerIdx}] ${pad} → ${r.status.padEnd(7)} ${r.model.padEnd(12)} (${r.ms}ms)`);
}

console.log(`\nAll ${requests.length} requests completed`);

for (const w of workers) w.terminate();
process.exit(0);
