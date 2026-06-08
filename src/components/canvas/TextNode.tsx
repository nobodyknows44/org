'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';
import { useCanvasStore } from '@/stores/canvasStore';

function TextNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as OrgNodeData;
  const { updateNodeData } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const text = (nodeData.fields?.text as string) || '';

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
      className={`min-w-[120px] max-w-[300px] transition-shadow ${
        selected ? 'ring-2 ring-primary rounded' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          className="w-full min-h-[32px] p-1 text-sm bg-transparent border border-primary rounded outline-none resize-y"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditing(false);
            }
            // Allow Shift+Enter for newlines, plain Enter to commit
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitEdit();
            }
            e.stopPropagation();
          }}
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap cursor-text text-foreground px-1 py-0.5">
          {text || <span className="text-muted-foreground italic">Double-click to edit</span>}
        </div>
      )}

      {/* Tiny transparent handles for connecting */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-2 !h-2" />
    </div>
  );
}

export const TextNode = memo(TextNodeComponent);
