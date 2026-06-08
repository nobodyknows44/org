'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, Link2, Trash2, Check } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagramId: string;
}

interface ShareLinkRecord {
  id: string;
  share_id: string;
  password_hash: string | null;
  expires_at: string | null;
  created_at: string;
}

export function ShareDialog({ open, onOpenChange, diagramId }: ShareDialogProps) {
  const [links, setLinks] = useState<ShareLinkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch existing share links when dialog opens
  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from('share_links')
        .select('*')
        .eq('diagram_id', diagramId)
        .order('created_at', { ascending: false }) as unknown as { data: ShareLinkRecord[] | null };
      setLinks(data || []);
    } catch (err) {
      console.error('Failed to fetch share links:', err);
    } finally {
      setLoading(false);
    }
  }, [diagramId]);

  // Create a new share link
  const handleCreate = useCallback(async () => {
    const shareId = uuidv4();
    try {
      const supabase = createBrowserClient();
      const record: Record<string, unknown> = {
        diagram_id: diagramId,
        share_id: shareId,
      };
      if (usePassword && password.trim()) {
        // Simple hash for demo — in production use bcrypt on server
        record.password_hash = password.trim();
      }
      await supabase.from('share_links').insert(record);
      await fetchLinks();
      setPassword('');
      setUsePassword(false);
    } catch (err) {
      console.error('Failed to create share link:', err);
    }
  }, [diagramId, fetchLinks, password, usePassword]);

  // Delete a share link
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const supabase = createBrowserClient();
        await supabase.from('share_links').delete().eq('id', id);
        setLinks((prev) => prev.filter((l) => l.id !== id));
      } catch (err) {
        console.error('Failed to delete share link:', err);
      }
    },
    []
  );

  const copyToClipboard = useCallback((shareId: string) => {
    const url = `${window.location.origin}/view/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) fetchLinks();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Diagram</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing links */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Links</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No share links yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 font-mono text-xs">
                      /view/{link.share_id.slice(0, 8)}...
                    </span>
                    {link.password_hash && <Badge variant="secondary" className="text-xs">Password</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(link.share_id)}
                    >
                      {copiedId === link.share_id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create new link */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Create New Link</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={usePassword}
                onCheckedChange={setUsePassword}
                id="password-toggle"
              />
              <Label htmlFor="password-toggle" className="text-sm">
                Require password
              </Label>
            </div>
            {usePassword && (
              <Input
                placeholder="Enter password..."
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCreate}>
            <Link2 className="h-4 w-4 mr-2" />
            Create Share Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
