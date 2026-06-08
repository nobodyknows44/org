import { describe, it, expect } from 'vitest';
import { wouldCreateCycle } from '@/lib/validation/cycleCheck';

describe('wouldCreateCycle', () => {
  it('should return false for a valid edge addition', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ];
    expect(wouldCreateCycle(edges, 'A', 'D')).toBe(false);
  });

  it('should return true when adding an edge that creates a cycle', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ];
    // Adding C → A would create a cycle: A → B → C → A
    expect(wouldCreateCycle(edges, 'C', 'A')).toBe(true);
  });

  it('should detect self-loop as a cycle', () => {
    const edges = [{ source: 'A', target: 'B' }];
    // Adding A → A
    expect(wouldCreateCycle(edges, 'A', 'A')).toBe(true);
  });

  it('should return false for disjoint segments', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'C', target: 'D' },
    ];
    expect(wouldCreateCycle(edges, 'D', 'A')).toBe(false);
  });

  it('should detect deep cycles', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
    ];
    // Adding E → A would create a cycle
    expect(wouldCreateCycle(edges, 'E', 'A')).toBe(true);
  });

  it('should work with multi-parent DAGs', () => {
    const edges = [
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
    ];
    // Adding D → B would create cycle: B → C → D → B
    expect(wouldCreateCycle(edges, 'D', 'B')).toBe(true);
    // Adding D → A would also create cycle: A → C → D → A
    expect(wouldCreateCycle(edges, 'D', 'A')).toBe(true);
    // Adding A → B is fine (no cycle)
    expect(wouldCreateCycle(edges, 'A', 'B')).toBe(false);
  });
});
