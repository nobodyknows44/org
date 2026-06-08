'use client';

import { Button } from '@/components/ui/button';
import { Plus, Upload, FolderOpen, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'workspace' | 'diagram' | 'search';
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const configs = {
    workspace: {
      icon: FolderOpen,
      title: 'No workspaces yet',
      description: 'Create your first workspace to start organizing your diagrams.',
      actionLabel: 'Create Workspace',
    },
    diagram: {
      icon: Plus,
      title: 'Empty canvas',
      description: 'Double-click anywhere to add a node, or import data from Excel.',
      actionLabel: 'Import Excel',
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search terms or clearing filters.',
      actionLabel: undefined,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{config.title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">{config.description}</p>
      {config.actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {type === 'diagram' && <Upload className="h-4 w-4 mr-2" />}
          {type === 'workspace' && <Plus className="h-4 w-4 mr-2" />}
          {config.actionLabel}
        </Button>
      )}
    </div>
  );
}
