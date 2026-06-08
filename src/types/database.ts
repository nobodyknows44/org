// Database types matching Supabase schema from PRD Section 4.2

export type DiagramType = 'org_chart' | 'ownership';
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';
export type EntityType = 'Holding' | 'Subsidiary' | 'JV' | 'SPV' | 'Trust' | 'Individual' | 'Other';

export type FieldType = 'text' | 'email' | 'select' | 'url' | 'number';

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  defaultValue?: string;
  options?: string[]; // For select type
  order: number;
}

export interface FieldVisibility {
  [fieldId: string]: boolean;
}

export interface LayoutConfig {
  direction: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';
  horizontalSpacing: number;
  verticalSpacing: number;
  nodeWidth: number;
  nodeHeight: number;
  fieldVisibility: FieldVisibility;
  compactMode: boolean;
}

export interface NodeStyleOverrides {
  color?: string;
  borderColor?: string;
  shape?: 'rectangle' | 'rounded' | 'pill';
  pinned?: boolean;
  collapsed?: boolean;
  fieldVisibilityOverrides?: FieldVisibility;
  /** Override the layout direction for this node's subtree */
  subtreeDirection?: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';
}

export interface EdgeMetadata {
  ownership_pct?: number;
  share_class?: string;
  voting_rights?: boolean;
  effective_date?: string;
}

// --- Database Row Types ---

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Diagram {
  id: string;
  workspace_id: string;
  name: string;
  type: DiagramType;
  field_schema: FieldDefinition[];
  layout_config: LayoutConfig;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DiagramNode {
  id: string;
  diagram_id: string;
  parent_ids: string[];
  data: Record<string, unknown>;
  position_x: number;
  position_y: number;
  style_overrides: NodeStyleOverrides;
  created_at: string;
  updated_at: string;
}

export interface DiagramEdge {
  id: string;
  diagram_id: string;
  source_node_id: string;
  target_node_id: string;
  metadata: EdgeMetadata;
  created_at: string;
  updated_at: string;
}

export interface DiagramVersion {
  id: string;
  diagram_id: string;
  snapshot: {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    field_schema: FieldDefinition[];
    layout_config: LayoutConfig;
  };
  created_by: string;
  created_at: string;
  label?: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface ShareLink {
  id: string;
  diagram_id: string;
  share_id: string;
  password_hash: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  diagram_id: string;
  user_id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// --- Supabase Database Type Map ---

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Workspace, 'id' | 'created_at'>>;
      };
      diagrams: {
        Row: Diagram;
        Insert: Omit<Diagram, 'id' | 'created_at' | 'updated_at' | 'version'>;
        Update: Partial<Omit<Diagram, 'id' | 'created_at'>>;
      };
      nodes: {
        Row: DiagramNode;
        Insert: Omit<DiagramNode, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DiagramNode, 'id' | 'created_at'>>;
      };
      edges: {
        Row: DiagramEdge;
        Insert: Omit<DiagramEdge, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DiagramEdge, 'id' | 'created_at'>>;
      };
      diagram_versions: {
        Row: DiagramVersion;
        Insert: Omit<DiagramVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<DiagramVersion, 'id' | 'created_at'>>;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Omit<WorkspaceMember, 'created_at'>;
        Update: Partial<Omit<WorkspaceMember, 'created_at'>>;
      };
      share_links: {
        Row: ShareLink;
        Insert: Omit<ShareLink, 'id' | 'created_at'>;
        Update: Partial<Omit<ShareLink, 'id' | 'created_at'>>;
      };
      activity_log: {
        Row: ActivityLogEntry;
        Insert: Omit<ActivityLogEntry, 'id' | 'created_at'>;
        Update: never;
      };
    };
    Enums: {
      diagram_type: DiagramType;
      workspace_role: WorkspaceRole;
    };
  };
}
