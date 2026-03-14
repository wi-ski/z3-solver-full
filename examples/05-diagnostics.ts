/**
 * Error handling: detect solver errors and map them to diagnostics.
 *
 * Demonstrates throw mode (Z3 throws on errors), noop mode (poll for
 * errors), and structured error extraction.
 *
 * Run:  npx tsx examples/05-diagnostics.ts
 *
 * Output:
 *   [noop mode] Error after invalid pop:
 *     code: 5
 *     message: "..."
 *   [throw mode] Caught: Z3 threw on invalid operation
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const Z3 = z3.Z3 as any;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);
  const solver = Z3.mk_simple_solver(ctx);

  // --- Noop mode: errors are silent, poll to detect them ---
  z3.errors.setMode(ctx, 'noop');

  // Trigger an error: pop without a matching push
  Z3.solver_pop(ctx, solver, 1);

  const err = z3.errors.check(ctx);
  if (err) {
    console.log('[noop mode] Error after invalid pop:');
    console.log(`  code: ${err.code}`);
    console.log(`  message: "${err.message}"`);
  }

  // --- Throw mode: Z3 throws immediately on errors ---
  z3.errors.setMode(ctx, 'throw');

  try {
    // This will throw because we pop without push again
    Z3.solver_pop(ctx, solver, 1);
    console.log('[throw mode] No error (unexpected)');
  } catch (e: any) {
    console.log('[throw mode] Caught: Z3 threw on invalid operation');
  }

  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
