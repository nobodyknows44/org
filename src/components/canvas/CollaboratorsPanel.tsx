'use client';

import { Badge } from '@/components/ui/badge';

interface CollaboratorsPanelProps {
  onlineUsers: string[];
  cursorColors: string[];
}

export function CollaboratorsPanel({ onlineUsers, cursorColors }: CollaboratorsPanelProps) {
  if (onlineUsers.length <= 1) return null; // Only show when >1 user

  return (
    <div className="flex items-center gap-1 mr-2">
      {onlineUsers.slice(0, 5).map((userId, i) => (
        <div
          key={userId}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium border-2 border-background"
          style={{ backgroundColor: cursorColors[i % cursorColors.length] }}
          title={userId}
        >
          {userId.charAt(0).toUpperCase()}
        </div>
      ))}
      {onlineUsers.length > 5 && (
        <Badge variant="secondary" className="text-[10px]">
          +{onlineUsers.length - 5}
        </Badge>
      )}
    </div>
  );
}
