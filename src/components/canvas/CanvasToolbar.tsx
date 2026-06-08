'use client';

import { useCanvasStore, type CanvasToolMode } from '@/stores/canvasStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MousePointer2,
  UserPlus,
  Building2,
  Type,
  StickyNote,
  Spline,
  MessageSquare,
  LayoutGrid,
  Plus,
  Map,
  Grid3x3,
  Upload,
  Download,
  Presentation,
} from 'lucide-react';

interface CanvasToolbarProps {
  onTemplates: () => void;
  onComments: () => void;
  onImport?: () => void;
  onExport: () => void;
  onPresentationMode?: () => void;
}

export function CanvasToolbar({
  onTemplates,
  onComments,
  onImport,
  onExport,
  onPresentationMode,
}: CanvasToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    diagramType,
    showMinimap,
    setShowMinimap,
    snapToGrid,
    setSnapToGrid,
  } = useCanvasStore();

  const tools: {
    id: CanvasToolMode;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
  }[] = [
    {
      id: 'select',
      label: 'Select',
      icon: <MousePointer2 className="h-[18px] w-[18px]" />,
      shortcut: 'V',
    },
    {
      id: 'addNode',
      label: diagramType === 'org_chart' ? 'Add Person' : 'Add Entity',
      icon:
        diagramType === 'org_chart' ? (
          <UserPlus className="h-[18px] w-[18px]" />
        ) : (
          <Building2 className="h-[18px] w-[18px]" />
        ),
      shortcut: 'N',
    },
    {
      id: 'addText',
      label: 'Text',
      icon: <Type className="h-[18px] w-[18px]" />,
      shortcut: 'T',
    },
    {
      id: 'addSticky',
      label: 'Sticky Note',
      icon: <StickyNote className="h-[18px] w-[18px]" />,
      shortcut: 'S',
    },
    {
      id: 'connect',
      label: 'Connect',
      icon: <Spline className="h-[18px] w-[18px]" />,
      shortcut: 'C',
    },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5">
      {/* Main tool group */}
      <div className="flex items-center gap-0.5 bg-zinc-900 dark:bg-zinc-800 rounded-xl px-1.5 py-1.5 shadow-2xl border border-zinc-700/50">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <button
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                  activeTool === tool.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60'
                }`}
                onClick={() => setActiveTool(tool.id)}
              >
                {tool.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {tool.label}
              {tool.shortcut && (
                <span className="ml-1.5 text-muted-foreground">({tool.shortcut})</span>
              )}
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Separator */}
        <div className="w-px h-6 bg-zinc-600 mx-1" />

        {/* Comments */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-all"
              onClick={onComments}
            >
              <MessageSquare className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Comments</TooltipContent>
        </Tooltip>

        {/* Templates */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-all"
              onClick={onTemplates}
            >
              <LayoutGrid className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Templates</TooltipContent>
        </Tooltip>

        {/* Separator */}
        <div className="w-px h-6 bg-zinc-600 mx-1" />

        {/* More (+) dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-all">
                  <Plus className="h-[18px] w-[18px]" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">More actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="top" align="end" className="min-w-[160px]">
            {onImport && (
              <DropdownMenuItem onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            {onPresentationMode && (
              <DropdownMenuItem onClick={onPresentationMode}>
                <Presentation className="h-4 w-4 mr-2" />
                Presentation Mode
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right group — toggles */}
      <div className="flex items-center gap-0.5 bg-zinc-900 dark:bg-zinc-800 rounded-xl px-1.5 py-1.5 shadow-2xl border border-zinc-700/50">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                showMinimap
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60'
              }`}
              onClick={() => setShowMinimap(!showMinimap)}
            >
              <Map className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {showMinimap ? 'Hide Minimap' : 'Show Minimap'} (M)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                snapToGrid
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60'
              }`}
              onClick={() => setSnapToGrid(!snapToGrid)}
            >
              <Grid3x3 className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {snapToGrid ? 'Disable Snap to Grid' : 'Enable Snap to Grid'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
