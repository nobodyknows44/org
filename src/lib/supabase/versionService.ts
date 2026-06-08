import { createBrowserClient } from '@/lib/supabase/client';
import type { Node, Edge } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';
import type { FieldDefinition, LayoutConfig } from '@/types/database';

const supabase = createBrowserClient();

export interface DiagramSnapshot {
  nodes: Node<OrgNodeData>[];
  edges: Edge[];
  fieldSchema: FieldDefinition[];
  layoutConfig: LayoutConfig;
}

export interface VersionRecord {
  id: string;
  diagram_id: string;
  snapshot: DiagramSnapshot;
  label: string;
  created_by: string;
  created_at: string;
}

/**
 * Save a full diagram snapshot to the diagram_versions table.
 */
export async function saveVersion(
  diagramId: string,
  snapshot: DiagramSnapshot,
  actionLabel: string
): Promise<void> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('diagram_versions').insert({
      diagram_id: diagramId,
      snapshot: snapshot as unknown,
      label: actionLabel,
      created_by: user?.id || 'system',
    });
  } catch (err) {
    console.error('Failed to save version:', err);
  }
}

/**
 * List all versions for a diagram, newest first.
 */
export async function listVersions(diagramId: string): Promise<VersionRecord[]> {
  const { data } = (await supabase
    .from('diagram_versions')
    .select('*')
    .eq('diagram_id', diagramId)
    .order('created_at', { ascending: false })) as unknown as { data: VersionRecord[] | null };

  return data || [];
}

/**
 * Get a specific version snapshot.
 */
export async function getVersion(versionId: string): Promise<VersionRecord | null> {
  const { data } = (await supabase
    .from('diagram_versions')
    .select('*')
    .eq('id', versionId)
    .single()) as unknown as { data: VersionRecord | null };

  return data;
}
