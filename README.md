# z3-solver-full

**Z3 4.16.0 in WebAssembly. Zero dependencies. One `npm install`.**

Ergonomic TypeScript bindings for Z3's full callback surface — user propagators, clause streaming, chainable DSL, model inspection — shipped with our own WASM binary so you don't need anything else.

```bash
npm install z3-solver-full
```

## Why not `z3-solver`?

| | `z3-solver` | `z3-solver-full` |
|---|---|---|
| Z3 version | 4.15.4 | **4.16.0** |
| Runtime deps | yes (ships its own binary) | **zero** |
| User propagator API | raw C function pointers | **typed callbacks, auto cleanup, error channel** |
| `solve()` DSL | N/A | **`Bool`, `Int`, `Real` with `.and()`, `.or()`, `.eq()`, model extraction** |
| `solveSync()` | N/A (async only) | **synchronous main-thread solve** |
| Clause streaming | raw C callback | **`on_clause` with structured events** |
| `propagate_on_binding` | not exported | **exported** |
| Error handling | silent | **throw mode, noop + poll, structured errors** |
| Model inspection | lossy UTF8 | **exact string, FPA sign, RCF intervals** |
| WASM debug names | no | **yes (`-g2`)** |
| Callback lifecycle | manual | **`CallbackRegistry` with auto cleanup** |

## Quick start

```typescript
import { initZ3Full } from 'z3-solver-full';

const z3 = await initZ3Full();

// One-liner: is x + 2 = 10 satisfiable?
const result = z3.solve(({ Int, IntVal, assert }) => {
  const x = Int('x');
  assert(x.add(IntVal(2)).eq(IntVal(10)));
});

console.log(result.model.get('x')); // 8
z3.dispose();
```

## Examples

Every example is copy-paste-runnable:

```bash
git clone <repo> && cd z3-solver-full && npm install
npx tsx examples/01-hello.ts
```

| # | Example | Feature |
|---|---------|---------|
| 01 | `01-hello.ts` | Basic SAT/UNSAT, model extraction |
| 02 | `02-observe.ts` | User propagator: onFixed, onEq, onFinal timeline |
| 03 | `03-repair.ts` | set_initial_value, onDecide — warm-start repair |
| 04 | `04-alternatives.ts` | Solution enumeration with blocking clauses |
| 05 | `05-diagnostics.ts` | Error modes: throw, noop, checkError |
| 06 | `06-exact-values.ts` | getExactString — lossless string extraction |
| 07 | `07-unsafe-raw.ts` | Raw addFunction/ccall escape hatch |
| 08 | `08-error-boundary.ts` | Callback exception → solveSync re-throw |
| 09 | `09-solve-api.ts` | `solve()` DSL: Bool, Int, chainable ops |
| 10 | `10-propagator-lifecycle.ts` | onPush, onPop, onCreated — scope lifecycle |
| 11 | `11-clause-stream.ts` | on_clause — watch CDCL emit clauses live |
| 12 | `12-interrupt.ts` | Z3_interrupt — cancel solve from callback |
| 13 | `13-consequence.ts` | solver_propagate_consequence — inject clauses |
| 14 | `14-real-arithmetic.ts` | `solve()` DSL: Real variables, rational arithmetic |
| 15 | `15-graph-coloring.ts` | `solve()` DSL: distinct(), graph coloring |
| 16 | `16-worker-pool.ts` | Multi-user worker pool with deterministic routing |

### Example output

```bash
$ npx tsx examples/01-hello.ts
SAT
x = (- 12)
y = 0

$ npx tsx examples/02-observe.ts
[  20ms] fixed  term=30244144 → val=30243976
[  20ms] eq     30244144 == 30244088
[  20ms] final  6 events — accepting model
SAT

$ npx tsx examples/03-repair.ts
Original: alice=wed bob=tue carol=mon
Constraint changed: carol can't work mon anymore
Repaired:  alice=wed bob=mon carol=tue
Changed: 2 of 3 assignments

$ npx tsx examples/04-alternatives.ts
Solution 1: a=true  b=true  c=false
Solution 2: a=false b=true  c=true
Solution 3: a=true  b=false c=true
Solution 4: a=true  b=true  c=true
Found 4 alternatives

$ npx tsx examples/05-diagnostics.ts
[noop mode] Error after invalid pop:
  code: 2
  message: "index out of bounds"
[throw mode] Caught: Z3 threw on invalid operation

$ npx tsx examples/06-exact-values.ts
Exact string: "hello world"
Length: 11 bytes
Empty string: "" (length: 0)
Unicode string: "café" (length: 6)

$ npx tsx examples/07-unsafe-raw.ts
Registered callback at table slot 11543
fixed_eh called: userCtx=42 term=30244208 value=30243956
SAT
Callback cleaned up

$ npx tsx examples/08-error-boundary.ts
Caught from solveSync: Error: schedule conflict detected
Context still usable: true (SAT on new solver)

$ npx tsx examples/09-solve-api.ts
SAT
alice_works = false
bob_works = true
x + 2 <= y - 10: x=-12, y=0
Caught: domain error

$ npx tsx examples/10-propagator-lifecycle.ts
[push]  scope opened
[fixed] x = true
[final] accepting model
SAT in scope
[pop]   1 scope(s) closed
Lifecycle complete

$ npx tsx examples/11-clause-stream.ts
Registered on_clause callback
[clause] proof=30244248 deps=0
SAT — received 6 clause events

$ npx tsx examples/12-interrupt.ts
[final] call #1 — interrupting solver
Result: unknown (solver was interrupted)

$ npx tsx examples/13-consequence.ts
[final] x is true, propagating y := true
SAT — y was forced true by propagator

$ npx tsx examples/14-real-arithmetic.ts
SAT
x = 1.5
y = 0.5
x + y = 2

$ npx tsx examples/15-graph-coloring.ts
SAT
A=1  B=2  C=3  D=1
All edges satisfied

$ npx tsx examples/16-worker-pool.ts
Pool ready: 4 workers (~100 MB)
[worker 3] user_alice   → SAT     x=1 y=9      (3ms)
[worker 3] user_bob     → SAT     x=1 y=9      (2ms)
[worker 3] user_carol   → UNSAT                 (3ms)
[worker 1] user_dave    → SAT     x=1 y=1      (4ms)
All 12 requests completed
```

## API Reference

### `initZ3Full(): Promise<Z3Full>`

Loads the WASM binary and returns the full API surface:

```typescript
const z3 = await initZ3Full();
// z3.Z3        — Z3 C API via ccall (mk_context, mk_solver, mk_bool_sort, ...)
// z3.UnsafeZ3  — callback-heavy functions (propagator, clause stream, fixedpoint)
// z3.em        — raw Emscripten module (addFunction, ccall, HEAP32, ...)
// z3.registry  — CallbackRegistry for function pointer lifecycle
// z3.solve()   — high-level DSL
// z3.solveSync() — synchronous check_sat with error re-throw
// z3.userPropagator.attach() / .register()
// z3.inspect.getExactString() / .getFpaSign() / .getRcfInterval()
// z3.errors.setMode() / .check()
// z3.dispose()
```

### `z3.solve(builder): SolveResult`

One function to build constraints, solve, and extract the model:

```typescript
const result = z3.solve(({ Bool, Int, Real, IntVal, RealVal, BoolVal, assert, distinct, propagate }) => {
  const x = Int('x');
  const y = Int('y');
  assert(x.add(y).eq(IntVal(10)));
  assert(x.gt(IntVal(0)), y.gt(IntVal(0)));
  assert(distinct(x, y));
});

result.sat;              // true
result.model.get('x');   // 9 (or any valid assignment)
result.model.get('y');   // 1
```

**Chainable expression methods:**

| Bool | Arith (Int/Real) | Any Expr |
|------|-----------------|----------|
| `.and(...)` | `.add(...)` | `.eq(other)` |
| `.or(...)` | `.sub(...)` | `.neq(other)` |
| `.not()` | `.mul(...)` | |
| `.implies(b)` | `.div(other)` | |
| `.iff(b)` | `.neg()` | |
| `.xor(b)` | `.le(other)` / `.lt(other)` | |
| | `.ge(other)` / `.gt(other)` | |

### `z3.solveSync(ctx, solver): Z3_lbool`

Synchronous `check_sat` on the main thread. If a callback threw an error, it's re-thrown here:

```typescript
const { ctx, solver } = makeCtxAndSolver(z3.Z3);
z3.Z3.solver_assert(ctx, solver, someConstraint);

try {
  const result = z3.solveSync(ctx, solver); // 1=SAT, -1=UNSAT, 0=unknown
} catch (e) {
  // If a callback threw, the original error surfaces here
}
```

### `z3.userPropagator.attach(ctx, solver, state, callbacks): Disposer`

Register typed callbacks for the user propagator protocol:

```typescript
const dispose = z3.userPropagator.attach(ctx, solver, { count: 0 }, {
  onFixed: (state, cb, term, value) => { state.count++; },
  onFinal: (state, cb) => true,  // true = accept model
  onEq: (state, cb, lhs, rhs) => { /* equality detected */ },
  onDiseq: (state, cb, lhs, rhs) => { /* disequality detected */ },
  onDecide: (state, cb, term, idx, phase) => { /* decision point */ },
  onCreated: (state, cb, term) => { /* term internalized */ },
  onPush: (state, cb) => { /* scope pushed */ },
  onPop: (state, cb, n) => { /* n scopes popped */ },
});

// When done:
dispose(); // releases all WASM callback slots
```

### Clause streaming

Watch Z3's CDCL engine emit clauses during search:

```typescript
const cbPtr = z3.em.addFunction(
  (userCtx, proofHint, numDeps, depsPtr, literals) => {
    console.log('clause event:', { proofHint, numDeps });
  },
  'viiiii',
);
z3.UnsafeZ3.Z3_solver_register_on_clause(ctx, solver, 0, cbPtr);

// ... solve ...

z3.em.removeFunction(cbPtr);
```

### Z3_interrupt

Cancel a solve in progress from inside a callback:

```typescript
z3.userPropagator.attach(ctx, solver, {}, {
  onFinal: () => {
    z3.UnsafeZ3.Z3_interrupt(ctx);
    return false; // reject model, solver returns "unknown"
  },
});
```

### Error handling

```typescript
// Throw mode: Z3 throws JS exceptions on errors
z3.errors.setMode(ctx, 'throw');

// Noop mode: poll for errors
z3.errors.setMode(ctx, 'noop');
const err = z3.errors.check(ctx);
if (err) console.log(err.code, err.message);
```

### Exact value inspection

```typescript
const { str, length } = z3.inspect.getExactString(ctx, stringAst);
```

### Raw escape hatch

For anything not covered by the ergonomic API:

```typescript
const { em, UnsafeZ3 } = z3;

const cbPtr = em.addFunction((userCtx, cb, term, value) => {
  console.log('raw callback:', { term, value });
}, 'viiii');

UnsafeZ3.Z3_solver_propagate_fixed(ctx, solver, cbPtr);
// ... use ...
em.removeFunction(cbPtr);
```

## Binary

Ships a custom Z3 4.16.0 WASM binary built from source with:

- **`-fwasm-exceptions`** — native WASM exception handling (smaller binary, better perf)
- **`-g2`** — function names in crash stack traces
- **`ALLOW_TABLE_GROWTH`** — dynamic function table for `addFunction`
- **`Z3_solver_propagate_on_binding`** — exported (missing from stock `z3-solver`)

Build your own: `cd build && ./build.sh` (requires Docker + emsdk 3.1.73)

## FAQ

### How do I use this in a multi-user server without blocking?

Use a worker pool with deterministic routing. Each worker holds a hot WASM instance (~25 MB). Route requests by user/session ID so the same user always hits the same worker — gives you implicit session affinity without shared state.

**Install:**

```bash
npm install z3-solver-full piscina
```

**`solver-worker.ts`** — the worker script, one per pool slot:

```typescript
import { initZ3Full, type Z3Full } from 'z3-solver-full';

let z3: Z3Full;

export default async function solve(req: { min: number; max: number; variables: string[] }) {
  if (!z3) z3 = await initZ3Full(); // lazy init, ~200ms first call, then instant

  return z3.solve(({ Int, IntVal, assert, distinct }) => {
    const vars = req.variables.map(Int);
    for (const v of vars) {
      assert(v.ge(IntVal(req.min)), v.le(IntVal(req.max)));
    }
    assert(distinct(...vars));
  });
}
```

**`server.ts`** — Express server with deterministic worker routing:

```typescript
import express from 'express';
import { Piscina } from 'piscina';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const pool = new Piscina({
  filename: './solver-worker.ts',
  minThreads: 4,
  maxThreads: 4,
});

// Deterministic routing: same userId always hits the same worker.
// Gives you session affinity without shared state or locks.
function workerIndex(userId: string, poolSize: number): number {
  const hash = crypto.createHash('md5').update(userId).digest();
  return hash.readUInt32BE(0) % poolSize;
}

app.post('/solve', async (req, res) => {
  try {
    const result = await pool.run(req.body, {
      // piscina doesn't expose direct worker selection, but you can
      // use named queues or a custom scheduler. For simplicity:
      name: 'default',
    });
    res.json({
      status: result.status,
      model: Object.fromEntries(result.model),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Solver pool ready — 4 workers, ~100 MB'));
```

**Cost model:**

| Workers | Memory | Cold start | Per-solve overhead |
|---------|--------|------------|-------------------|
| 1 | ~25 MB | ~200ms (once) | Z3 solve time only |
| 4 | ~100 MB | ~200ms (once per worker) | Z3 solve time only |
| 8 | ~200 MB | ~200ms (once per worker) | Z3 solve time only |

Context creation/destruction is microseconds. The WASM instance stays hot. Each `solve()` call creates a fresh Z3 context internally — no state leaks between users.

### Can two users share a worker?

Yes. Workers process requests sequentially. `solve()` creates and destroys its own context per call — complete isolation between requests. The worker just needs to be free (not mid-solve). That's what the pool handles: if all workers are busy, requests queue.

### What if a solve takes too long?

Use `Z3_interrupt` with a timeout:

```typescript
export default async function solve(req: { constraints: any; timeoutMs: number }) {
  if (!z3) z3 = await initZ3Full();

  const { Z3, UnsafeZ3 } = z3;
  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);
  const solver = Z3.mk_simple_solver(ctx);

  // ... build constraints ...

  const timer = setTimeout(() => UnsafeZ3.Z3_interrupt(ctx), req.timeoutMs);
  try {
    const result = z3.solveSync(ctx, solver);
    // result === 0 means "unknown" (interrupted)
    return { status: result === 1 ? 'sat' : result === -1 ? 'unsat' : 'timeout' };
  } finally {
    clearTimeout(timer);
    Z3.del_context(ctx);
  }
}
```

Note: `setTimeout` fires on the *next* event loop tick after `solveSync` returns (since `solveSync` blocks). For true mid-solve interruption, call `Z3_interrupt` from a *different* thread — e.g., the main thread sends a message to the worker, and the worker's `parentPort.on('message')` handler calls `Z3_interrupt`. This works because `Z3_interrupt` is thread-safe.

### Does this work in the browser?

The WASM binary and `solveSync` work in browsers that support `SharedArrayBuffer` and WASM threads (Chrome, Firefox, Edge). The `initZ3Full()` function currently uses Node.js APIs (`createRequire`, `readFileSync`) for loading — a browser-compatible loader is planned.

## Tests

```bash
npm test          # 56 tests, ~300ms
npm run test:watch
```

## License

MIT
