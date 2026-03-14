import type { EmscriptenModule, Z3_context } from './types.js';

/**
 * Error handling for Z3 contexts.
 *
 * The upstream z3-solver WASM binary does NOT export the C function
 * `Z3_set_error_handler` (which takes a callback). Instead, the build
 * provides two custom shims compiled directly into the WASM:
 *
 *   _set_throwy_error_handler(ctx) — makes Z3 throw on errors
 *   _set_noop_error_handler(ctx)   — silently ignores errors
 *
 * These are accessible as direct WASM exports on the Emscripten module
 * (Module._set_throwy_error_handler, Module._set_noop_error_handler).
 */

export type ErrorMode = 'throw' | 'noop';

/**
 * Set the error handler mode for a context.
 *
 * - 'throw': Z3 will throw an exception on errors (useful for debugging)
 * - 'noop': Z3 silently continues on errors (the z3-solver default)
 */
export function setErrorMode(
  mod: EmscriptenModule,
  ctx: Z3_context,
  mode: ErrorMode,
): void {
  const fnName = mode === 'throw'
    ? '_set_throwy_error_handler'
    : '_set_noop_error_handler';
  const fn = (mod as any)[fnName] as ((ctx: number) => void) | undefined;
  if (!fn) {
    throw new Error(`Error handler shim ${fnName} not found on module`);
  }
  fn(ctx as unknown as number);
}

/**
 * Check and retrieve the last error for a context.
 */
export function checkError(
  z3: { get_error_code(ctx: Z3_context): number; get_error_msg(ctx: Z3_context, code: number): string },
  ctx: Z3_context,
): { code: number; message: string } | null {
  const code = z3.get_error_code(ctx);
  if (code === 0) return null;
  return { code, message: z3.get_error_msg(ctx, code) };
}
