import { useState, useMemo, useEffect } from 'react';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  DragOverlay, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus, GitBranch, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import type { PipelineStage, PipelineStageWithStats, StageStatus } from '@/types';
import { PipelineStageCard } from './PipelineStageCard';
import { PipelineStageFormModal } from './PipelineStageFormModal';
import { cn } from '@/lib/utils';

// Template definitions
const TEMPLATES: { label: string; icon: string; stages: { name: string; color: string; description: string }[] }[] = [
  {
    label: 'Software Sprint',
    icon: '⚡',
    stages: [
      { name: 'Discovery',    color: '#6366f1', description: 'Research and requirements gathering' },
      { name: 'Design',       color: '#8b5cf6', description: 'UI/UX design and prototyping' },
      { name: 'Development',  color: '#0ea5e9', description: 'Implementation and coding' },
      { name: 'Launch',       color: '#10b981', description: 'Deployment and release' },
    ],
  },
  {
    label: 'Product Launch',
    icon: '🚀',
    stages: [
      { name: 'Ideation',   color: '#f59e0b', description: 'Concept and market research' },
      { name: 'Build',      color: '#0ea5e9', description: 'Product development' },
      { name: 'Beta',       color: '#8b5cf6', description: 'Testing and feedback' },
      { name: 'Go-Live',    color: '#10b981', description: 'Public launch' },
    ],
  },
  {
    label: 'Marketing Campaign',
    icon: '📣',
    stages: [
      { name: 'Strategy',   color: '#ec4899', description: 'Campaign planning' },
      { name: 'Creative',   color: '#8b5cf6', description: 'Content creation' },
      { name: 'Execution',  color: '#f59e0b', description: 'Campaign rollout' },
      { name: 'Analysis',   color: '#10b981', description: 'Performance review' },
    ],
  },
];

function deriveStageStatus(total: number, done: number, blocked: number, active: number): StageStatus {
  if (total === 0) return 'not-started';
  if (done === total) return 'complete';
  if (blocked > 0) return 'blocked';
  if (active > 0) return 'active';
  return 'not-started';
}

interface PipelineViewProps {
  boardId: string;
}

export function PipelineView({ boardId }: PipelineViewProps) {
  const { pipelineStages, cards, lists, addPipelineStage, deletePipelineStage, reorderPipelineStages } = useProject();
  const { user } = useAuth();

  const boardLists = useMemo(
    () => lists.filter(l => l.boardId === boardId).sort((a, b) => a.position - b.position),
    [lists, boardId]
  );

  const boardStages = useMemo(
    () => pipelineStages.filter(s => s.boardId === boardId).sort((a, b) => a.position - b.position),
    [pipelineStages, boardId]
  );

  const [orderedStages, setOrderedStages] = useState<PipelineStage[]>(boardStages);
  const [activeStage, setActiveStage] = useState<PipelineStage | null>(null);

  useEffect(() => {
    if (!activeStage) setOrderedStages(boardStages);
  }, [boardStages, activeStage]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PipelineStage | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const stagesWithStats = useMemo((): PipelineStageWithStats[] => {
    const today = new Date();
    return orderedStages.map(stage => {
      const stageCards = cards.filter(c => stage.listIds.includes(c.listId));
      const totalCards = stageCards.length;
      const doneCards = stageCards.filter(c => c.status === 'done').length;
      const blockedCards = stageCards.filter(
        c => c.status !== 'done' && c.dueDate && new Date(c.dueDate) < today
      ).length;
      const activeCards = stageCards.filter(
        c => c.status === 'in-progress' || c.status === 'review'
      ).length;
      const progressPercent = totalCards === 0 ? 0 : Math.round((doneCards / totalCards) * 100);
      const isCurrentUserHere = !!(user && stageCards.some(
        c => c.assignees.includes(user.uid) && c.status !== 'done'
      ));
      const status = deriveStageStatus(totalCards, doneCards, blockedCards, activeCards);
      return { ...stage, totalCards, doneCards, blockedCards, activeCards, progressPercent, status, isCurrentUserHere };
    });
  }, [orderedStages, cards, user]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(event: DragStartEvent) {
    const stage = boardStages.find(s => s.id === event.active.id);
    if (stage) setActiveStage(stage);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveStage(null);
    if (!over || active.id === over.id) return;
    const activeIdx = orderedStages.findIndex(s => s.id === active.id);
    const overIdx = orderedStages.findIndex(s => s.id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;
    const newOrder = arrayMove(orderedStages, activeIdx, overIdx);
    setOrderedStages(newOrder);
    reorderPipelineStages(boardId, newOrder.map(s => s.id));
  }

  const handleApplyTemplate = async (template: typeof TEMPLATES[0]) => {
    setCreatingTemplate(true);
    try {
      const base = boardStages.length;
      for (let i = 0; i < template.stages.length; i++) {
        const t = template.stages[i];
        await addPipelineStage({ boardId, name: t.name, description: t.description, color: t.color, listIds: [], position: base + i });
      }
    } finally {
      setCreatingTemplate(false);
    }
  };

  if (boardStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <GitBranch className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">No pipeline stages yet</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Define your workflow stages to visualize project progress and see which phase each task belongs to.
        </p>
        <Button onClick={() => { setEditingStage(null); setModalOpen(true); }} className="mb-6">
          <Plus className="w-4 h-4 mr-1.5" /> Add First Stage
        </Button>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Quick-start templates</p>
          <div className="flex gap-3 flex-wrap justify-center">
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                disabled={creatingTemplate}
                onClick={() => handleApplyTemplate(t)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium',
                  'hover:border-primary/40 hover:bg-muted/40 transition-all duration-200',
                  creatingTemplate && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <PipelineStageFormModal
          boardId={boardId}
          stage={editingStage}
          boardLists={boardLists}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-background/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Workflow Pipeline</span>
          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {boardStages.length} stage{boardStages.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={() => { setEditingStage(null); setModalOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Stage
        </Button>
      </div>

      {/* Stage cards */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-0 p-6 items-start">
            <SortableContext items={orderedStages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
              {stagesWithStats.map((stage, i) => (
                <div key={stage.id} className="flex items-center">
                  <PipelineStageCard
                    stage={stage}
                    listNames={stage.listIds.map(id => boardLists.find(l => l.id === id)?.name).filter(Boolean) as string[]}
                    onEdit={() => { setEditingStage(stage); setModalOpen(true); }}
                    onDelete={() => setDeleteTarget(stage)}
                  />
                  {i < stagesWithStats.length - 1 && (
                    <div className="flex items-center px-2 text-muted-foreground/40 shrink-0">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </SortableContext>

            {/* Add stage button */}
            <div className="flex items-center pl-2">
              <button
                onClick={() => { setEditingStage(null); setModalOpen(true); }}
                className="flex items-center gap-2 min-w-[120px] px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all duration-200 text-sm font-medium bg-muted/5 group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add Stage
              </button>
            </div>
          </div>

          <DragOverlay>
            {activeStage && (
              <div className="rotate-2 opacity-80 min-w-[240px] bg-card rounded-xl border border-primary/40 shadow-2xl px-3 py-2.5"
                style={{ borderLeftColor: activeStage.color, borderLeftWidth: 3 }}>
                <span className="text-sm font-semibold text-foreground">{activeStage.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Form modal */}
      <PipelineStageFormModal
        boardId={boardId}
        stage={editingStage}
        boardLists={boardLists}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingStage(null); }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This stage will be removed. Your Kanban lists and cards are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) await deletePipelineStage(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
