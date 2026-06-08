'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import Fuse from 'fuse.js';

interface SearchBarProps {
  open: boolean;
  onClose: () => void;
}

export function SearchBar({ open, onClose }: SearchBarProps) {
  const { nodes, fieldSchema } = useCanvasStore();
  const { setCenter } = useReactFlow();
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  // Build searchable data
  const searchData = useMemo(() => {
    return nodes.map((node) => {
      const fields = (node.data as any).fields || {};
      const searchableFields: Record<string, string> = {};
      fieldSchema.forEach((f) => {
        searchableFields[f.label] = String(fields[f.id] || '');
      });
      return { id: node.id, ...searchableFields, position: node.position };
    });
  }, [nodes, fieldSchema]);

  const fuse = useMemo(() => {
    const keys = fieldSchema.map((f) => f.label);
    return new Fuse(searchData, { keys, threshold: 0.3 });
  }, [searchData, fieldSchema]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query);
  }, [query, fuse]);

  const navigateToMatch = useCallback(
    (index: number) => {
      if (results.length === 0) return;
      const safeIndex = ((index % results.length) + results.length) % results.length;
      setMatchIndex(safeIndex);
      const match = results[safeIndex];
      if (match) {
        setCenter(match.item.position.x + 110, match.item.position.y + 75, {
          zoom: 1.2,
          duration: 400,
        });
      }
    },
    [results, setCenter]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        navigateToMatch(e.shiftKey ? matchIndex - 1 : matchIndex + 1);
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [matchIndex, navigateToMatch, onClose]
  );

  // Navigate on first result
  useEffect(() => {
    if (results.length > 0) {
      navigateToMatch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length]);

  if (!open) return null;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-popover border rounded-lg shadow-lg p-2 flex items-center gap-2 min-w-[320px]">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        className="h-7 text-sm border-0 focus-visible:ring-0 p-0"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setMatchIndex(0);
        }}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {results.length > 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {matchIndex + 1}/{results.length}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => navigateToMatch(matchIndex - 1)}
          disabled={results.length === 0}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => navigateToMatch(matchIndex + 1)}
          disabled={results.length === 0}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
