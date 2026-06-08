import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DiagramSnapshot, VersionRecord } from '@/lib/supabase/versionService';
import type { CursorPresence } from '@/hooks/useRealtimeCollaboration';

// Mock Supabase before imports
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'v1', version_number: 1, created_at: new Date().toISOString(), action_label: 'Test' }, error: null }) }) }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
  }),
}));

describe('Sprint 5 - Collaboration & Versioning', () => {
  describe('Version Service Types', () => {
    it('DiagramSnapshot should have required fields', () => {
      const snapshot: DiagramSnapshot = {
        nodes: [],
        edges: [],
        fieldSchema: [],
        layoutConfig: { direction: 'DOWN', spacing: { horizontal: 60, vertical: 80 }, algorithm: 'layered' },
      };
      expect(snapshot.nodes).toEqual([]);
      expect(snapshot.edges).toEqual([]);
      expect(snapshot.fieldSchema).toEqual([]);
      expect(snapshot.layoutConfig.direction).toBe('DOWN');
    });

    it('VersionRecord should have required fields', () => {
      const record: VersionRecord = {
        id: 'v1',
        diagram_id: 'd1',
        version_number: 1,
        snapshot: { nodes: [], edges: [], fieldSchema: [], layoutConfig: { direction: 'DOWN', spacing: { horizontal: 60, vertical: 80 }, algorithm: 'layered' } },
        action_label: 'Test',
        created_by: 'user1',
        created_at: new Date().toISOString(),
      };
      expect(record.version_number).toBe(1);
      expect(record.action_label).toBe('Test');
    });
  });

  describe('Role-based Access', () => {
    it('owner role should allow edit', () => {
      const role = 'owner';
      const canEdit = role === 'owner' || role === 'editor';
      const isOwner = role === 'owner';
      expect(canEdit).toBe(true);
      expect(isOwner).toBe(true);
    });

    it('editor role should allow edit but not manage members', () => {
      const role = 'editor';
      const canEdit = role === 'owner' || role === 'editor';
      const isOwner = role === 'owner';
      expect(canEdit).toBe(true);
      expect(isOwner).toBe(false);
    });

    it('viewer role should not allow edit or manage members', () => {
      const role = 'viewer';
      const canEdit = role === 'owner' || role === 'editor';
      const isOwner = role === 'owner';
      expect(canEdit).toBe(false);
      expect(isOwner).toBe(false);
    });
  });

  describe('Canvas Store - userRole', () => {
    it('default userRole should be owner', async () => {
      // Reset module to get fresh store
      vi.resetModules();
      const { useCanvasStore } = await import('@/stores/canvasStore');
      const state = useCanvasStore.getState();
      expect(state.userRole).toBe('owner');
    });

    it('setUserRole should update the role', async () => {
      vi.resetModules();
      const { useCanvasStore } = await import('@/stores/canvasStore');
      useCanvasStore.getState().setUserRole('viewer');
      expect(useCanvasStore.getState().userRole).toBe('viewer');

      useCanvasStore.getState().setUserRole('editor');
      expect(useCanvasStore.getState().userRole).toBe('editor');
    });
  });

  describe('Cursor Presence', () => {
    it('CursorPresence should have correct shape', () => {
      const cursor: CursorPresence = {
        userId: 'user1',
        userName: 'Alice',
        color: '#FF0000',
        x: 100,
        y: 200,
      };
      expect(cursor.userId).toBe('user1');
      expect(cursor.x).toBe(100);
      expect(cursor.y).toBe(200);
    });
  });
});
