import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useProject } from '@/context/ProjectContext';
import type { PipelineStage, KanbanList } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#64748b',
];

interface PipelineStageFormModalProps {
  boardId: string;
  stage: PipelineStage | null;
  boardLists: KanbanList[];
  open: boolean;
  onClose: () => void;
}

export function PipelineStageFormModal({
  boardId, stage, boardLists, open, onClose,
}: PipelineStageFormModalProps) {
  const { addPipelineStage, updatePipelineStage, pipelineStages } = useProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Lists already assigned to OTHER stages
  const claimedListIds = new Set(
    pipelineStages
      .filter(s => s.boardId === boardId && s.id !== stage?.id)
      .flatMap(s => s.listIds)
  );

  useEffect(() => {
    if (open) {
      setName(stage?.name ?? '');
      setDescription(stage?.description ?? '');
      setColor(stage?.color ?? PRESET_COLORS[0]);
      setSelectedListIds(stage?.listIds ?? []);
    }
  }, [open, stage]);

  const toggleList = (listId: string) => {
    setSelectedListIds(prev =>
      prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (stage) {
        await updatePipelineStage(stage.id, { name: name.trim(), description, color, listIds: selectedListIds });
      } else {
        const position = pipelineStages.filter(s => s.boardId === boardId).length;
        await addPipelineStage({ boardId, name: name.trim(), description, color, listIds: selectedListIds, position });
      }
      onClose();
    } catch (err: any) {
      toast.error(`Failed to save stage: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{stage ? 'Edit Stage' : 'Add Pipeline Stage'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="stage-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="stage-name"
              autoFocus
              placeholder="e.g. Discovery, Design, Development..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="stage-desc">Description</Label>
            <Textarea
              id="stage-desc"
              placeholder="What happens in this stage?"
              className="resize-none h-20 text-sm"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* List assignment */}
          {boardLists.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign Board Lists</Label>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {boardLists.map(list => {
                  const claimed = claimedListIds.has(list.id);
                  const checked = selectedListIds.includes(list.id);
                  return (
                    <div key={list.id} className={cn('flex items-center gap-2', claimed && 'opacity-50')}>
                      <Checkbox
                        id={`list-${list.id}`}
                        checked={checked}
                        disabled={claimed}
                        onCheckedChange={() => !claimed && toggleList(list.id)}
                      />
                      <label
                        htmlFor={`list-${list.id}`}
                        className={cn('text-sm cursor-pointer', claimed && 'cursor-not-allowed')}
                      >
                        {list.name}
                        {claimed && <span className="text-muted-foreground ml-1 text-xs">(used by another stage)</span>}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving...' : stage ? 'Save Changes' : 'Add Stage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
