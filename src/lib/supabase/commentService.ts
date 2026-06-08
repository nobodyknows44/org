import { createBrowserClient } from '@/lib/supabase/client';

export interface DiagramComment {
  id: string;
  diagram_id: string;
  user_id: string;
  user_email?: string;
  node_id: string | null; // null = diagram-level comment
  content: string;
  parent_comment_id: string | null; // for threading
  resolved: boolean;
  position_x: number | null; // for area annotations
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

/** Fetch comments for a diagram. */
export async function listComments(diagramId: string): Promise<DiagramComment[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('diagram_comments')
    .select('*')
    .eq('diagram_id', diagramId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to list comments:', error);
    return [];
  }
  return (data || []) as unknown as DiagramComment[];
}

/** Add a comment (node-level or free-floating). */
export async function addComment(
  diagramId: string,
  content: string,
  options?: {
    nodeId?: string;
    parentCommentId?: string;
    positionX?: number;
    positionY?: number;
  }
): Promise<DiagramComment | null> {
  const supabase = createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('diagram_comments')
    .insert({
      diagram_id: diagramId,
      user_id: user.id,
      user_email: user.email || '',
      node_id: options?.nodeId || null,
      content,
      parent_comment_id: options?.parentCommentId || null,
      position_x: options?.positionX ?? null,
      position_y: options?.positionY ?? null,
      resolved: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add comment:', error);
    return null;
  }
  return data as unknown as DiagramComment;
}

/** Resolve or unresolve a comment thread. */
export async function toggleResolveComment(commentId: string, resolved: boolean): Promise<boolean> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from('diagram_comments')
    .update({ resolved })
    .eq('id', commentId);

  if (error) {
    console.error('Failed to toggle resolve:', error);
    return false;
  }
  return true;
}

/** Delete a comment. */
export async function deleteComment(commentId: string): Promise<boolean> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from('diagram_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Failed to delete comment:', error);
    return false;
  }
  return true;
}
