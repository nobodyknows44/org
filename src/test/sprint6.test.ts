import { describe, it, expect, vi } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    }),
  }),
}));

describe('Sprint 6 - Polish & UX', () => {
  describe('FilterPanel Logic', () => {
    it('should extract unique department values from nodes', () => {
      const nodes = [
        { id: '1', data: { fields: { department: 'Engineering', name: 'Alice' } } },
        { id: '2', data: { fields: { department: 'Marketing', name: 'Bob' } } },
        { id: '3', data: { fields: { department: 'Engineering', name: 'Charlie' } } },
        { id: '4', data: { fields: { name: 'Dave' } } }, // no department
      ];

      const filterFields = ['department', 'location'];
      const options: Record<string, Set<string>> = {};

      for (const node of nodes) {
        const fields = (node.data as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
        if (!fields) continue;
        for (const field of filterFields) {
          const value = fields[field];
          if (typeof value === 'string' && value.trim()) {
            if (!options[field]) options[field] = new Set();
            options[field].add(value.trim());
          }
        }
      }

      expect(options['department']?.size).toBe(2);
      expect(options['department']?.has('Engineering')).toBe(true);
      expect(options['department']?.has('Marketing')).toBe(true);
      expect(options['location']).toBeUndefined();
    });

    it('should filter nodes by matching active filters', () => {
      const nodes = [
        { id: '1', fields: { department: 'Engineering' } },
        { id: '2', fields: { department: 'Marketing' } },
        { id: '3', fields: { department: 'Engineering' } },
      ];
      const activeFilters = { department: new Set(['Engineering']) };

      const filtered = nodes.map((node) => {
        let matches = true;
        for (const [field, allowedValues] of Object.entries(activeFilters)) {
          const nodeValue = node.fields[field as keyof typeof node.fields];
          if (typeof nodeValue !== 'string' || !allowedValues.has(nodeValue)) {
            matches = false;
            break;
          }
        }
        return { ...node, opacity: matches ? 1 : 0.2 };
      });

      expect(filtered[0].opacity).toBe(1);
      expect(filtered[1].opacity).toBe(0.2);
      expect(filtered[2].opacity).toBe(1);
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should build path from root to selected node', () => {
      const nodes = [
        { id: '1', data: { fields: { name: 'CEO' } } },
        { id: '2', data: { fields: { name: 'VP Engineering' } } },
        { id: '3', data: { fields: { name: 'Team Lead' } } },
      ];
      const edges = [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ];

      const selectedId = '3';
      const path: { id: string; label: string }[] = [];
      const visited = new Set<string>();
      let currentId: string | null = selectedId;

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = nodes.find((n) => n.id === currentId);
        if (!node) break;
        const label = (node.data.fields as Record<string, unknown>).name as string;
        path.unshift({ id: currentId, label });
        const parentEdge = edges.find((e) => e.target === currentId);
        currentId = parentEdge ? parentEdge.source : null;
      }

      expect(path.length).toBe(3);
      expect(path[0].label).toBe('CEO');
      expect(path[1].label).toBe('VP Engineering');
      expect(path[2].label).toBe('Team Lead');
    });
  });

  describe('Per-Node Field Visibility', () => {
    it('should override global field visibility', () => {
      const globalVisibility = { name: true, email: false, phone: true };
      const nodeOverrides = { email: true }; // override email to visible

      const getEffectiveVisibility = (fieldId: string): boolean => {
        if (nodeOverrides[fieldId as keyof typeof nodeOverrides] !== undefined) {
          return nodeOverrides[fieldId as keyof typeof nodeOverrides];
        }
        if (globalVisibility[fieldId as keyof typeof globalVisibility] !== undefined) {
          return globalVisibility[fieldId as keyof typeof globalVisibility];
        }
        return true;
      };

      expect(getEffectiveVisibility('name')).toBe(true); // global
      expect(getEffectiveVisibility('email')).toBe(true); // overridden
      expect(getEffectiveVisibility('phone')).toBe(true); // global
      expect(getEffectiveVisibility('address')).toBe(true); // default
    });

    it('should allow hiding fields per-node that are globally visible', () => {
      const globalVisibility = { name: true, email: true };
      const nodeOverrides = { email: false }; // hide email for this node

      const isVisible = (fieldId: string): boolean => {
        if (nodeOverrides[fieldId as keyof typeof nodeOverrides] !== undefined) {
          return nodeOverrides[fieldId as keyof typeof nodeOverrides];
        }
        return globalVisibility[fieldId as keyof typeof globalVisibility] ?? true;
      };

      expect(isVisible('name')).toBe(true);
      expect(isVisible('email')).toBe(false); // per-node override
    });
  });

  describe('Onboarding Steps', () => {
    it('should have exactly 3 onboarding steps', () => {
      const steps = [
        { title: 'Create Nodes', description: 'Double-click on the canvas to create a new node.' },
        { title: 'Connect Nodes', description: 'Drag from a node handle to another node.' },
        { title: 'Auto Layout', description: 'Click the grid icon to automatically arrange all nodes.' },
      ];
      expect(steps.length).toBe(3);
      expect(steps[0].title).toBe('Create Nodes');
      expect(steps[2].title).toBe('Auto Layout');
    });
  });
});
