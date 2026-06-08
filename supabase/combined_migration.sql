-- ==========================================================
-- OrgCanvas Combined Migration Script
-- Run this in the Supabase SQL Editor
-- ==========================================================

-- ============================================
-- MIGRATION 1: Initial Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
DO $$ BEGIN
  CREATE TYPE diagram_type AS ENUM ('org_chart', 'ownership');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- DIAGRAMS
CREATE TABLE IF NOT EXISTS diagrams (
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

-- NODES
CREATE TABLE IF NOT EXISTS nodes (
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

-- EDGES
CREATE TABLE IF NOT EXISTS edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- DIAGRAM VERSIONS
CREATE TABLE IF NOT EXISTS diagram_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  label TEXT
);

-- WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

-- SHARE LINKS
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  share_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- INDEXES (from migration 1)
CREATE INDEX IF NOT EXISTS idx_diagrams_workspace_id ON diagrams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_nodes_diagram_id ON nodes(diagram_id);
CREATE INDEX IF NOT EXISTS idx_edges_diagram_id ON edges(diagram_id);
CREATE INDEX IF NOT EXISTS idx_edges_source_node_id ON edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target_node_id ON edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_diagram_versions_diagram_id ON diagram_versions(diagram_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_share_id ON share_links(share_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_diagram_id ON activity_log(diagram_id);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_diagrams_updated_at BEFORE UPDATE ON diagrams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_edges_updated_at BEFORE UPDATE ON edges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ROW LEVEL SECURITY
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Workspace policies
DO $$ BEGIN
CREATE POLICY "Users can view workspaces they are members of" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Only owners can update workspaces" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Only owners can delete workspaces" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Workspace members policies
DO $$ BEGIN
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Owners can manage workspace members" ON workspace_members
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Diagram policies
DO $$ BEGIN
CREATE POLICY "Members can view diagrams in their workspaces" ON diagrams
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Editors and owners can create diagrams" ON diagrams
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Editors and owners can update diagrams" ON diagrams
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Editors and owners can delete diagrams" ON diagrams
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Node policies
DO $$ BEGIN
CREATE POLICY "Members can view nodes" ON nodes
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Editors can manage nodes" ON nodes
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Edge policies
DO $$ BEGIN
CREATE POLICY "Members can view edges" ON edges
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Editors can manage edges" ON edges
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Version policies
DO $$ BEGIN
CREATE POLICY "Members can view versions" ON diagram_versions
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Editors can create versions" ON diagram_versions
  FOR INSERT WITH CHECK (created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Share links policies
DO $$ BEGIN
CREATE POLICY "Editors can manage share links" ON share_links
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Anyone can view valid share links" ON share_links
  FOR SELECT USING (
    (expires_at IS NULL OR expires_at > now())
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Activity log policies
DO $$ BEGIN
CREATE POLICY "Members can view activity log" ON activity_log
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
      OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "System can insert activity log" ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ============================================
-- MIGRATION 2: Performance Indexes & RPC
-- ============================================

CREATE INDEX IF NOT EXISTS idx_nodes_parent_ids ON nodes USING GIN(parent_ids);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON diagram_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_diagram ON share_links(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_updated ON diagrams(updated_at DESC);

-- Batch position update RPC function
CREATE OR REPLACE FUNCTION batch_update_node_positions(
  p_diagram_id UUID,
  p_updates JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE nodes
    SET position_x = (item->>'x')::float,
        position_y = (item->>'y')::float,
        updated_at = now()
    WHERE id = (item->>'id')::uuid
      AND diagram_id = p_diagram_id;
  END LOOP;
END;
$$;


-- ============================================
-- MIGRATION 3: Comments & Annotations
-- ============================================

CREATE TABLE IF NOT EXISTS diagram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL DEFAULT '',
  node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES diagram_comments(id) ON DELETE CASCADE,
  resolved BOOLEAN NOT NULL DEFAULT false,
  position_x FLOAT,
  position_y FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagram_comments_diagram ON diagram_comments(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_comments_node ON diagram_comments(node_id);
CREATE INDEX IF NOT EXISTS idx_diagram_comments_parent ON diagram_comments(parent_comment_id);

ALTER TABLE diagram_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "workspace_members_read_comments" ON diagram_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM diagrams d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = diagram_comments.diagram_id
        AND wm.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "editors_insert_comments" ON diagram_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagrams d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = diagram_comments.diagram_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'editor')
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "users_update_own_comments" ON diagram_comments
  FOR UPDATE USING (
    user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "users_delete_comments" ON diagram_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM diagrams d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = diagram_comments.diagram_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- DONE! All 3 migrations applied.
-- ============================================
