'use client';

import { useState, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GripVertical, Plus, Trash2, X, UserPlus, Building2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { FieldDefinition, FieldType } from '@/types/database';

interface LeftSidebarProps {
  onClose: () => void;
}

export function LeftSidebar({ onClose }: LeftSidebarProps) {
  return (
    <div className="w-72 border-r bg-background flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">Settings</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-6">
          <NodePalette />
          <FieldSchemaEditor />
          <FieldVisibilityPanel />
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Draggable node palette — drag elements onto the canvas to create nodes.
 */
function NodePalette() {
  const { diagramType } = useCanvasStore();

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/orgcanvas-node', diagramType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Add Elements
      </h4>
      <p className="text-[10px] text-muted-foreground mb-2">
        Drag onto canvas or double-click canvas to add
      </p>
      <div className="space-y-1.5">
        <div
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs bg-muted/30 cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors"
          draggable
          onDragStart={handleDragStart}
        >
          {diagramType === 'org_chart' ? (
            <>
              <UserPlus className="h-4 w-4 text-primary" />
              <span className="font-medium">Person / Position</span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Entity</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldSchemaEditor() {
  const { fieldSchema, setFieldSchema } = useCanvasStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');

  const addField = useCallback(() => {
    if (!newLabel.trim()) return;

    const newField: FieldDefinition = {
      id: uuidv4(),
      label: newLabel.trim(),
      type: newType,
      required: false,
      order: fieldSchema.length,
    };

    setFieldSchema([...fieldSchema, newField]);
    setNewLabel('');
    setNewType('text');
    setAddDialogOpen(false);
  }, [newLabel, newType, fieldSchema, setFieldSchema]);

  const removeField = useCallback(
    (fieldId: string) => {
      setFieldSchema(fieldSchema.filter((f) => f.id !== fieldId));
    },
    [fieldSchema, setFieldSchema]
  );

  const toggleRequired = useCallback(
    (fieldId: string) => {
      setFieldSchema(
        fieldSchema.map((f) =>
          f.id === fieldId ? { ...f, required: !f.required } : f
        )
      );
    },
    [fieldSchema, setFieldSchema]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Field Schema
        </h4>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="e.g. Location"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addField()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={addField}>Add Field</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1.5">
        {[...fieldSchema]
          .sort((a, b) => a.order - b.order)
          .map((field) => (
            <div
              key={field.id}
              className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs bg-muted/30"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab" />
              <span className="flex-1 font-medium truncate">{field.label}</span>
              <span className="text-muted-foreground text-[10px]">{field.type}</span>
              {field.required && (
                <span className="text-destructive text-[10px] font-bold">*</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}

function FieldVisibilityPanel() {
  const { fieldSchema, layoutConfig, setLayoutConfig } = useCanvasStore();

  const toggleVisibility = useCallback(
    (fieldId: string) => {
      const current = layoutConfig.fieldVisibility[fieldId] ?? true;
      setLayoutConfig({
        fieldVisibility: {
          ...layoutConfig.fieldVisibility,
          [fieldId]: !current,
        },
      });
    },
    [layoutConfig, setLayoutConfig]
  );

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Field Visibility
      </h4>
      <div className="space-y-2">
        {[...fieldSchema]
          .sort((a, b) => a.order - b.order)
          .map((field) => {
            const visible = layoutConfig.fieldVisibility[field.id] ?? true;
            return (
              <div key={field.id} className="flex items-center justify-between">
                <Label className="text-xs cursor-pointer" htmlFor={`vis-${field.id}`}>
                  {field.label}
                </Label>
                <Switch
                  id={`vis-${field.id}`}
                  checked={visible}
                  onCheckedChange={() => toggleVisibility(field.id)}
                  className="scale-75"
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
