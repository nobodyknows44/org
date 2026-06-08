'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Link2,
  RotateCcw,
  Edit3,
  Upload,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

interface ActivityEntry {
  id: string;
  diagram_id: string;
  user_id: string;
  action: string;
  description: string;
  created_at: string;
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  node_created: Plus,
  node_deleted: Trash2,
  edge_created: Link2,
  edge_deleted: Trash2,
  version_restored: RotateCcw,
  node_updated: Edit3,
  import: Upload,
  layout: LayoutGrid,
};

const ACTION_COLORS: Record<string, string> = {
  node_created: 'bg-green-100 text-green-800',
  node_deleted: 'bg-red-100 text-red-800',
  edge_created: 'bg-blue-100 text-blue-800',
  edge_deleted: 'bg-red-100 text-red-800',
  version_restored: 'bg-amber-100 text-amber-800',
  node_updated: 'bg-purple-100 text-purple-800',
  import: 'bg-teal-100 text-teal-800',
  layout: 'bg-indigo-100 text-indigo-800',
};

interface ActivityLogProps {
  diagramId: string;
}

export function ActivityLog({ diagramId }: ActivityLogProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const supabase = createBrowserClient();
        const pageSize = 20;
        const { data } = (await supabase
          .from('activity_log')
          .select('*')
          .eq('diagram_id', diagramId)
          .order('created_at', { ascending: false })
          .range((pageNum - 1) * pageSize, pageNum * pageSize - 1)) as unknown as {
          data: ActivityEntry[] | null;
        };

        if (pageNum === 1) {
          setEntries(data || []);
        } else {
          setEntries((prev) => [...prev, ...(data || [])]);
        }
        setHasMore((data?.length || 0) === pageSize);
      } catch (err) {
        console.error('Failed to fetch activity log:', err);
      } finally {
        setLoading(false);
      }
    },
    [diagramId]
  );

  useEffect(() => {
    fetchEntries(1);
  }, [fetchEntries]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="space-y-2">
      {loading && entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading activity...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
      ) : (
        <ScrollArea className="max-h-96">
          <div className="space-y-1">
            {entries.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] || Edit3;
              const colorClass = ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-800';
              return (
                <div key={entry.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted text-sm">
                  <div className={`p-1 rounded ${colorClass} shrink-0 mt-0.5`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{entry.description}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchEntries(next);
              }}
              disabled={loading}
            >
              Load More
            </Button>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
