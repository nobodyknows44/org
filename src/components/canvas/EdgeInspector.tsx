'use client';

import { useCanvasStore } from '@/stores/canvasStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X, Trash2 } from 'lucide-react';
import type { EdgeMetadata } from '@/types/database';
import type { OrgNodeData } from '@/stores/canvasStore';

interface EdgeInspectorProps {
  onClose: () => void;
}

export function EdgeInspector({ onClose }: EdgeInspectorProps) {
  const { edges, selectedEdgeIds, updateEdgeMetadata, deleteEdges, nodes, diagramType } = useCanvasStore();

  const selectedEdge = edges.find((e) => selectedEdgeIds.includes(e.id));

  if (!selectedEdge || diagramType !== 'ownership') return null;

  const metadata = ((selectedEdge.data as Record<string, unknown>)?.metadata || {}) as EdgeMetadata;
  const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
  const targetNode = nodes.find((n) => n.id === selectedEdge.target);

  const sourceName =
    sourceNode
      ? Object.values((sourceNode.data as unknown as OrgNodeData).fields || {}).find((v) => typeof v === 'string' && v.length > 0) || 'Node'
      : 'Unknown';
  const targetName =
    targetNode
      ? Object.values((targetNode.data as unknown as OrgNodeData).fields || {}).find((v) => typeof v === 'string' && v.length > 0) || 'Node'
      : 'Unknown';

  const handleUpdate = (field: keyof EdgeMetadata, value: unknown) => {
    updateEdgeMetadata(selectedEdge.id, { [field]: value });
  };

  return (
    <aside className="w-72 border-l bg-background p-4 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Edge Properties</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Relationship info */}
      <div className="text-xs text-muted-foreground mb-4">
        <span className="font-medium text-foreground">{String(sourceName)}</span>
        <span className="mx-1">→</span>
        <span className="font-medium text-foreground">{String(targetName)}</span>
      </div>

      <Separator className="mb-4" />

      {/* Ownership Percentage */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs">Ownership %</Label>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={metadata.ownership_pct ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
            handleUpdate('ownership_pct', val);
          }}
          className="h-8 text-sm"
          placeholder="0-100"
        />
      </div>

      {/* Share Class */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs">Share Class</Label>
        <Input
          type="text"
          value={metadata.share_class ?? ''}
          onChange={(e) => handleUpdate('share_class', e.target.value || undefined)}
          className="h-8 text-sm"
          placeholder="e.g., Ordinary, Preferred A"
        />
      </div>

      {/* Voting Rights */}
      <div className="flex items-center justify-between mb-4">
        <Label className="text-xs">Voting Rights</Label>
        <Switch
          checked={metadata.voting_rights ?? false}
          onCheckedChange={(v) => handleUpdate('voting_rights', v)}
        />
      </div>

      {/* Effective Date */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs">Effective Date</Label>
        <Input
          type="date"
          value={metadata.effective_date ?? ''}
          onChange={(e) => handleUpdate('effective_date', e.target.value || undefined)}
          className="h-8 text-sm"
        />
      </div>

      <Separator className="my-4" />

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => deleteEdges([selectedEdge.id])}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Delete Edge
      </Button>
    </aside>
  );
}
