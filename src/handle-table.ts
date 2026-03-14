/**
 * Maps JS objects to integer handles for passing through WASM as void*.
 *
 * Z3's callback APIs pass a `void* user_context` through the C layer.
 * In WASM, void* is a 32-bit integer. This table assigns monotonically
 * increasing integer IDs to JS values so they survive the round-trip.
 */
export class HandleTable<T> {
  private nextId = 1;
  private map = new Map<number, T>();

  create(value: T): number {
    const id = this.nextId++;
    this.map.set(id, value);
    return id;
  }

  get(id: number): T {
    const value = this.map.get(id);
    if (value === undefined) {
      throw new Error(`HandleTable: unknown handle ${id}`);
    }
    return value;
  }

  has(id: number): boolean {
    return this.map.has(id);
  }

  delete(id: number): boolean {
    return this.map.delete(id);
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}
