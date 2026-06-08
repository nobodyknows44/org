-- OrgCanvas Initial Schema Migration
-- Phase 0: Core tables for workspaces, diagrams, nodes, edges, versions, members

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE diagram_type AS ENUM ('org_chart', 'ownership');
CREATE TYPE workspace_role AS ENUM ('owner', 'editor', 'viewer');

-- ============================================
-- WORKSPACES
-- ============================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- DIAGRAMS
-- ============================================
CREATE TABLE diagrams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type diagram_type NOT NULL DEFAULT 'org_chart',
  field_schema JSONB DEFAULT '[]'::jsonb,
  layout_config JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- NODES
-- ============================================
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  parent_ids UUID[] DEFAULT '{}',
  data JSONB DEFAULT '{}'::jsonb,
  position_x DOUBLE PRECISION DEFAULT 0,
  position_y DOUBLE PRECISION DEFAULT 0,
  style_overrides JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- EDGES
-- ============================================
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- DIAGRAM VERSIONS
-- ============================================
CREATE TABLE diagram_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  label TEXT
);

-- ============================================
-- WORKSPACE MEMBERS
-- ============================================
CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================
-- SHARE LINKS
-- ============================================
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  share_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_diagrams_workspace_id ON diagrams(workspace_id);
CREATE INDEX idx_nodes_diagram_id ON nodes(diagram_id);
CREATE INDEX idx_edges_diagram_id ON edges(diagram_id);
CREATE INDEX idx_edges_source_node_id ON edges(source_node_id);
CREATE INDEX idx_edges_target_node_id ON edges(target_node_id);
CREATE INDEX idx_diagram_versions_diagram_id ON diagram_versions(diagram_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_share_links_share_id ON share_links(share_id);
CREATE INDEX idx_activity_log_diagram_id ON activity_log(diagram_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagrams_updated_at BEFORE UPDATE ON diagrams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edges_updated_at BEFORE UPDATE ON edges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can view workspaces they are members of" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Only owners can update workspaces" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Only owners can delete workspaces" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Owners can manage workspace members" ON workspace_members
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Diagram policies
CREATE POLICY "Members can view diagrams in their workspaces" ON diagrams
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Editors and owners can create diagrams" ON diagrams
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Editors and owners can update diagrams" ON diagrams
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Editors and owners can delete diagrams" ON diagrams
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Node policies (inherit from diagram access)
CREATE POLICY "Members can view nodes" ON nodes
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Editors can manage nodes" ON nodes
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

-- Edge policies (inherit from diagram access)
CREATE POLICY "Members can view edges" ON edges
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Editors can manage edges" ON edges
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

-- Version policies
CREATE POLICY "Members can view versions" ON diagram_versions
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Editors can create versions" ON diagram_versions
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Share links policies
CREATE POLICY "Editors can manage share links" ON share_links
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can view valid share links" ON share_links
  FOR SELECT USING (
    (expires_at IS NULL OR expires_at > now())
  );

-- Activity log policies
CREATE POLICY "Members can view activity log" ON activity_log
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "System can insert activity log" ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
