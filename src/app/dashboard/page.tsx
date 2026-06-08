'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Workspace, Diagram, DiagramType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Network, GitBranch, LogOut, Trash2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { DEFAULT_ORG_CHART_FIELDS, DEFAULT_OWNERSHIP_FIELDS, DEFAULT_LAYOUT_CONFIG } from '@/lib/constants';

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [diagrams, setDiagrams] = useState<Record<string, Diagram[]>>({});
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newDiagramName, setNewDiagramName] = useState('');
  const [newDiagramType, setNewDiagramType] = useState<DiagramType>('org_chart');
  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [dgDialogOpen, setDgDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadDiagrams(selectedWorkspace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace]);

  const loadWorkspaces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load workspaces');
      console.error(error);
    } else {
      const typed = (data || []) as unknown as Workspace[];
      setWorkspaces(typed);
      if (typed.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(typed[0].id);
      }
    }
    setLoading(false);
  };

  const loadDiagrams = async (workspaceId: string) => {
    const { data, error } = await supabase
      .from('diagrams')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load diagrams');
      console.error(error);
    } else {
      setDiagrams((prev) => ({ ...prev, [workspaceId]: (data || []) as unknown as Diagram[] }));
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: newWorkspaceName.trim(), owner_id: user.id, settings: {} })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create workspace');
      console.error(error);
      return;
    }

    const ws = data as unknown as Workspace;

    // Add creator as owner member
    await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'owner',
    });

    setWorkspaces((prev) => [ws, ...prev]);
    setSelectedWorkspace(ws.id);
    setNewWorkspaceName('');
    setWsDialogOpen(false);
    toast.success('Workspace created');
  };

  const createDiagram = async () => {
    if (!newDiagramName.trim() || !selectedWorkspace) return;

    const fieldSchema = newDiagramType === 'org_chart'
      ? DEFAULT_ORG_CHART_FIELDS
      : DEFAULT_OWNERSHIP_FIELDS;

    const { data, error } = await supabase
      .from('diagrams')
      .insert({
        workspace_id: selectedWorkspace,
        name: newDiagramName.trim(),
        type: newDiagramType,
        field_schema: fieldSchema as unknown as Record<string, unknown>,
        layout_config: DEFAULT_LAYOUT_CONFIG as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create diagram');
      console.error(error);
      return;
    }

    const dg = data as unknown as Diagram;

    setDiagrams((prev) => ({
      ...prev,
      [selectedWorkspace]: [dg, ...(prev[selectedWorkspace] || [])],
    }));
    setNewDiagramName('');
    setDgDialogOpen(false);
    toast.success('Diagram created');
  };

  const deleteDiagram = async (diagramId: string) => {
    if (!selectedWorkspace) return;

    const { error } = await supabase.from('diagrams').delete().eq('id', diagramId);

    if (error) {
      toast.error('Failed to delete diagram');
      console.error(error);
      return;
    }

    setDiagrams((prev) => ({
      ...prev,
      [selectedWorkspace]: (prev[selectedWorkspace] || []).filter((d) => d.id !== diagramId),
    }));
    toast.success('Diagram deleted');
  };

  const deleteWorkspace = async (workspaceId: string) => {
    const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);

    if (error) {
      toast.error('Failed to delete workspace');
      console.error(error);
      return;
    }

    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    if (selectedWorkspace === workspaceId) {
      const remaining = workspaces.filter((w) => w.id !== workspaceId);
      setSelectedWorkspace(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.success('Workspace deleted');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const currentDiagrams = selectedWorkspace ? diagrams[selectedWorkspace] || [] : [];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">OrgCanvas</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar - Workspaces */}
        <aside className="w-64 border-r bg-muted/30 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Workspaces</h2>
            <Dialog open={wsDialogOpen} onOpenChange={setWsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Workspace</DialogTitle>
                  <DialogDescription>Create a workspace to organize your diagrams.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="wsName">Name</Label>
                    <Input
                      id="wsName"
                      placeholder="e.g. My Company Group"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createWorkspace}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1 flex-1 overflow-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground p-2">Loading...</p>
            ) : workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No workspaces yet. Create one to get started.</p>
            ) : (
              workspaces.map((ws) => (
                <div key={ws.id} className="flex items-center group">
                  <button
                    onClick={() => setSelectedWorkspace(ws.id)}
                    className={`flex-1 text-left rounded-md px-3 py-2 text-sm transition-colors ${
                      selectedWorkspace === ws.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {ws.name}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteWorkspace(ws.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main content - Diagrams */}
        <main className="flex-1 p-6 overflow-auto">
          {!selectedWorkspace ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select or create a workspace to get started
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">
                  {workspaces.find((w) => w.id === selectedWorkspace)?.name} — Diagrams
                </h2>
                <Dialog open={dgDialogOpen} onOpenChange={setDgDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Diagram
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Diagram</DialogTitle>
                      <DialogDescription>Choose a diagram type and give it a name.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dgName">Name</Label>
                        <Input
                          id="dgName"
                          placeholder="e.g. Q1 2026 Org Chart"
                          value={newDiagramName}
                          onChange={(e) => setNewDiagramName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newDiagramType} onValueChange={(v) => setNewDiagramType(v as DiagramType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="org_chart">Org Chart</SelectItem>
                            <SelectItem value="ownership">Ownership Structure</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={createDiagram}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {currentDiagrams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Network className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg mb-2">No diagrams yet</p>
                  <p className="text-sm">Create your first diagram to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentDiagrams.map((diagram) => (
                    <Card
                      key={diagram.id}
                      className="cursor-pointer hover:shadow-md transition-shadow group"
                      onClick={() => router.push(`/canvas/${diagram.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{diagram.name}</CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDiagram(diagram.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          {diagram.type === 'org_chart' ? (
                            <GitBranch className="h-3 w-3" />
                          ) : (
                            <Network className="h-3 w-3" />
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {diagram.type === 'org_chart' ? 'Org Chart' : 'Ownership'}
                          </Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(diagram.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
