import type {
  UnsafeZ3Api,
  EmscriptenModule,
  Z3_context,
  Z3_ast,
  Z3_rcf_num,
  RcfInterval,
} from './types.js';

/**
 * Exact string extraction with explicit length.
 *
 * Z3_get_lstring returns a C string pointer and writes the length to
 * an out-param. This avoids lossy UTF8ToString conversions for strings
 * that contain null bytes or where exact length matters.
 *
 * C signature:
 *   Z3_char_ptr Z3_get_lstring(Z3_context c, Z3_ast s, unsigned* length)
 */
export function getExactString(
  mod: EmscriptenModule,
  raw: UnsafeZ3Api,
  ctx: Z3_context,
  ast: Z3_ast,
): { str: string; length: number } {
  const lengthPtr = mod._malloc(4);
  try {
    const strPtr = raw.Z3_get_lstring(ctx, ast, lengthPtr);
    const length = mod.HEAPU32[lengthPtr >> 2];
    const str = mod.UTF8ToString(strPtr, length);
    return { str, length };
  } finally {
    mod._free(lengthPtr);
  }
}

/**
 * Exact floating-point sign extraction.
 *
 * Returns the sign bit of an FP numeral. False = positive, true = negative.
 * Throws if the AST is NaN (invalid argument per Z3 docs).
 *
 * C signature:
 *   bool Z3_fpa_get_numeral_sign(Z3_context c, Z3_ast t, bool* sgn)
 */
export function getFpaSign(
  mod: EmscriptenModule,
  raw: UnsafeZ3Api,
  ctx: Z3_context,
  ast: Z3_ast,
): { success: boolean; isNegative: boolean } {
  const sgnPtr = mod._malloc(4);
  try {
    const success = raw.Z3_fpa_get_numeral_sign(ctx, ast, sgnPtr);
    const isNegative = !!mod.HEAP32[sgnPtr >> 2];
    return { success, isNegative };
  } finally {
    mod._free(sgnPtr);
  }
}

/**
 * Extract interval information for an algebraic real value.
 *
 * Returns the lower and upper bounds of the isolating interval,
 * along with whether each bound is infinite or open.
 *
 * C signature:
 *   int Z3_rcf_interval(Z3_context c, Z3_rcf_num a,
 *     bool* lower_is_inf, bool* lower_is_open, Z3_rcf_num* lower,
 *     bool* upper_is_inf, bool* upper_is_open, Z3_rcf_num* upper)
 */
export function getRcfInterval(
  mod: EmscriptenModule,
  raw: UnsafeZ3Api,
  ctx: Z3_context,
  a: Z3_rcf_num,
): { result: number; interval: RcfInterval } {
  // 4 bools (1 byte each, but we use 4-byte alignment for safety)
  // 2 rcf_num pointers (4 bytes each)
  // Total: 6 * 4 = 24 bytes
  const buf = mod._malloc(24);
  try {
    const lowerIsInfPtr = buf;
    const lowerIsOpenPtr = buf + 4;
    const lowerPtr = buf + 8;
    const upperIsInfPtr = buf + 12;
    const upperIsOpenPtr = buf + 16;
    const upperPtr = buf + 20;

    // Zero the buffer
    mod.HEAP32[buf >> 2] = 0;
    mod.HEAP32[(buf + 4) >> 2] = 0;
    mod.HEAP32[(buf + 8) >> 2] = 0;
    mod.HEAP32[(buf + 12) >> 2] = 0;
    mod.HEAP32[(buf + 16) >> 2] = 0;
    mod.HEAP32[(buf + 20) >> 2] = 0;

    const result = raw.Z3_rcf_interval(
      ctx,
      a,
      lowerIsInfPtr,
      lowerIsOpenPtr,
      lowerPtr,
      upperIsInfPtr,
      upperIsOpenPtr,
      upperPtr,
    );

    return {
      result,
      interval: {
        lowerIsInf: !!mod.HEAP32[lowerIsInfPtr >> 2],
        lowerIsOpen: !!mod.HEAP32[lowerIsOpenPtr >> 2],
        lower: mod.HEAP32[lowerPtr >> 2] as unknown as Z3_rcf_num,
        upperIsInf: !!mod.HEAP32[upperIsInfPtr >> 2],
        upperIsOpen: !!mod.HEAP32[upperIsOpenPtr >> 2],
        upper: mod.HEAP32[upperPtr >> 2] as unknown as Z3_rcf_num,
      },
    };
  } finally {
    mod._free(buf);
  }
}
