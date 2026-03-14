import type { EmscriptenModule, WasmFnPtr } from './types.js';
import { HandleTable } from './handle-table.js';

/**
 * Manages WASM callback function pointers and JS state handles.
 *
 * Uses the Emscripten module's native addFunction/removeFunction
 * for callback registration. Tracks all outstanding pointers for
 * bulk cleanup via dispose().
 */
export class CallbackRegistry {
  readonly handles = new HandleTable<unknown>();
  private readonly ptrs = new Set<WasmFnPtr>();

  constructor(private readonly mod: EmscriptenModule) {}

  addCallback(sig: string, fn: Function): WasmFnPtr {
    const ptr = this.mod.addFunction(fn, sig);
    this.ptrs.add(ptr);
    return ptr;
  }

  removeCallback(ptr: WasmFnPtr): void {
    if (this.ptrs.has(ptr)) {
      this.mod.removeFunction(ptr);
      this.ptrs.delete(ptr);
    }
  }

  createHandle<T>(value: T): number {
    return this.handles.create(value);
  }

  getHandle<T>(id: number): T {
    return this.handles.get(id) as T;
  }

  deleteHandle(id: number): void {
    this.handles.delete(id);
  }

  dispose(): void {
    for (const ptr of this.ptrs) {
      this.mod.removeFunction(ptr);
    }
    this.ptrs.clear();
    this.handles.clear();
  }

  get outstandingCallbacks(): number {
    return this.ptrs.size;
  }

  get outstandingHandles(): number {
    return this.handles.size;
  }
}
