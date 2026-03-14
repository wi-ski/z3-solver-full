import { describe, it, expect } from 'vitest';
import { HandleTable } from '../handle-table.js';

describe('HandleTable', () => {
  it('creates handles with monotonically increasing IDs', () => {
    const table = new HandleTable<string>();
    const id1 = table.create('a');
    const id2 = table.create('b');
    expect(id2).toBeGreaterThan(id1);
  });

  it('retrieves stored values by handle', () => {
    const table = new HandleTable<{ name: string }>();
    const val = { name: 'test' };
    const id = table.create(val);
    expect(table.get(id)).toBe(val);
  });

  it('throws on unknown handle', () => {
    const table = new HandleTable<string>();
    expect(() => table.get(999)).toThrow('HandleTable: unknown handle 999');
  });

  it('reports has correctly', () => {
    const table = new HandleTable<number>();
    const id = table.create(42);
    expect(table.has(id)).toBe(true);
    expect(table.has(id + 100)).toBe(false);
  });

  it('deletes handles', () => {
    const table = new HandleTable<string>();
    const id = table.create('hello');
    expect(table.delete(id)).toBe(true);
    expect(table.has(id)).toBe(false);
    expect(() => table.get(id)).toThrow();
  });

  it('tracks size', () => {
    const table = new HandleTable<number>();
    expect(table.size).toBe(0);
    const id1 = table.create(1);
    const id2 = table.create(2);
    expect(table.size).toBe(2);
    table.delete(id1);
    expect(table.size).toBe(1);
    table.delete(id2);
    expect(table.size).toBe(0);
  });

  it('clears all handles', () => {
    const table = new HandleTable<string>();
    table.create('a');
    table.create('b');
    table.create('c');
    expect(table.size).toBe(3);
    table.clear();
    expect(table.size).toBe(0);
  });

  it('IDs never reuse after clear', () => {
    const table = new HandleTable<string>();
    const id1 = table.create('x');
    table.clear();
    const id2 = table.create('y');
    expect(id2).toBeGreaterThan(id1);
  });
});
