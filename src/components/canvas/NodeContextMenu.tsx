'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Copy, Trash2, Pin, PinOff, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { NodeFieldVisibilityDialog } from './NodeFieldVisibilityDialog';

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string | null;
}

export function NodeContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { duplicateNode, deleteNodes, nodes, setNodes } = useCanvasStore();

  // Listen for custom context menu event
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId) {
        setMenu({ x: detail.x, y: detail.y, nodeId: detail.nodeId });
      }
    };

    window.addEventListener('node-context-menu', handleContextMenu);
    return () => window.removeEventListener('node-context-menu', handleContextMenu);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!menu) return;
    const handleClick = () => setMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [menu]);

  const handleDuplicate = useCallback(() => {
    if (menu?.nodeId) {
      duplicateNode(menu.nodeId);
    }
    setMenu(null);
  }, [menu, duplicateNode]);

  const handleDelete = useCallback(() => {
    if (menu?.nodeId) {
      deleteNodes([menu.nodeId]);
    }
    setMenu(null);
  }, [menu, deleteNodes]);

  const handleTogglePin = useCallback(() => {
    if (!menu?.nodeId) return;
    setNodes(
      nodes.map((n) =>
        n.id === menu.nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                styleOverrides: {
                  ...n.data.styleOverrides,
                  pinned: !n.data.styleOverrides?.pinned,
                },
              },
            }
          : n
      )
    );
    setMenu(null);
  }, [menu, nodes, setNodes]);

  const handleToggleCollapse = useCallback(() => {
    if (!menu?.nodeId) return;
    setNodes(
      nodes.map((n) =>
        n.id === menu.nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                styleOverrides: {
                  ...n.data.styleOverrides,
                  collapsed: !n.data.styleOverrides?.collapsed,
                },
              },
            }
          : n
      )
    );
    setMenu(null);
  }, [menu, nodes, setNodes]);

  const [fieldVisNodeId, setFieldVisNodeId] = useState<string | null>(null);

  const handleFieldVisibility = useCallback(() => {
    if (menu?.nodeId) {
      setFieldVisNodeId(menu.nodeId);
    }
    setMenu(null);
  }, [menu]);

  if (!menu && !fieldVisNodeId) return null;

  const currentNode = menu ? nodes.find((n) => n.id === menu.nodeId) : null;
  const isPinned = currentNode?.data.styleOverrides?.pinned;
  const isCollapsed = currentNode?.data.styleOverrides?.collapsed;

  return (
    <>
      {menu && (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="flex items-center w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={handleDuplicate}
      >
        <Copy className="h-3.5 w-3.5 mr-2" />
        Duplicate
      </button>
      <button
        className="flex items-center w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={handleTogglePin}
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5 mr-2" /> : <Pin className="h-3.5 w-3.5 mr-2" />}
        {isPinned ? 'Unpin' : 'Pin (exclude from layout)'}
      </button>
      <button
        className="flex items-center w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={handleToggleCollapse}
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 mr-2" /> : <ChevronDown className="h-3.5 w-3.5 mr-2" />}
        {isCollapsed ? 'Expand Subtree' : 'Collapse Subtree'}
      </button>
      <button
        className="flex items-center w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={handleFieldVisibility}
      >
        <Eye className="h-3.5 w-3.5 mr-2" />
        Field Visibility
      </button>
      <div className="h-px bg-border my-1" />
      <button
        className="flex items-center w-full rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5 mr-2" />
        Delete
      </button>
    </div>
      )}
      {fieldVisNodeId && (
        <NodeFieldVisibilityDialog
          open={!!fieldVisNodeId}
          onOpenChange={(open) => { if (!open) setFieldVisNodeId(null); }}
          nodeId={fieldVisNodeId}
        />
      )}
    </>
  );
}
