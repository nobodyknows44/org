import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import type { FieldDefinition, LayoutConfig, DiagramType, NodeStyleOverrides, EdgeMetadata, WorkspaceRole } from '@/types/database';
import { DEFAULT_LAYOUT_CONFIG } from '@/lib/constants';
import { wouldCreateCycle } from '@/lib/validation/cycleCheck';

// Custom node data type
export interface OrgNodeData extends Record<string, unknown> {
  fields: Record<string, unknown>;
  styleOverrides: NodeStyleOverrides;
}

// Tool modes for the floating canvas toolbar
export type CanvasToolMode = 'select' | 'addNode' | 'addText' | 'addSticky' | 'connect';

// Colors for sticky notes
export const STICKY_COLORS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FED7AA', '#E9D5FF', '#FECDD3'] as const;

export interface CanvasState {
  // Diagram metadata
  diagramId: string | null;
  diagramName: string;
  diagramType: DiagramType;
  fieldSchema: FieldDefinition[];
  layoutConfig: LayoutConfig;
  userRole: WorkspaceRole;

  // Tool mode
  activeTool: CanvasToolMode;

  // UI toggles
  showMinimap: boolean;
  snapToGrid: boolean;

  // React Flow state
  nodes: Node<OrgNodeData>[];
  edges: Edge[];

  // Selection
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // Undo/redo
  history: { nodes: Node<OrgNodeData>[]; edges: Edge[] }[];
  historyIndex: number;

  // Actions
  setDiagram: (id: string, name: string, type: DiagramType, schema: FieldDefinition[], config: LayoutConfig) => void;
  setDiagramName: (name: string) => void;
  setFieldSchema: (schema: FieldDefinition[]) => void;
  setLayoutConfig: (config: Partial<LayoutConfig>) => void;
  setUserRole: (role: WorkspaceRole) => void;

  // Tool mode
  setActiveTool: (tool: CanvasToolMode) => void;
  setShowMinimap: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;

  // Node operations
  addNode: (position: { x: number; y: number }, data?: Partial<OrgNodeData>) => string;
  addTextNode: (position: { x: number; y: number }, text?: string) => string;
  addStickyNode: (position: { x: number; y: number }, text?: string) => string;
  updateNodeData: (nodeId: string, data: Partial<OrgNodeData['fields']>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  deleteNodes: (nodeIds: string[]) => void;
  duplicateNode: (nodeId: string) => void;

  // Edge operations
  addEdgeConnection: (connection: Connection) => boolean;
  updateEdgeMetadata: (edgeId: string, metadata: Partial<EdgeMetadata>) => void;
  deleteEdges: (edgeIds: string[]) => void;

  // React Flow event handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Selection
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedEdgeIds: (ids: string[]) => void;

  // Bulk operations
  setNodes: (nodes: Node<OrgNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;

  // Undo/redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

export const useCanvasStore = create<CanvasState>()(
  immer((set, get) => ({
    // Initial state
    diagramId: null,
    diagramName: 'Untitled Diagram',
    diagramType: 'org_chart' as DiagramType,
    fieldSchema: [],
    layoutConfig: DEFAULT_LAYOUT_CONFIG,
    userRole: 'owner' as WorkspaceRole,
    activeTool: 'select' as CanvasToolMode,
    showMinimap: true,
    snapToGrid: true,
    nodes: [],
    edges: [],
    selectedNodeIds: [],
    selectedEdgeIds: [],
    history: [],
    historyIndex: -1,

    setDiagram: (id, name, type, schema, config) => {
      set((state) => {
        state.diagramId = id;
        state.diagramName = name;
        state.diagramType = type;
        state.fieldSchema = schema;
        state.layoutConfig = config;
        state.history = [];
        state.historyIndex = -1;
      });
    },

    setDiagramName: (name) => {
      set((state) => {
        state.diagramName = name;
      });
    },

    setFieldSchema: (schema) => {
      set((state) => {
        state.fieldSchema = schema;
      });
    },

    setLayoutConfig: (config) => {
      set((state) => {
        Object.assign(state.layoutConfig, config);
      });
    },

    setUserRole: (role) => {
      set((state) => {
        state.userRole = role;
      });
    },

    // Tool mode
    setActiveTool: (tool) => {
      set((state) => {
        state.activeTool = tool;
      });
    },

    setShowMinimap: (show) => {
      set((state) => {
        state.showMinimap = show;
      });
    },

    setSnapToGrid: (snap) => {
      set((state) => {
        state.snapToGrid = snap;
      });
    },

    // Node operations
    addNode: (position, data) => {
      const id = uuidv4();
      const { fieldSchema } = get();

      // Build default field values from schema
      const defaultFields: Record<string, unknown> = {};
      fieldSchema.forEach((field) => {
        defaultFields[field.id] = field.defaultValue || '';
      });

      get().pushHistory();

      set((state) => {
        state.nodes.push({
          id,
          type: state.diagramType === 'org_chart' ? 'orgChartNode' : 'ownershipNode',
          position,
          data: {
            fields: { ...defaultFields, ...data?.fields },
            styleOverrides: data?.styleOverrides || {},
          },
        });
      });

      return id;
    },

    addTextNode: (position, text) => {
      const id = uuidv4();
      get().pushHistory();
      set((state) => {
        state.nodes.push({
          id,
          type: 'textNode',
          position,
          data: {
            fields: { text: text || 'Double-click to edit' },
            styleOverrides: {},
          },
        });
      });
      return id;
    },

    addStickyNode: (position, text) => {
      const id = uuidv4();
      const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
      get().pushHistory();
      set((state) => {
        state.nodes.push({
          id,
          type: 'stickyNode',
          position,
          data: {
            fields: { text: text || '', color },
            styleOverrides: {},
          },
        });
      });
      return id;
    },

    updateNodeData: (nodeId, fieldUpdates) => {
      get().pushHistory();
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          Object.assign(node.data.fields, fieldUpdates);
        }
      });
    },

    updateNodePosition: (nodeId, position) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.position = position;
        }
      });
    },

    deleteNodes: (nodeIds) => {
      get().pushHistory();
      set((state) => {
        state.nodes = state.nodes.filter((n) => !nodeIds.includes(n.id));
        state.edges = state.edges.filter(
          (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
        );
        state.selectedNodeIds = state.selectedNodeIds.filter((id) => !nodeIds.includes(id));
      });
    },

    duplicateNode: (nodeId) => {
      const { nodes } = get();
      const sourceNode = nodes.find((n) => n.id === nodeId);
      if (!sourceNode) return;

      const newId = uuidv4();
      get().pushHistory();

      set((state) => {
        state.nodes.push({
          id: newId,
          type: sourceNode.type,
          position: {
            x: sourceNode.position.x + 50,
            y: sourceNode.position.y + 50,
          },
          data: {
            fields: { ...sourceNode.data.fields },
            styleOverrides: { ...sourceNode.data.styleOverrides },
          },
        });
      });
    },

    // Edge operations
    addEdgeConnection: (connection) => {
      const { diagramType, edges } = get();

      // Org chart: enforce single parent (target can only have one incoming edge)
      if (diagramType === 'org_chart') {
        const existingIncoming = edges.find((e) => e.target === connection.target);
        if (existingIncoming) {
          return false; // Reject: target already has a parent
        }
      }

      // Prevent self-loops
      if (connection.source === connection.target) return false;

      // DAG cycle detection for ownership mode
      if (diagramType === 'ownership') {
        if (wouldCreateCycle(edges, connection.source!, connection.target!)) {
          return false; // Reject: would create a cycle
        }
      }

      get().pushHistory();

      set((state) => {
        const newEdge: Edge = {
          id: uuidv4(),
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: state.diagramType === 'ownership' ? 'ownershipEdge' : 'smoothstep',
          data: { metadata: {} as EdgeMetadata },
        };
        state.edges.push(newEdge);
      });

      return true;
    },

    updateEdgeMetadata: (edgeId, metadata) => {
      get().pushHistory();
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (edge && edge.data) {
          Object.assign(edge.data.metadata as Record<string, unknown>, metadata);
        }
      });
    },

    deleteEdges: (edgeIds) => {
      get().pushHistory();
      set((state) => {
        state.edges = state.edges.filter((e) => !edgeIds.includes(e.id));
        state.selectedEdgeIds = state.selectedEdgeIds.filter((id) => !edgeIds.includes(id));
      });
    },

    // React Flow handlers
    onNodesChange: (changes) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes) as Node<OrgNodeData>[];
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges);
      });
    },

    onConnect: (connection) => {
      get().addEdgeConnection(connection);
    },

    // Selection
    setSelectedNodeIds: (ids) => {
      set((state) => {
        state.selectedNodeIds = ids;
      });
    },

    setSelectedEdgeIds: (ids) => {
      set((state) => {
        state.selectedEdgeIds = ids;
      });
    },

    // Bulk
    setNodes: (nodes) => {
      set((state) => {
        state.nodes = nodes;
      });
    },

    setEdges: (edges) => {
      set((state) => {
        state.edges = edges;
      });
    },

    // Undo/redo
    pushHistory: () => {
      set((state) => {
        const snapshot = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        };
        // Truncate forward history if we're not at the end
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        // Limit history size
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      });
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex < 0) return;

      const snapshot = history[historyIndex];
      set((state) => {
        // Save current state as the "redo" point if we're at the end
        if (state.historyIndex === state.history.length - 1) {
          state.history.push({
            nodes: JSON.parse(JSON.stringify(state.nodes)),
            edges: JSON.parse(JSON.stringify(state.edges)),
          });
        }
        state.nodes = snapshot.nodes;
        state.edges = snapshot.edges;
        state.historyIndex = historyIndex - 1;
      });
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex >= history.length - 1) return;

      const snapshot = history[historyIndex + 2] || history[historyIndex + 1];
      if (!snapshot) return;

      set((state) => {
        state.nodes = snapshot.nodes;
        state.edges = snapshot.edges;
        state.historyIndex = historyIndex + 1;
      });
    },

    canUndo: () => {
      return get().historyIndex >= 0;
    },

    canRedo: () => {
      const { historyIndex, history } = get();
      return historyIndex < history.length - 1;
    },
  }))
);
