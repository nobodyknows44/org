'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Keyboard, Upload, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DocsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b px-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Documentation</h1>
      </header>

      <div className="max-w-3xl mx-auto py-8 px-6 space-y-8">
        {/* Getting Started */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Getting Started</h2>
          </div>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ol className="space-y-3">
              <li>
                <strong>Create a Workspace</strong> — From the dashboard, click &quot;New Workspace&quot; and give it a name.
              </li>
              <li>
                <strong>Create a Diagram</strong> — Inside your workspace, click &quot;New Diagram&quot;. Choose between Org Chart or Ownership Diagram.
              </li>
              <li>
                <strong>Add Nodes</strong> — Double-click anywhere on the canvas to create a node. Click a node to edit its fields in the inspector panel.
              </li>
              <li>
                <strong>Connect Nodes</strong> — Drag from the small handle on a node to another node. In org chart mode, each node can have one parent. In ownership mode, nodes can have multiple parents.
              </li>
              <li>
                <strong>Auto Layout</strong> — Click the grid icon (or use the layout direction dropdown) to automatically arrange nodes.
              </li>
              <li>
                <strong>Export</strong> — Use the download icon to export as PDF, PNG, SVG, or Excel.
              </li>
            </ol>
          </div>
        </Card>

        {/* Import Guide */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Excel Import Guide</h2>
          </div>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
            <p>OrgCanvas supports importing data from Excel files (.xlsx, .xls, .csv).</p>
            <h3 className="text-sm font-medium text-foreground">Steps:</h3>
            <ol className="space-y-2">
              <li>Click the <strong>Upload</strong> icon in the toolbar</li>
              <li>Select your Excel file</li>
              <li>Choose the sheet to import from (if multiple sheets)</li>
              <li>Map your columns to diagram fields (Name, Title, Department, Reports To, etc.)</li>
              <li>Preview the data and confirm import</li>
            </ol>
            <h3 className="text-sm font-medium text-foreground mt-4">Required Columns:</h3>
            <ul className="space-y-1">
              <li><strong>Name</strong> — Required. The display name of the person/entity.</li>
              <li><strong>Reports To</strong> (Org Chart) — The name of the parent node. Leave empty for root nodes.</li>
              <li><strong>Entity Name</strong> (Ownership) — The name of the entity.</li>
            </ul>
            <h3 className="text-sm font-medium text-foreground mt-4">Tips:</h3>
            <ul className="space-y-1">
              <li>Parent references use the &quot;Name&quot; column for matching</li>
              <li>Duplicate names are handled by appending a suffix</li>
              <li>You can re-export and re-import for round-trip editing</li>
            </ul>
          </div>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <div className="divide-y">
            {[
              { keys: 'Ctrl+Z', action: 'Undo' },
              { keys: 'Ctrl+Shift+Z', action: 'Redo' },
              { keys: 'Ctrl+F', action: 'Open search' },
              { keys: 'Ctrl+D', action: 'Duplicate selected node(s)' },
              { keys: 'Delete / Backspace', action: 'Delete selected node(s)' },
              { keys: 'Arrow keys', action: 'Nudge selected nodes by 1px' },
              { keys: 'Shift+Arrow keys', action: 'Nudge selected nodes by 10px' },
              { keys: 'Double-click canvas', action: 'Create new node' },
              { keys: 'Right-click node', action: 'Open context menu' },
              { keys: 'Ctrl+mouse wheel', action: 'Zoom in/out' },
              { keys: 'Ctrl+click', action: 'Multi-select nodes' },
            ].map(({ keys, action }) => (
              <div key={keys} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{action}</span>
                <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border">{keys}</kbd>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
