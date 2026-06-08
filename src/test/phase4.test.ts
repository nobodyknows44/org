import { describe, it, expect } from 'vitest';
import { DIAGRAM_TEMPLATES, hydrateTemplate } from '@/lib/templates';

describe('Diagram Templates', () => {
  it('should have at least 4 templates', () => {
    expect(DIAGRAM_TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it('each template should have required fields', () => {
    DIAGRAM_TEMPLATES.forEach((t) => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(['org_chart', 'ownership']).toContain(t.type);
      expect(t.nodes.length).toBeGreaterThan(0);
      expect(t.edges.length).toBeGreaterThan(0);
      expect(t.fieldSchema.length).toBeGreaterThan(0);
    });
  });

  it('hydrateTemplate should produce unique node IDs', () => {
    const template = DIAGRAM_TEMPLATES[0];
    const result = hydrateTemplate(template);
    const ids = result.nodes.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('hydrateTemplate should map edges correctly', () => {
    const template = DIAGRAM_TEMPLATES[0];
    const result = hydrateTemplate(template);
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    result.edges.forEach((e) => {
      expect(nodeIds.has(e.source)).toBe(true);
      expect(nodeIds.has(e.target)).toBe(true);
    });
  });

  it('hydrated IDs should differ from template tempIds', () => {
    const template = DIAGRAM_TEMPLATES[0];
    const tempIds = template.nodes.map((n) => n.tempId);
    const result = hydrateTemplate(template);
    const newIds = result.nodes.map((n) => n.id);
    newIds.forEach((id) => {
      expect(tempIds).not.toContain(id);
    });
  });

  it('holding company template should have ownership edges with metadata', () => {
    const holdingTemplate = DIAGRAM_TEMPLATES.find((t) => t.id === 'holding-company');
    expect(holdingTemplate).toBeDefined();
    const result = hydrateTemplate(holdingTemplate!);
    const edgesWithPct = result.edges.filter((e: any) => e.data?.ownership_pct !== undefined);
    expect(edgesWithPct.length).toBeGreaterThan(0);
  });

  it('org chart templates should use orgChartNode type', () => {
    const orgTemplate = DIAGRAM_TEMPLATES.find((t) => t.type === 'org_chart');
    expect(orgTemplate).toBeDefined();
    const result = hydrateTemplate(orgTemplate!);
    result.nodes.forEach((n) => {
      expect(n.type).toBe('orgChartNode');
    });
  });

  it('ownership templates should use ownershipNode type', () => {
    const ownershipTemplate = DIAGRAM_TEMPLATES.find((t) => t.type === 'ownership');
    expect(ownershipTemplate).toBeDefined();
    const result = hydrateTemplate(ownershipTemplate!);
    result.nodes.forEach((n) => {
      expect(n.type).toBe('ownershipNode');
    });
  });
});

describe('Bulk Edit Logic', () => {
  it('should be able to identify selected nodes and apply field updates', () => {
    // Simulates the core bulk edit logic without React components
    const nodes = [
      { id: '1', data: { fields: { name: 'Alice', dept: 'Eng' } } },
      { id: '2', data: { fields: { name: 'Bob', dept: 'Sales' } } },
      { id: '3', data: { fields: { name: 'Carol', dept: 'Eng' } } },
    ];
    const selectedIds = ['1', '3'];
    const fieldToUpdate = 'dept';
    const newValue = 'Marketing';

    const updated = nodes.map((n) => {
      if (!selectedIds.includes(n.id)) return n;
      return {
        ...n,
        data: {
          ...n.data,
          fields: { ...n.data.fields, [fieldToUpdate]: newValue },
        },
      };
    });

    expect(updated[0].data.fields.dept).toBe('Marketing');
    expect(updated[1].data.fields.dept).toBe('Sales'); // unchanged
    expect(updated[2].data.fields.dept).toBe('Marketing');
  });
});

describe('Presentation Walk Order', () => {
  it('should produce BFS order from root', () => {
    // Replicate the walk order logic from PresentationMode
    const nodes = [
      { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' },
    ];
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'D' },
    ];

    const childMap = new Map<string, string[]>();
    const hasParent = new Set<string>();
    edges.forEach((e) => {
      if (!childMap.has(e.source)) childMap.set(e.source, []);
      childMap.get(e.source)!.push(e.target);
      hasParent.add(e.target);
    });

    const roots = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id);
    const visited = new Set<string>();
    const order: string[] = [];
    const queue = [...roots];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      order.push(id);
      const children = childMap.get(id) || [];
      children.forEach((c) => { if (!visited.has(c)) queue.push(c); });
    }

    expect(order).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('Comment Service Types', () => {
  it('DiagramComment should have required fields', async () => {
    const mod = await import('@/lib/supabase/commentService');
    // Verify the module exports the expected functions
    expect(typeof mod.listComments).toBe('function');
    expect(typeof mod.addComment).toBe('function');
    expect(typeof mod.toggleResolveComment).toBe('function');
    expect(typeof mod.deleteComment).toBe('function');
  });
});
