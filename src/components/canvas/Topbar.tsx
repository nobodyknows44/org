'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCanvasStore } from '@/stores/canvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Undo2,
  Redo2,
  LayoutGrid,
  Share2,
  ArrowLeft,
  PanelLeft,
  Search,
  History,
  Users,
  Filter,
  PenTool,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TopbarProps {
  onAutoLayout: () => void;
  onSearch: () => void;
  onShare: () => void;
  onToggleLeftSidebar: () => void;
  onVersionHistory?: () => void;
  onManageMembers?: () => void;
  onFilter?: () => void;
  onBulkEdit?: () => void;
  collaboratorsSlot?: React.ReactNode;
}

export function Topbar({ onAutoLayout, onSearch, onShare, onToggleLeftSidebar, onVersionHistory, onManageMembers, onFilter, onBulkEdit, collaboratorsSlot }: TopbarProps) {
  const { diagramName, setDiagramName, undo, redo, canUndo, canRedo, layoutConfig, setLayoutConfig } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(diagramName);
  const router = useRouter();

  const handleNameSubmit = useCallback(() => {
    if (nameInput.trim()) {
      setDiagramName(nameInput.trim());
    } else {
      setNameInput(diagramName);
    }
    setIsEditing(false);
  }, [nameInput, diagramName, setDiagramName]);

  return (
    <header className="h-12 border-b bg-background px-3 flex items-center gap-2 shrink-0">
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back to Dashboard</TooltipContent>
      </Tooltip>

      {/* Left sidebar toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleLeftSidebar}>
            <PanelLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle Settings Panel</TooltipContent>
      </Tooltip>

      {/* Diagram name */}
      {isEditing ? (
        <Input
          className="h-7 w-48 text-sm"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameSubmit();
            if (e.key === 'Escape') {
              setNameInput(diagramName);
              setIsEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <button
          className="text-sm font-medium hover:bg-muted px-2 py-1 rounded"
          onClick={() => {
            setNameInput(diagramName);
            setIsEditing(true);
          }}
        >
          {diagramName}
        </button>
      )}

      <div className="flex-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={undo}
              disabled={!canUndo()}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={redo}
              disabled={!canRedo()}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Layout */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAutoLayout}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Auto Layout</TooltipContent>
      </Tooltip>

      {/* Layout direction */}
      <Select
        value={layoutConfig.direction}
        onValueChange={(v) => {
          setLayoutConfig({ direction: v as 'DOWN' | 'RIGHT' | 'UP' | 'LEFT' });
          onAutoLayout();
        }}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DOWN">Top → Down</SelectItem>
          <SelectItem value="RIGHT">Left → Right</SelectItem>
          <SelectItem value="UP">Bottom → Up</SelectItem>
          <SelectItem value="LEFT">Right → Left</SelectItem>
        </SelectContent>
      </Select>

      {/* Search */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Search (Ctrl+F)</TooltipContent>
      </Tooltip>

      {/* Filter */}
      {onFilter && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFilter}>
              <Filter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Filter Nodes</TooltipContent>
        </Tooltip>
      )}

      {/* Bulk Edit */}
      {onBulkEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBulkEdit}>
              <PenTool className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bulk Edit Selected</TooltipContent>
        </Tooltip>
      )}

      <div className="w-px h-5 bg-border" />

      {/* Share */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share Link</TooltipContent>
      </Tooltip>

      {/* Version History */}
      {onVersionHistory && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onVersionHistory}>
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Version History</TooltipContent>
        </Tooltip>
      )}

      {/* Manage Members */}
      {onManageMembers && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onManageMembers}>
              <Users className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Manage Members</TooltipContent>
        </Tooltip>
      )}

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Collaborators */}
      {collaboratorsSlot}
    </header>
  );
}
