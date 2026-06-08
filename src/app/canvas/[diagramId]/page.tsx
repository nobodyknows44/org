'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { CanvasWrapper } from '@/components/canvas/CanvasWrapper';
import { Topbar } from '@/components/canvas/Topbar';
import { NodeInspector } from '@/components/canvas/NodeInspector';
import { EdgeInspector } from '@/components/canvas/EdgeInspector';
import { LeftSidebar } from '@/components/canvas/LeftSidebar';
import { ExcelImportWizard } from '@/components/canvas/ExcelImportWizard';
import { ExportDialog } from '@/components/canvas/ExportDialog';
import { SearchBar } from '@/components/canvas/SearchBar';
import { ShareDialog } from '@/components/canvas/ShareDialog';
import { VersionHistoryPanel } from '@/components/canvas/VersionHistoryPanel';
import { CollaboratorsPanel } from '@/components/canvas/CollaboratorsPanel';
import { CursorOverlay } from '@/components/canvas/CursorOverlay';
import { WorkspaceMembersPanel } from '@/components/workspace/WorkspaceMembersPanel';
import { FilterPanel } from '@/components/canvas/FilterPanel';
import { OnboardingOverlay } from '@/components/canvas/OnboardingOverlay';
import { TemplateGallery } from '@/components/canvas/TemplateGallery';
import { BulkEditDialog } from '@/components/canvas/BulkEditDialog';
import { PresentationMode } from '@/components/canvas/PresentationMode';
import { CommentsPanel } from '@/components/canvas/CommentsPanel';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import {
  loadDiagram,
  dbNodesToFlow,
  dbEdgesToFlow,
  bulkSaveNodes,
  bulkSaveEdges,
  updateDiagramMeta,
} from '@/lib/supabase/diagramService';
import { saveVersion } from '@/lib/supabase/versionService';
import { computeLayout } from '@/lib/layout/layoutEngine';
import type { LayoutConfig, FieldDefinition } from '@/types/database';

export default function CanvasPage() {
  const params = useParams();
  const diagramId = params.diagramId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const lastAutoVersionRef = useRef<number>(Date.now());

  const {
    setDiagram,
    setNodes,
    setEdges,
    nodes,
    edges,
    selectedNodeIds,
    selectedEdgeIds,
    diagramName,
    fieldSchema,
    layoutConfig,
    undo,
    redo,
    deleteNodes,
    duplicateNode,
    updateNodePosition,
    userRole,
  } = useCanvasStore();

  const canEdit = userRole === 'owner' || userRole === 'editor';
  const isOwner = userRole === 'owner';

  // Real-time collaboration
  const { cursors, onlineUsers, broadcastNodeMove, broadcastNodeUpdate, broadcastCursor, CURSOR_COLORS } =
    useRealtimeCollaboration(loading ? null : diagramId);

  // Auto-save version snapshot every 5 minutes
  useEffect(() => {
    if (loading || !diagramId) return;
    const interval = setInterval(() => {
      const { nodes, edges, fieldSchema, layoutConfig } = useCanvasStore.getState();
      if (nodes.length === 0) return;
      saveVersion(diagramId, { nodes, edges, fieldSchema, layoutConfig }, 'Auto-save').catch(console.error);
      lastAutoVersionRef.current = Date.now();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loading, diagramId]);

  // Save version on major actions helper
  const saveActionVersion = useCallback(
    (label: string) => {
      const { nodes, edges, fieldSchema, layoutConfig } = useCanvasStore.getState();
      saveVersion(diagramId, { nodes, edges, fieldSchema, layoutConfig }, label).catch(console.error);
    },
    [diagramId]
  );

  // Load diagram from DB
  useEffect(() => {
    async function load() {
      try {
        const { diagram, nodes: dbNodes, edges: dbEdges } = await loadDiagram(diagramId);
        setDiagram(
          diagram.id,
          diagram.name,
          diagram.type,
          diagram.field_schema as unknown as FieldDefinition[],
          diagram.layout_config as unknown as LayoutConfig
        );
        setNodes(dbNodesToFlow(dbNodes, diagram.type));
        setEdges(dbEdgesToFlow(dbEdges, diagram.type));
      } catch (err: any) {
        console.error('Failed to load diagram:', err);
        setError(err.message || 'Failed to load diagram');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [diagramId, setDiagram, setNodes, setEdges]);

  // Auto-save: debounced save on changes (only for editors/owners)
  useEffect(() => {
    if (loading || !diagramId || !canEdit) return;

    const timer = setTimeout(() => {
      bulkSaveNodes(diagramId, nodes);
      bulkSaveEdges(diagramId, edges);
      updateDiagramMeta(diagramId, {
        name: diagramName,
        field_schema: fieldSchema as any,
        layout_config: layoutConfig as any,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodes, edges, diagramId, diagramName, fieldSchema, layoutConfig, loading, canEdit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Undo (edit-only)
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey && canEdit) {
        e.preventDefault();
        undo();
      }
      // Redo (edit-only)
      if (e.ctrlKey && e.shiftKey && e.key === 'Z' && canEdit) {
        e.preventDefault();
        redo();
      }
      // Search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Tool shortcuts (only when not using Ctrl)
      if (!e.ctrlKey && !e.shiftKey && !e.altKey && canEdit) {
        const store = useCanvasStore.getState();
        switch (e.key.toLowerCase()) {
          case 'v':
            store.setActiveTool('select');
            return;
          case 'n':
            store.setActiveTool('addNode');
            return;
          case 't':
            store.setActiveTool('addText');
            return;
          case 's':
            store.setActiveTool('addSticky');
            return;
          case 'c':
            store.setActiveTool('connect');
            return;
          case 'm':
            store.setShowMinimap(!store.showMinimap);
            return;
          case 'escape':
            store.setActiveTool('select');
            return;
        }
      }
      // Delete selected nodes (edit-only)
      if ((e.key === 'Delete' || e.key === 'Backspace') && canEdit) {
        const { selectedNodeIds } = useCanvasStore.getState();
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          deleteNodes(selectedNodeIds);
        }
      }
      // Duplicate (edit-only)
      if (e.ctrlKey && e.key === 'd' && canEdit) {
        e.preventDefault();
        const { selectedNodeIds } = useCanvasStore.getState();
        selectedNodeIds.forEach((id) => duplicateNode(id));
      }
      // Arrow keys nudge (edit-only)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && canEdit) {
        const { selectedNodeIds, nodes } = useCanvasStore.getState();
        if (selectedNodeIds.length === 0) return;
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        selectedNodeIds.forEach((id) => {
          const node = nodes.find((n) => n.id === id);
          if (!node) return;
          const newPos = { ...node.position };
          if (e.key === 'ArrowUp') newPos.y -= delta;
          if (e.key === 'ArrowDown') newPos.y += delta;
          if (e.key === 'ArrowLeft') newPos.x -= delta;
          if (e.key === 'ArrowRight') newPos.x += delta;
          updateNodePosition(id, newPos);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteNodes, duplicateNode, updateNodePosition, canEdit]);

  const handleAutoLayout = useCallback(async () => {
    const { nodes, edges, layoutConfig, diagramType, setNodes } = useCanvasStore.getState();
    const laid = await computeLayout(nodes, edges, layoutConfig, diagramType);
    setNodes(laid);
    saveActionVersion('Auto-layout');
  }, [saveActionVersion]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading diagram...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <p className="text-destructive">Error: {error}</p>
          <p className="text-sm text-muted-foreground">Make sure the diagram exists and you have access.</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Topbar
        onAutoLayout={canEdit ? handleAutoLayout : () => {}}
        onSearch={() => setSearchOpen(true)}
        onShare={() => setShareOpen(true)}
        onToggleLeftSidebar={canEdit ? () => setLeftSidebarOpen(!leftSidebarOpen) : () => {}}
        onVersionHistory={() => setVersionPanelOpen(!versionPanelOpen)}
        onManageMembers={isOwner ? () => setMembersOpen(true) : undefined}
        onFilter={() => setFilterPanelOpen(!filterPanelOpen)}
        onBulkEdit={canEdit && selectedNodeIds.length > 1 ? () => setBulkEditOpen(true) : undefined}
        collaboratorsSlot={
          <CollaboratorsPanel onlineUsers={onlineUsers} cursorColors={CURSOR_COLORS} />
        }
      />
      <div className="flex flex-1 overflow-hidden relative">
        {canEdit && leftSidebarOpen && (
          <LeftSidebar onClose={() => setLeftSidebarOpen(false)} />
        )}
        {versionPanelOpen && (
          <VersionHistoryPanel
            diagramId={diagramId}
            onClose={() => setVersionPanelOpen(false)}
          />
        )}
        {filterPanelOpen && (
          <FilterPanel onClose={() => setFilterPanelOpen(false)} />
        )}
        <div className="relative flex-1">
          <CanvasWrapper />
          <CursorOverlay cursors={cursors} />
          {canEdit && (
            <CanvasToolbar
              onTemplates={() => setTemplateGalleryOpen(true)}
              onComments={() => setCommentsOpen(true)}
              onImport={() => setImportOpen(true)}
              onExport={() => setExportOpen(true)}
              onPresentationMode={() => setPresentationOpen(true)}
            />
          )}
        </div>
        {canEdit && inspectorOpen && selectedNodeIds.length > 0 && (
          <NodeInspector onClose={() => setInspectorOpen(false)} onAutoLayout={handleAutoLayout} />
        )}
        {canEdit && inspectorOpen && selectedEdgeIds.length > 0 && selectedNodeIds.length === 0 && (
          <EdgeInspector onClose={() => setInspectorOpen(false)} />
        )}
        <SearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
      <ExcelImportWizard open={importOpen} onOpenChange={(open) => {
        setImportOpen(open);
        if (!open) saveActionVersion('Import');
      }} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} diagramId={diagramId} />
      <WorkspaceMembersPanel open={membersOpen} onOpenChange={setMembersOpen} workspaceId="" />
      <TemplateGallery
        open={templateGalleryOpen}
        onOpenChange={setTemplateGalleryOpen}
        onApply={(result, template) => {
          // Must update field schema + layout config to match template's field IDs,
          // otherwise node data keys won't match the schema and fields render empty.
          const store = useCanvasStore.getState();
          store.setFieldSchema(result.fieldSchema);
          store.setLayoutConfig(result.layoutConfig);
          // Update diagram type if template type differs
          if (template.type !== store.diagramType) {
            store.setDiagram(
              store.diagramId!,
              store.diagramName,
              template.type,
              result.fieldSchema,
              result.layoutConfig
            );
          }
          setNodes(result.nodes as any);
          setEdges(result.edges as any);
          saveActionVersion('Template applied');
        }}
      />
      <BulkEditDialog open={bulkEditOpen} onOpenChange={setBulkEditOpen} />
      <PresentationMode open={presentationOpen} onClose={() => setPresentationOpen(false)} />
      <CommentsPanel diagramId={diagramId} open={commentsOpen} onOpenChange={setCommentsOpen} />
      <OnboardingOverlay />
      </div>
    </ReactFlowProvider>
  );
}
