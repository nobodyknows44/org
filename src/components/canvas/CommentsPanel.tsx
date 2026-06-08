'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listComments,
  addComment,
  toggleResolveComment,
  deleteComment,
  type DiagramComment,
} from '@/lib/supabase/commentService';
import { useCanvasStore } from '@/stores/canvasStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, Check, CheckCheck, Trash2, Reply } from 'lucide-react';

interface CommentsPanelProps {
  diagramId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsPanel({ diagramId, open, onOpenChange }: CommentsPanelProps) {
  const [comments, setComments] = useState<DiagramComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { nodes, selectedNodeIds } = useCanvasStore();

  const loadComments = useCallback(async () => {
    if (!diagramId) return;
    setLoading(true);
    const data = await listComments(diagramId);
    setComments(data);
    setLoading(false);
  }, [diagramId]);

  useEffect(() => {
    if (open) loadComments();
  }, [open, loadComments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    const targetNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : undefined;
    await addComment(diagramId, newComment.trim(), {
      nodeId: targetNodeId,
      parentCommentId: replyingTo || undefined,
    });
    setNewComment('');
    setReplyingTo(null);
    loadComments();
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    await toggleResolveComment(commentId, !resolved);
    loadComments();
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
    loadComments();
  };

  // Group comments into threads (top-level + replies)
  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesMap = new Map<string, DiagramComment[]>();
  comments.forEach((c) => {
    if (c.parent_comment_id) {
      if (!repliesMap.has(c.parent_comment_id)) repliesMap.set(c.parent_comment_id, []);
      repliesMap.get(c.parent_comment_id)!.push(c);
    }
  });

  const filtered = showResolved ? topLevel : topLevel.filter((c) => !c.resolved);

  const getNodeName = (nodeId: string | null): string | null => {
    if (!nodeId) return null;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const name = Object.values(node.data?.fields || {}).find(
      (v) => typeof v === 'string' && v.length > 0
    );
    return typeof name === 'string' ? name : 'Node';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
            <Badge variant="secondary" className="ml-auto">
              {filtered.length}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 py-2">
          <Button
            variant={showResolved ? 'secondary' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Select a node and add a comment below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((comment) => {
                const replies = repliesMap.get(comment.id) || [];
                const nodeName = getNodeName(comment.node_id);
                return (
                  <div key={comment.id} className="space-y-1">
                    <div
                      className={`rounded-lg border p-3 text-sm ${
                        comment.resolved ? 'opacity-60 bg-muted/30' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs">
                          {comment.user_email || 'User'}
                        </span>
                        {nodeName && (
                          <Badge variant="outline" className="text-[10px]">
                            {nodeName}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleResolve(comment.id, comment.resolved)}
                          title={comment.resolved ? 'Unresolve' : 'Resolve'}
                        >
                          {comment.resolved ? (
                            <CheckCheck className="h-3 w-3 text-green-500" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          title="Reply"
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDelete(comment.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg border p-2 text-sm bg-muted/20">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-xs">
                                {reply.user_email || 'User'}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {replyingTo === comment.id && (
                      <div className="ml-4 flex gap-2">
                        <Input
                          className="h-8 text-xs"
                          placeholder="Write a reply..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <Button size="icon" className="h-8 w-8" onClick={handleSubmit}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* New comment input */}
        <div className="py-2">
          {selectedNodeIds.length === 1 && (
            <p className="text-[10px] text-muted-foreground mb-1">
              Commenting on: {getNodeName(selectedNodeIds[0]) || 'selected node'}
            </p>
          )}
          <div className="flex gap-2">
            <Input
              className="h-9 text-sm"
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              value={replyingTo ? '' : newComment}
              onChange={(e) => {
                if (!replyingTo) setNewComment(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !replyingTo) handleSubmit();
              }}
              disabled={!!replyingTo}
            />
            <Button
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                if (!replyingTo) handleSubmit();
              }}
              disabled={!!replyingTo || !newComment.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
