'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import type { OrgNodeData } from '@/stores/canvasStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Filter } from 'lucide-react';

interface FilterPanelProps {
  onClose: () => void;
}

type FilterState = Record<string, Set<string>>;

export function FilterPanel({ onClose }: FilterPanelProps) {
  const { nodes, diagramType, fieldSchema } = useCanvasStore();
  const [activeFilters, setActiveFilters] = useState<FilterState>({});

  // Build a mapping from display label to schema field ID
  const labelToFieldId = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fieldSchema) {
      map.set(f.label.toLowerCase().replace(/\s+/g, '_'), f.id);
    }
    return map;
  }, [fieldSchema]);

  // Dynamically extract filterable field values from all nodes
  const filterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    const filterLabels = diagramType === 'org_chart'
      ? ['Department', 'Title']
      : ['Entity Type', 'Jurisdiction'];

    for (const node of nodes) {
      const nodeData = node.data as unknown as OrgNodeData;
      const fields = nodeData?.fields;
      if (!fields) continue;
      for (const label of filterLabels) {
        const fieldDef = fieldSchema.find((f) => f.label === label);
        if (!fieldDef) continue;
        const value = fields[fieldDef.id];
        if (typeof value === 'string' && value.trim()) {
          const key = label.toLowerCase().replace(/\s+/g, '_');
          if (!options[key]) options[key] = new Set();
          options[key].add(value.trim());
        }
      }
    }
    return options;
  }, [nodes, diagramType, fieldSchema]);

  // Apply filters to canvas store nodes via opacity
  const applyFilters = useCallback(() => {
    const { nodes, setNodes } = useCanvasStore.getState();
    const hasFilters = Object.values(activeFilters).some((s) => s.size > 0);

    const updated = nodes.map((node) => {
      if (!hasFilters) {
        return { ...node, style: { ...node.style, opacity: 1 } };
      }

      const nodeData = node.data as unknown as OrgNodeData;
      const fields = nodeData?.fields;
      let matches = true;

      for (const [filterKey, allowedValues] of Object.entries(activeFilters)) {
        if (allowedValues.size === 0) continue;
        // Resolve the display key back to the schema field ID
        const fieldId = labelToFieldId.get(filterKey);
        if (!fieldId) { matches = false; break; }
        const nodeValue = fields?.[fieldId];
        if (typeof nodeValue !== 'string' || !allowedValues.has(nodeValue.trim())) {
          matches = false;
          break;
        }
      }

      return { ...node, style: { ...node.style, opacity: matches ? 1 : 0.2 } };
    });

    setNodes(updated);
  }, [activeFilters, labelToFieldId]);

  const toggleFilter = useCallback(
    (field: string, value: string) => {
      setActiveFilters((prev) => {
        const next = { ...prev };
        const set = new Set(next[field] ?? []);
        if (set.has(value)) {
          set.delete(value);
        } else {
          set.add(value);
        }
        next[field] = set;
        return next;
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    setActiveFilters({});
    // Reset all opacities
    const { nodes, setNodes } = useCanvasStore.getState();
    setNodes(nodes.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })));
  }, []);

  // Apply filters whenever they change
  useEffect(() => {
    applyFilters();
  }, [activeFilters, applyFilters]);

  const totalActiveCount = Object.values(activeFilters).reduce((sum, s) => sum + s.size, 0);

  return (
    <div className="w-64 border-r bg-background flex flex-col shrink-0">
      <div className="h-10 px-3 flex items-center justify-between border-b shrink-0">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
          {totalActiveCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalActiveCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {totalActiveCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
              Clear
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        {Object.entries(filterOptions).map(([field, values]) => (
          <div key={field} className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
              {field.replace(/_/g, ' ')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(values)
                .sort()
                .map((value) => {
                  const isActive = activeFilters[field]?.has(value) ?? false;
                  return (
                    <Badge
                      key={value}
                      variant={isActive ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleFilter(field, value)}
                    >
                      {value}
                    </Badge>
                  );
                })}
            </div>
          </div>
        ))}
        {Object.keys(filterOptions).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No filterable data found. Add nodes with department, location, or entity type fields.
          </p>
        )}
      </ScrollArea>
    </div>
  );
}
