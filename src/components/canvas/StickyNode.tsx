'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';
import { useCanvasStore, STICKY_COLORS } from '@/stores/canvasStore';

function StickyNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as OrgNodeData;
  const { updateNodeData } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const text = (nodeData.fields?.text as string) || '';
  const color = (nodeData.fields?.color as string) || STICKY_COLORS[0];

  const handleDoubleClick = useCallback(() => {
    setEditValue(text);
    setEditing(true);
  }, [text]);

  const commitEdit = useCallback(() => {
    updateNodeData(id, { text: editValue });
    setEditing(false);
  }, [id, editValue, updateNodeData]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  return (
    <div
      className={`w-[180px] min-h-[140px] rounded-sm shadow-md transition-shadow flex flex-col ${
        selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'
      }`}
      style={{ backgroundColor: color }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Folded corner effect */}
      <div className="absolute top-0 right-0 w-5 h-5 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-0 h-0"
          style={{
            borderLeft: '20px solid transparent',
            borderTop: `20px solid color-mix(in srgb, ${color} 70%, black)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-3 pt-2">
        {editing ? (
          <textarea
            ref={textareaRef}
            className="w-full h-full min-h-[100px] text-sm bg-transparent outline-none resize-none text-gray-800 placeholder:text-gray-500"
            value={editValue}
            placeholder="Type something..."
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditing(false);
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitEdit();
              }
              e.stopPropagation();
            }}
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap cursor-text text-gray-800 min-h-[100px]">
            {text || <span className="text-gray-500 italic">Double-click to edit</span>}
          </div>
        )}
      </div>

      {/* Color picker dots at bottom */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {STICKY_COLORS.map((c) => (
          <button
            key={c}
            className={`w-3.5 h-3.5 rounded-full border transition-transform ${
              c === color ? 'border-gray-600 scale-125' : 'border-gray-400/50 hover:scale-110'
            }`}
            style={{ backgroundColor: c }}
            onClick={(e) => {
              e.stopPropagation();
              updateNodeData(id, { color: c });
            }}
          />
        ))}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-2 !h-2" />
    </div>
  );
}

export const StickyNode = memo(StickyNodeComponent);
