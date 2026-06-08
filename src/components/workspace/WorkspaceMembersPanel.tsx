'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, UserPlus, Crown, Pencil, Eye } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { WorkspaceRole } from '@/types/database';

interface WorkspaceMembersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

interface MemberRecord {
  id: string;
  user_id: string;
  role: WorkspaceRole;
  email?: string;
  created_at: string;
}

const ROLE_ICONS: Record<WorkspaceRole, typeof Crown> = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye,
};

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: 'bg-amber-100 text-amber-800',
  editor: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-800',
};

export function WorkspaceMembersPanel({ open, onOpenChange, workspaceId }: WorkspaceMembersPanelProps) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('editor');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data } = (await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at')) as unknown as { data: MemberRecord[] | null };
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (open) fetchMembers();
  }, [open, fetchMembers]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const supabase = createBrowserClient();
      // In production, this would send a magic link. For now, we create a placeholder member.
      await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: inviteEmail.trim(), // Placeholder — would be resolved from user lookup
        role: inviteRole,
      });
      setInviteEmail('');
      await fetchMembers();
    } catch (err) {
      console.error('Failed to invite member:', err);
    } finally {
      setInviting(false);
    }
  }, [workspaceId, inviteEmail, inviteRole, fetchMembers]);

  const handleRemove = useCallback(
    async (memberId: string) => {
      try {
        const supabase = createBrowserClient();
        await supabase.from('workspace_members').delete().eq('id', memberId);
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } catch (err) {
        console.error('Failed to remove member:', err);
      }
    },
    []
  );

  const handleRoleChange = useCallback(
    async (memberId: string, newRole: WorkspaceRole) => {
      try {
        const supabase = createBrowserClient();
        await supabase.from('workspace_members').update({ role: newRole }).eq('id', memberId);
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } catch (err) {
        console.error('Failed to update role:', err);
      }
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Workspace Members</DialogTitle>
        </DialogHeader>

        {/* Invite form */}
        <div className="flex items-end gap-2 pb-4 border-b">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Email</Label>
            <Input
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Role</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="h-8" onClick={handleInvite} disabled={inviting}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Invite
          </Button>
        </div>

        {/* Member list */}
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
            ) : (
              members.map((member) => {
                const Icon = ROLE_ICONS[member.role];
                return (
                  <div key={member.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {member.user_id.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{member.email || member.user_id}</p>
                    </div>
                    <Badge className={`text-[10px] ${ROLE_COLORS[member.role]}`}>
                      <Icon className="h-2.5 w-2.5 mr-0.5" />
                      {member.role}
                    </Badge>
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleRemove(member.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
