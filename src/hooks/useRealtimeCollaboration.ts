'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useCanvasStore } from '@/stores/canvasStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CursorPresence {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

const CURSOR_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

/**
 * Real-time collaboration hook.
 * - Broadcasts node/edge changes to other users in the same diagram
 * - Receives and applies changes from other users
 * - Manages cursor presence
 */
export function useRealtimeCollaboration(diagramId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [cursors, setCursors] = useState<Map<string, CursorPresence>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const { setNodes, setEdges, nodes, edges } = useCanvasStore();

  // Initialize channel
  useEffect(() => {
    if (!diagramId) return;

    const supabase = createBrowserClient();

    const channel = supabase.channel(`diagram-${diagramId}`, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
        presence: { key: '' }, // Will be set after auth
      },
    });

    // Handle presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: string[] = [];
      for (const key in state) {
        const presences = state[key] as any[];
        presences.forEach((p: any) => {
          if (p.user_id) users.push(p.user_id);
        });
      }
      setOnlineUsers(users);
    });

    // Handle node position broadcasts
    channel.on('broadcast', { event: 'node:move' }, ({ payload }) => {
      const { nodeId, position } = payload;
      useCanvasStore.getState().updateNodePosition(nodeId, position);
    });

    // Handle node data broadcasts
    channel.on('broadcast', { event: 'node:update' }, ({ payload }) => {
      const { nodeId, data } = payload;
      useCanvasStore.getState().updateNodeData(nodeId, data);
    });

    // Handle cursor position broadcasts
    channel.on('broadcast', { event: 'cursor:move' }, ({ payload }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(payload.userId, payload as CursorPresence);
        return next;
      });
    });

    // Handle full sync request
    channel.on('broadcast', { event: 'sync:full' }, ({ payload }) => {
      if (payload.nodes && payload.edges) {
        useCanvasStore.getState().setNodes(payload.nodes);
        useCanvasStore.getState().setEdges(payload.edges);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await channel.track({
            user_id: user.id,
            user_name: user.email || 'Anonymous',
            online_at: new Date().toISOString(),
          });
        }
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [diagramId, setNodes, setEdges]);

  // Broadcast node movement
  const broadcastNodeMove = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'node:move',
        payload: { nodeId, position },
      });
    },
    []
  );

  // Broadcast node data update
  const broadcastNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'node:update',
        payload: { nodeId, data },
      });
    },
    []
  );

  // Broadcast cursor position (throttled externally)
  const broadcastCursor = useCallback(
    (userId: string, userName: string, color: string, x: number, y: number) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'cursor:move',
        payload: { userId, userName, color, x, y },
      });
    },
    []
  );

  return {
    cursors,
    onlineUsers,
    broadcastNodeMove,
    broadcastNodeUpdate,
    broadcastCursor,
    CURSOR_COLORS,
  };
}
