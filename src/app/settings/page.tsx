'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Trash2, User, Settings, Shield } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleSaveProfile = useCallback(() => {
    // TODO: Save to Supabase auth.users metadata
    console.log('Save profile:', { profileName, profileEmail });
  }, [profileName, profileEmail]);

  const handleSaveWorkspace = useCallback(() => {
    // TODO: Save to workspaces table
    console.log('Save workspace:', { workspaceName });
  }, [workspaceName]);

  const handleDeleteWorkspace = useCallback(() => {
    if (deleteConfirm !== 'DELETE') return;
    // TODO: Delete workspace via Supabase
    console.log('Delete workspace');
    setDeleteDialogOpen(false);
    router.push('/dashboard');
  }, [deleteConfirm, router]);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b px-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">
        {/* User Profile */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5" />
            <h2 className="text-base font-semibold">User Profile</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="your@email.com"
                disabled
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <Button onClick={handleSaveProfile} size="sm">
              Save Profile
            </Button>
          </div>
        </Card>

        {/* Workspace Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5" />
            <h2 className="text-base font-semibold">Workspace Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Workspace"
              />
            </div>
            <Button onClick={handleSaveWorkspace} size="sm">
              Save Settings
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-destructive/50">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-destructive" />
            <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this workspace and all its diagrams. This action cannot be undone.
          </p>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Workspace</DialogTitle>
                <DialogDescription>
                  This will permanently delete the workspace, all diagrams, versions, and share links. Type <strong>DELETE</strong> to confirm.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE to confirm"
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWorkspace}
                  disabled={deleteConfirm !== 'DELETE'}
                >
                  Delete Forever
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    </div>
  );
}
