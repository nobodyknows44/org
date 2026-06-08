'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Eye, X } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  listVersions,
  saveVersion,
  type VersionRecord,
  type DiagramSnapshot,
} from '@/lib/supabase/versionService';

interface VersionHistoryPanelProps {
  diagramId: string;
  onClose: () => void;
}

export function VersionHistoryPanel({ diagramId, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const { nodes, edges, fieldSchema, layoutConfig, setNodes, setEdges, setFieldSchema } =
    useCanvasStore();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listVersions(diagramId);
    setVersions(data);
    setLoading(false);
  }, [diagramId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSnapshot = useCallback(async () => {
    const snapshot: DiagramSnapshot = {
      nodes,
      edges,
      fieldSchema,
      layoutConfig,
    };
    await saveVersion(diagramId, snapshot, 'Manual snapshot');
    await load();
  }, [diagramId, nodes, edges, fieldSchema, layoutConfig, load]);

  const handleRestore = useCallback(
    async (version: VersionRecord) => {
      // Save current state as a version first
      const snapshot: DiagramSnapshot = {
        nodes,
        edges,
        fieldSchema,
        layoutConfig,
      };
      await saveVersion(diagramId, snapshot, 'Auto-save before restore');

      // Restore the selected version
      const s = version.snapshot;
      setNodes(s.nodes);
      setEdges(s.edges);
      if (s.fieldSchema) setFieldSchema(s.fieldSchema);
      setPreviewing(null);
      await load();
    },
    [diagramId, nodes, edges, fieldSchema, layoutConfig, setNodes, setEdges, setFieldSchema, load]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <aside className="w-72 border-l bg-background flex flex-col shrink-0">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Version History</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        <Button size="sm" variant="outline" className="w-full" onClick={handleSaveSnapshot}>
          Save Snapshot
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No versions saved yet.</p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className={`rounded-md border p-2 space-y-1 ${
                  previewing === version.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {formatDate(version.created_at)}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {version.label || 'Snapshot'}
                </Badge>
                <div className="flex gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs flex-1"
                    onClick={() => handleRestore(version)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
