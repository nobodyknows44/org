-- ==========================================================
-- Fix: Infinite recursion in RLS policies
-- The workspace_members SELECT policy references itself,
-- and workspaces SELECT references workspace_members,
-- creating circular dependencies.
--
-- Solution: SECURITY DEFINER helper functions that bypass RLS
-- ==========================================================

-- Helper: get workspace IDs where user is a member
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid();
$$;

-- Helper: get workspace IDs where user is a member with editor+ role
CREATE OR REPLACE FUNCTION public.get_user_editor_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor');
$$;

-- Helper: get workspace IDs the user owns
CREATE OR REPLACE FUNCTION public.get_owned_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM workspaces WHERE owner_id = auth.uid();
$$;

-- ============================================
-- Drop old policies (all the ones with circular refs)
-- ============================================

-- Workspaces
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Only owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Only owners can delete workspaces" ON workspaces;

-- Workspace members
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;

-- Diagrams
DROP POLICY IF EXISTS "Members can view diagrams in their workspaces" ON diagrams;
DROP POLICY IF EXISTS "Editors and owners can create diagrams" ON diagrams;
DROP POLICY IF EXISTS "Editors and owners can update diagrams" ON diagrams;
DROP POLICY IF EXISTS "Editors and owners can delete diagrams" ON diagrams;

-- Nodes
DROP POLICY IF EXISTS "Members can view nodes" ON nodes;
DROP POLICY IF EXISTS "Editors can manage nodes" ON nodes;

-- Edges
DROP POLICY IF EXISTS "Members can view edges" ON edges;
DROP POLICY IF EXISTS "Editors can manage edges" ON edges;

-- Versions
DROP POLICY IF EXISTS "Members can view versions" ON diagram_versions;
DROP POLICY IF EXISTS "Editors can create versions" ON diagram_versions;

-- Share links
DROP POLICY IF EXISTS "Editors can manage share links" ON share_links;
DROP POLICY IF EXISTS "Anyone can view valid share links" ON share_links;

-- Activity log
DROP POLICY IF EXISTS "Members can view activity log" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;

-- Comments
DROP POLICY IF EXISTS "workspace_members_read_comments" ON diagram_comments;
DROP POLICY IF EXISTS "editors_insert_comments" ON diagram_comments;
DROP POLICY IF EXISTS "users_update_own_comments" ON diagram_comments;
DROP POLICY IF EXISTS "users_delete_comments" ON diagram_comments;

-- ============================================
-- Re-create policies using helper functions
-- ============================================

-- WORKSPACES
CREATE POLICY "Users can view workspaces they are members of" ON workspaces
  FOR SELECT USING (
    id IN (SELECT public.get_user_workspace_ids())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Only owners can update workspaces" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Only owners can delete workspaces" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- WORKSPACE MEMBERS (no more self-reference!)
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT public.get_user_workspace_ids())
    OR workspace_id IN (SELECT public.get_owned_workspace_ids())
  );

CREATE POLICY "Owners can manage workspace members" ON workspace_members
  FOR ALL USING (
    workspace_id IN (SELECT public.get_owned_workspace_ids())
  );

-- DIAGRAMS
CREATE POLICY "Members can view diagrams in their workspaces" ON diagrams
  FOR SELECT USING (
    workspace_id IN (SELECT public.get_user_workspace_ids())
    OR workspace_id IN (SELECT public.get_owned_workspace_ids())
  );

CREATE POLICY "Editors and owners can create diagrams" ON diagrams
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT public.get_user_editor_workspace_ids())
    OR workspace_id IN (SELECT public.get_owned_workspace_ids())
  );

CREATE POLICY "Editors and owners can update diagrams" ON diagrams
  FOR UPDATE USING (
    workspace_id IN (SELECT public.get_user_editor_workspace_ids())
    OR workspace_id IN (SELECT public.get_owned_workspace_ids())
  );

CREATE POLICY "Editors and owners can delete diagrams" ON diagrams
  FOR DELETE USING (
    workspace_id IN (SELECT public.get_user_editor_workspace_ids())
    OR workspace_id IN (SELECT public.get_owned_workspace_ids())
  );

-- NODES
CREATE POLICY "Members can view nodes" ON nodes
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE
        workspace_id IN (SELECT public.get_user_workspace_ids())
        OR workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

CREATE POLICY "Editors can manage nodes" ON nodes
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE
        workspace_id IN (SELECT public.get_user_editor_workspace_ids())
        OR workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

-- EDGES
CREATE POLICY "Members can view edges" ON edges
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE
        workspace_id IN (SELECT public.get_user_workspace_ids())
        OR workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

CREATE POLICY "Editors can manage edges" ON edges
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE
        workspace_id IN (SELECT public.get_user_editor_workspace_ids())
        OR workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

-- DIAGRAM VERSIONS
CREATE POLICY "Members can view versions" ON diagram_versions
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE
        workspace_id IN (SELECT public.get_user_workspace_ids())
        OR workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

CREATE POLICY "Editors can create versions" ON diagram_versions
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- SHARE LINKS
CREATE POLICY "Editors can manage share links" ON share_links
  FOR ALL USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE
        workspace_id IN (SELECT public.get_user_editor_workspace_ids())
        OR workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

CREATE POLICY "Anyone can view valid share links" ON share_links
  FOR SELECT USING (
    expires_at IS NULL OR expires_at > now()
  );

-- ACTIVITY LOG
CREATE POLICY "Members can view activity log" ON activity_log
  FOR SELECT USING (
    diagram_id IN (
      SELECT id FROM diagrams WHERE
        workspace_id IN (SELECT public.get_user_workspace_ids())
        OR workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

CREATE POLICY "System can insert activity log" ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- COMMENTS
CREATE POLICY "workspace_members_read_comments" ON diagram_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM diagrams d
      WHERE d.id = diagram_comments.diagram_id
        AND (d.workspace_id IN (SELECT public.get_user_workspace_ids())
             OR d.workspace_id IN (SELECT public.get_owned_workspace_ids()))
    )
  );

CREATE POLICY "editors_insert_comments" ON diagram_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagrams d
      WHERE d.id = diagram_comments.diagram_id
        AND (d.workspace_id IN (SELECT public.get_user_editor_workspace_ids())
             OR d.workspace_id IN (SELECT public.get_owned_workspace_ids()))
    )
  );

CREATE POLICY "users_update_own_comments" ON diagram_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_delete_comments" ON diagram_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM diagrams d
      WHERE d.id = diagram_comments.diagram_id
        AND d.workspace_id IN (SELECT public.get_owned_workspace_ids())
    )
  );

-- ============================================
-- DONE! RLS recursion fixed.
-- ============================================
