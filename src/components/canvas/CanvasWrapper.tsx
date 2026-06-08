'use client';

import { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  BackgroundVariant,
  type ReactFlowInstance,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '@/stores/canvasStore';
import { OrgChartNode } from './OrgChartNode';
import { OwnershipNode } from './OwnershipNode';
import { OwnershipEdge } from './OwnershipEdge';
import { TextNode } from './TextNode';
import { StickyNode } from './StickyNode';
import { NodeContextMenu } from './NodeContextMenu';
import { BreadcrumbNav } from './BreadcrumbNav';
import { getHiddenNodeIds } from '@/lib/layout/treeUtils';
import { useAlignmentGuides, AlignmentGuidesOverlay } from './AlignmentGuides';

const nodeTypes = {
  orgChartNode: OrgChartNode,
  ownershipNode: OwnershipNode,
  textNode: TextNode,
  stickyNode: StickyNode,
};

const edgeTypes = {
  ownershipEdge: OwnershipEdge,
};

export function CanvasWrapper() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addTextNode,
    addStickyNode,
    setSelectedNodeIds,
    setSelectedEdgeIds,
    diagramType,
    activeTool,
    setActiveTool,
    showMinimap,
    snapToGrid,
  } = useCanvasStore();

  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Alignment guides for drag snapping
  const { guideLines, onNodeDrag, onNodeDragStop } = useAlignmentGuides();

  // Compute hidden nodes from collapsed subtrees
  const hiddenIds = useMemo(() => getHiddenNodeIds(nodes, edges), [nodes, edges]);
  const visibleNodes = useMemo(() => nodes.filter((n) => !hiddenIds.has(n.id)), [nodes, hiddenIds]);
  const visibleEdges = useMemo(
    () => edges.filter((e) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target)),
    [edges, hiddenIds]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!reactFlowInstance.current) return;
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      // Default double-click always adds a diagram node
      addNode(position);
    },
    [addNode]
  );

  // Single click on pane — used when a placement tool is active
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!reactFlowInstance.current) return;
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (activeTool === 'addNode') {
        addNode(position);
        setActiveTool('select'); // Return to select after placing
      } else if (activeTool === 'addText') {
        addTextNode(position);
        setActiveTool('select');
      } else if (activeTool === 'addSticky') {
        addStickyNode(position);
        setActiveTool('select');
      }
    },
    [activeTool, addNode, addTextNode, addStickyNode, setActiveTool]
  );

  // Drag-and-drop support for node palette
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeType = event.dataTransfer.getData('application/orgcanvas-node');
      if (nodeType === 'text') {
        addTextNode(position);
      } else if (nodeType === 'sticky') {
        addStickyNode(position);
      } else if (nodeType) {
        addNode(position);
      }
    },
    [addNode, addTextNode, addStickyNode]
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: any[]; edges: any[] }) => {
      setSelectedNodeIds(selectedNodes.map((n) => n.id));
      setSelectedEdgeIds(selectedEdges.map((e) => e.id));
    },
    [setSelectedNodeIds, setSelectedEdgeIds]
  );

  const handleInit = useCallback((instance: any) => {
    reactFlowInstance.current = instance;
  }, []);

  // Cursor style based on active tool
  const canvasCursor = activeTool === 'select' ? 'default' : 'crosshair';

  return (
    <div className="flex-1 relative h-full w-full" style={{ cursor: canvasCursor }}>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={handleInit}
        onDoubleClick={handleDoubleClick}
        onPaneClick={handlePaneClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Control"
        selectionKeyCode="Control"
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={4}
        onlyRenderVisibleElements
        defaultEdgeOptions={{
          type: diagramType === 'ownership' ? 'ownershipEdge' : 'smoothstep',
          animated: false,
        }}
      >
        <Controls position="bottom-left" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        {showMinimap && (
          <MiniMap
            position="bottom-right"
            zoomable
            pannable
            className="!bg-background/80 !border !border-border !rounded-lg"
          />
        )}
        {/* Alignment guide lines rendered in flow viewport coordinates */}
        {guideLines.length > 0 && (
          <Panel position="top-left" className="!m-0 !p-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            <AlignmentGuidesOverlay lines={guideLines} />
          </Panel>
        )}
      </ReactFlow>
      <BreadcrumbNav />
      <NodeContextMenu />
    </div>
  );
}
