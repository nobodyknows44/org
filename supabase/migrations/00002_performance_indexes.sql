-- Performance indexes for Supabase queries
-- Sprint 7: Query optimization

-- Nodes table indexes
CREATE INDEX IF NOT EXISTS idx_nodes_diagram_id_v2 ON nodes(diagram_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_ids ON nodes USING GIN(parent_ids);

-- Edges table indexes
CREATE INDEX IF NOT EXISTS idx_edges_diagram_id_v2 ON edges(diagram_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node_id);

-- Versions table indexes
CREATE INDEX IF NOT EXISTS idx_versions_diagram_id ON diagram_versions(diagram_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON diagram_versions(created_at DESC);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_diagram_id ON activity_log(diagram_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC);

-- Workspace members indexes
CREATE INDEX IF NOT EXISTS idx_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON workspace_members(user_id);

-- Share links indexes
CREATE INDEX IF NOT EXISTS idx_share_links_diagram ON share_links(diagram_id);
CREATE INDEX IF NOT EXISTS idx_share_links_share_id ON share_links(share_id);

-- Diagrams table indexes
CREATE INDEX IF NOT EXISTS idx_diagrams_workspace ON diagrams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_updated ON diagrams(updated_at DESC);

-- Batch position update RPC function
CREATE OR REPLACE FUNCTION batch_update_node_positions(
  p_diagram_id UUID,
  p_updates JSONB -- Array of {id, x, y}
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
