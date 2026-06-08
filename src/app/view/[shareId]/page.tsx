'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider, ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbNodesToFlow, dbEdgesToFlow } from '@/lib/supabase/diagramService';
import { OrgChartNode } from '@/components/canvas/OrgChartNode';
import { OwnershipNode } from '@/components/canvas/OwnershipNode';
import { OwnershipEdge } from '@/components/canvas/OwnershipEdge';
import type { DiagramType } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const nodeTypes = { orgChartNode: OrgChartNode, ownershipNode: OwnershipNode };
const edgeTypes = { ownershipEdge: OwnershipEdge };

interface ShareData {
  diagram_id: string;
  password_hash: string | null;
}

export default function SharedViewPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [diagramName, setDiagramName] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  const loadDiagram = async (shareData: ShareData) => {
    try {
      const supabase = createBrowserClient();

      // Load diagram metadata
      const { data: diagram } = (await supabase
        .from('diagrams')
        .select('*')
        .eq('id', shareData.diagram_id)
        .single()) as unknown as { data: any };

      if (!diagram) {
        setError('Diagram not found');
        return;
      }

      setDiagramName(diagram.name);

      // Load nodes
      const { data: dbNodes } = (await supabase
        .from('nodes')
        .select('*')
        .eq('diagram_id', shareData.diagram_id)
        .order('created_at')) as unknown as { data: any[] };

      // Load edges
      const { data: dbEdges } = (await supabase
        .from('edges')
        .select('*')
        .eq('diagram_id', shareData.diagram_id)) as unknown as { data: any[] };

      const diagramType = diagram.type as DiagramType;
      setNodes(dbNodesToFlow(dbNodes || [], diagramType));
      setEdges(dbEdgesToFlow(dbEdges || [], diagramType));
    } catch (err: any) {
      setError(err.message || 'Failed to load diagram');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const supabase = createBrowserClient();
        const { data } = (await supabase
          .from('share_links')
          .select('diagram_id, password_hash')
          .eq('share_id', shareId)
          .single()) as unknown as { data: ShareData | null };

        if (!data) {
          setError('Share link not found or expired');
          setLoading(false);
          return;
        }

        if (data.password_hash) {
          setNeedsPassword(true);
          setLoading(false);
          // Store shareData for later use after password verification
          (window as any).__shareData = data;
          return;
        }

        await loadDiagram(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const handlePasswordSubmit = async () => {
    const shareData = (window as any).__shareData as ShareData | undefined;
    if (!shareData) return;

    // Simple password check — in production use bcrypt comparison on server
    if (passwordInput.trim() !== shareData.password_hash) {
      setError('Incorrect password');
      return;
    }

    setNeedsPassword(false);
    setError(null);
    setLoading(true);
    await loadDiagram(shareData);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading shared diagram...</p>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-80 space-y-4 text-center">
          <h2 className="text-lg font-semibold">Password Required</h2>
          <p className="text-sm text-muted-foreground">This diagram is password-protected.</p>
          <Input
            type="password"
            placeholder="Enter password..."
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasswordSubmit();
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handlePasswordSubmit}>
            View Diagram
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-destructive">Error: {error}</p>
          <p className="text-sm text-muted-foreground">The share link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-10 border-b bg-background px-4 flex items-center shrink-0">
        <span className="text-sm font-medium">{diagramName}</span>
        <span className="ml-2 text-xs text-muted-foreground">(View Only)</span>
      </header>
      <div className="flex-1">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable={false} zoomable={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
