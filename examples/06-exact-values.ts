/**
 * Exact value inspection: string extraction with explicit length.
 *
 * The standard Z3 wrapper uses lossy UTF8 conversion. This package
 * provides getExactString which returns the raw bytes and precise length,
 * critical for strings that contain null bytes or non-UTF8 data.
 *
 * Run:  npx tsx examples/06-exact-values.ts
 *
 * Output:
 *   Exact string: "hello world"
 *   Length: 11 bytes
 */
import { initZ3Full } from '../src/index.js';

async function main() {
  const z3 = await initZ3Full();
  const Z3 = z3.Z3 as any;

  const cfg = Z3.mk_config();
  const ctx = Z3.mk_context(cfg);
  Z3.del_config(cfg);

  // Create a string constant and extract it with exact length
  const strAst = Z3.mk_string(ctx, 'hello world');
  const { str, length } = z3.inspect.getExactString(ctx, strAst);

  console.log(`Exact string: "${str}"`);
  console.log(`Length: ${length} bytes`);

  // Demonstrate with an empty string (edge case)
  const emptyAst = Z3.mk_string(ctx, '');
  const empty = z3.inspect.getExactString(ctx, emptyAst);
  console.log(`Empty string: "${empty.str}" (length: ${empty.length})`);

  // Demonstrate with unicode
  const unicodeAst = Z3.mk_string(ctx, 'cafe\u0301');
  const unicode = z3.inspect.getExactString(ctx, unicodeAst);
  console.log(`Unicode string: "${unicode.str}" (length: ${unicode.length})`);

  Z3.del_context(ctx);
  z3.dispose();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
