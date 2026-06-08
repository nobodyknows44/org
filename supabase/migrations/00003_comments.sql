-- Phase 4: Comments & Annotations
-- Adds diagram_comments table for threaded, node-attached comments.

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diagram_comments_diagram ON diagram_comments(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_comments_node ON diagram_comments(node_id);
CREATE INDEX IF NOT EXISTS idx_diagram_comments_parent ON diagram_comments(parent_comment_id);

-- RLS
ALTER TABLE diagram_comments ENABLE ROW LEVEL SECURITY;

-- Workspace members can read comments on diagrams in their workspaces
CREATE POLICY "workspace_members_read_comments" ON diagram_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM diagrams d
      JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = diagram_comments.diagram_id
        AND wm.user_id = auth.uid()
    )
  );

-- Editors and owners can insert comments
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

-- Users can update their own comments
CREATE POLICY "users_update_own_comments" ON diagram_comments
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Users can delete their own comments; owners can delete any
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
