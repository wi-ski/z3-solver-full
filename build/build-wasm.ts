/**
 * Z3 WASM build script — based on upstream Z3Prover/z3/src/api/js/scripts/build-wasm.ts
 * with two changes:
 *   1. Uses -fwasm-exceptions (native WASM exception handling — smaller binary, better perf,
 *      stricter type checking than upstream's -fexceptions JS-based approach)
 *   2. Exports addFunction/removeFunction + ALLOW_TABLE_GROWTH (upstream tree-shakes these)
 *
 * Everything else is upstream: pthreads, WASM_BIGINT, MODULARIZE, etc.
 */

import assert from 'assert';
import { SpawnOptions, spawnSync as originalSpawnSync } from 'child_process';
import fs, { existsSync } from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { asyncFuncs } from './async-fns';
import { makeCCWrapper } from './make-cc-wrapper';
import { functions } from './parse-api';

console.log('--- Building WASM (z3-solver-full: -fwasm-exceptions)');

const SWAP_OPTS: SpawnOptions = {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    CXXFLAGS: '-pthread -s USE_PTHREADS=1',
    LDFLAGS: '-s WASM_BIGINT -s -pthread -s USE_PTHREADS=1',
    FPMATH_ENABLED: 'False',
  },
};

function spawnSync(command: string, opts: SpawnOptions = {}) {
  console.log(`- ${command}`);
  const [cmd, ...args] = command.split(' ');
  const { error, ...rest } = originalSpawnSync(cmd, args, { ...SWAP_OPTS, ...opts });
  if (error !== undefined || rest.status !== 0) {
    if (error !== undefined) {
      console.error(error.message);
    } else {
      console.error(`Process exited with status ${rest.status}`);
    }
    process.exit(1);
  }
  return rest;
}

function exportedFuncs(): string[] {
  const extras = [
    '_malloc',
    '_free',
    '_set_throwy_error_handler',
    '_set_noop_error_handler',
    ...asyncFuncs.map(f => '_async_' + f),
    // Functions that exist in libz3.a but have no def_API annotation
    // in the headers, so parse-api.ts doesn't find them.
    '_Z3_set_error_handler',
    '_Z3_optimize_register_model_eh',
    '_Z3_fixedpoint_init',
    '_Z3_fixedpoint_set_reduce_assign_callback',
    '_Z3_fixedpoint_set_reduce_app_callback',
    '_Z3_fixedpoint_add_callback',
    '_Z3_fixedpoint_add_constraint',
  ];

  return [...extras, ...(functions as any[]).map(f => '_' + f.name)];
}

assert(fs.existsSync('./package.json'), 'Not in the root directory of js api');
const z3RootDir = path.join(process.cwd(), '../../../');

if (!existsSync(path.join(z3RootDir, 'build/Makefile'))) {
  spawnSync('emconfigure python3 scripts/mk_make.py --staticlib --single-threaded --arm64=false', {
    cwd: z3RootDir,
  });
}

spawnSync(`emmake make -j${os.cpus().length} libz3.a`, { cwd: path.join(z3RootDir, 'build') });

const ccWrapperPath = 'build/async-fns.cc';
console.log(`- Building ${ccWrapperPath}`);
fs.mkdirSync(path.dirname(ccWrapperPath), { recursive: true });
fs.writeFileSync(ccWrapperPath, makeCCWrapper());

const fns = JSON.stringify(exportedFuncs());
const methods = '["PThread","ccall","FS","UTF8ToString","intArrayFromString","addFunction","removeFunction"]';
const libz3a = path.normalize('../../../build/libz3.a');
spawnSync(
  `emcc build/async-fns.cc ${libz3a} --std=c++20 --pre-js src/low-level/async-wrapper.js -g2 -pthread -fwasm-exceptions -s WASM_BIGINT -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=0 -s PTHREAD_POOL_SIZE_STRICT=0 -s MODULARIZE=1 -s 'EXPORT_NAME="initZ3"' -s EXPORTED_RUNTIME_METHODS=${methods} -s EXPORTED_FUNCTIONS=${fns} -s SAFE_HEAP=0 -s TOTAL_MEMORY=2GB -s TOTAL_STACK=20MB -s ALLOW_TABLE_GROWTH=1 -I z3/src/api/ -o build/z3-built.js`,
);

fs.rmSync(ccWrapperPath);

console.log('--- WASM build finished');
