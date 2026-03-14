import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallbackRegistry } from '../callback-registry.js';
import type { EmscriptenModule } from '../types.js';

function mockModule(): EmscriptenModule {
  let nextPtr = 100;
  return {
    addFunction: vi.fn(() => nextPtr++),
    removeFunction: vi.fn(),
    ccall: vi.fn(),
    UTF8ToString: vi.fn(),
    _malloc: vi.fn(() => 0x1000),
    _free: vi.fn(),
    HEAP8: new Int8Array(0),
    HEAPU8: new Uint8Array(0),
    HEAP16: new Int16Array(0),
    HEAPU16: new Uint16Array(0),
    HEAP32: new Int32Array(0),
    HEAPU32: new Uint32Array(0),
    HEAPF32: new Float32Array(0),
    HEAPF64: new Float64Array(0),
  } as unknown as EmscriptenModule;
}

describe('CallbackRegistry', () => {
  let mod: EmscriptenModule;
  let registry: CallbackRegistry;

  beforeEach(() => {
    mod = mockModule();
    registry = new CallbackRegistry(mod);
  });

  it('addCallback calls mod.addFunction and tracks the pointer', () => {
    const fn = () => {};
    const ptr = registry.addCallback('vii', fn);
    expect(mod.addFunction).toHaveBeenCalledWith(fn, 'vii');
    expect(registry.outstandingCallbacks).toBe(1);
    expect(typeof ptr).toBe('number');
  });

  it('removeCallback calls mod.removeFunction', () => {
    const ptr = registry.addCallback('vi', () => {});
    registry.removeCallback(ptr);
    expect(mod.removeFunction).toHaveBeenCalledWith(ptr);
    expect(registry.outstandingCallbacks).toBe(0);
  });

  it('removeCallback is idempotent', () => {
    const ptr = registry.addCallback('vi', () => {});
    registry.removeCallback(ptr);
    registry.removeCallback(ptr);
    expect(mod.removeFunction).toHaveBeenCalledTimes(1);
  });

  it('handle lifecycle works', () => {
    const state = { count: 0 };
    const id = registry.createHandle(state);
    expect(registry.getHandle(id)).toBe(state);
    expect(registry.outstandingHandles).toBe(1);
    registry.deleteHandle(id);
    expect(registry.outstandingHandles).toBe(0);
  });

  it('dispose releases all callbacks and handles', () => {
    registry.addCallback('vi', () => {});
    registry.addCallback('vii', () => {});
    registry.createHandle({ a: 1 });
    registry.createHandle({ b: 2 });

    registry.dispose();

    expect(registry.outstandingCallbacks).toBe(0);
    expect(registry.outstandingHandles).toBe(0);
    expect(mod.removeFunction).toHaveBeenCalledTimes(2);
  });
});
