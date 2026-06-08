'use client';

import type { CursorPresence } from '@/hooks/useRealtimeCollaboration';

interface CursorOverlayProps {
  cursors: Map<string, CursorPresence>;
  currentUserId?: string;
}

export function CursorOverlay({ cursors, currentUserId }: CursorOverlayProps) {
  return (
    <>
      {Array.from(cursors.values())
        .filter((c) => c.userId !== currentUserId)
        .map((cursor) => (
          <div
            key={cursor.userId}
            className="pointer-events-none absolute z-40 transition-all duration-100 ease-out"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor arrow */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M0 0L16 12L8.5 12L5 20L0 0Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            {/* Name label */}
            <div
              className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] text-white font-medium whitespace-nowrap"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName.split('@')[0]}
            </div>
          </div>
        ))}
    </>
  );
}
