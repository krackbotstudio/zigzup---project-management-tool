import { useEffect, useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { Plus, Users, GitBranch, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { useProject } from '@/context/ProjectContext';
import { CRMLeadWithCard, CRMViewMode, KanbanList } from '@/types';
import { LeadCard } from '@/components/crm/LeadCard';
import { LeadFormModal } from '@/components/crm/LeadFormModal';
import { CRMStatsBar } from '@/components/crm/CRMStatsBar';
import { ViewSwitcher } from '@/components/crm/ViewSwitcher';
import { CRMTableView } from '@/components/crm/CRMTableView';
import { CRMListView } from '@/components/crm/CRMListView';
import { ImportLeadsModal } from '@/components/crm/ImportLeadsModal';
import { cn } from '@/lib/utils';

// ── Droppable column (Kanban) ─────────────────────────────
function PipelineColumn({
  list, leads, onAddLead,
}: {
  list: KanbanList;
  leads: CRMLeadWithCard[];
  onAddLead: (listId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });

  const STAGE_COLORS: Record<string, string> = {
    'Won':               'border-t-emerald-500',
    'Lost':              'border-t-red-400',
    'New Lead':          'border-t-blue-400',
    'Contacted':         'border-t-indigo-400',
    'Meeting Scheduled': 'border-t-purple-400',
    'Proposal Sent':     'border-t-amber-400',
    'Negotiation':       'border-t-orange-400',
  };

  const totalValue = leads.reduce((s, l) => s + (l.dealValue ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-[270px] shrink-0 rounded-xl border border-border border-t-2 bg-muted/20 transition-colors duration-150',
        STAGE_COLORS[list.name] || 'border-t-primary',
        isOver && 'bg-primary/5 border-primary/40'
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{list.name}</span>
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
            {leads.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {totalValue > 0 && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              ${totalValue >= 1000 ? (totalValue / 1000).toFixed(1) + 'K' : totalValue}
            </span>
          )}
          <button
            onClick={() => onAddLead(list.id)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border-2 border-dashed border-border/30 rounded-lg">
            Drop leads here
          </div>
        )}
      </div>

      <button
        onClick={() => onAddLead(list.id)}
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-b-xl border-t border-border/30"
      >
        <Plus className="w-3.5 h-3.5" /> Add lead
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────
export default function CRMDashboard() {
  const {
    leadsWithCards, crmBoardId, crmLists, initCRMBoard,
    moveLeadToStage, migrationNeeded, crmLoading,
  } = useCRM();
  const { activeWorkspaceId } = useProject();

  const [viewMode, setViewMode]     = useState<CRMViewMode>('table');
  const [initialising, setInitialising] = useState(false);
  const [initError, setInitError]   = useState<string | null>(null);
  const [leadModal, setLeadModal]   = useState<{ open: boolean; listId?: string }>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const runInit = async () => {
    setInitialising(true);
    setInitError(null);
    try {
      await initCRMBoard();
    } catch (err: any) {
      const msg = err.message ?? 'Unknown error';
      setInitError(msg);
      toast.error('CRM setup failed', { description: msg });
    } finally {
      setInitialising(false);
    }
  };

  // Auto-init: wait until CRM load settles AND workspace is confirmed
  useEffect(() => {
    if (!crmLoading && activeWorkspaceId && !crmBoardId && !initialising && !migrationNeeded) {
      runInit();
    }
  }, [crmLoading, activeWorkspaceId, crmBoardId, migrationNeeded]);

  const handleDragStart = (event: DragStartEvent) => setDraggedCardId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedCardId(null);
    if (!over || active.id === over.id) return;
    const cardId = active.id as string;
    const targetListId = over.id as string;
    const lead = leadsWithCards.find(l => l.card.id === cardId);
    if (lead && lead.card.listId !== targetListId) {
      moveLeadToStage(cardId, targetListId, lead.id);
    }
  };

  const draggedLead = draggedCardId ? leadsWithCards.find(l => l.card.id === draggedCardId) : null;

  // ── Migration needed ─────────────────────────────────────
  if (migrationNeeded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold">Database migration required</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          The CRM module needs new database tables. Run <strong>supabase_migration_crm.sql</strong> in your Supabase SQL Editor to enable it.
        </p>
        <div className="flex flex-col gap-2 items-start text-sm text-muted-foreground bg-muted/30 rounded-xl px-5 py-4 border border-border font-mono text-xs max-w-sm w-full">
          <p>1. Open Supabase Dashboard → SQL Editor</p>
          <p>2. Paste contents of <strong>supabase_migration_crm.sql</strong></p>
          <p>3. Click Run, then refresh this page</p>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────
  if (crmLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading CRM…</span>
        </div>
      </div>
    );
  }

  // ── Initialising ─────────────────────────────────────────
  if (initialising) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Setting up your CRM pipeline…</span>
        </div>
      </div>
    );
  }

  // ── Empty / setup state ───────────────────────────────────
  if (!crmBoardId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <GitBranch className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Sales CRM not set up</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Set up your sales pipeline to start tracking leads, deals, and customer relationships.
        </p>
        {initError && (
          <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg max-w-sm text-center">
            {initError}
          </p>
        )}
        <Button onClick={runInit} disabled={initialising}>
          <Plus className="w-4 h-4 mr-1.5" /> Initialize CRM Pipeline
        </Button>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-background/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Sales Pipeline</span>
          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {leadsWithCards.length} leads
          </span>
          <ViewSwitcher view={viewMode} onChange={setViewMode} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
          <Button
            size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
            asChild
          >
            <Link to="/crm/contacts">
              <Users className="w-3.5 h-3.5" /> Contacts
            </Link>
          </Button>
          <Button
            size="sm" className="h-8 gap-1.5 text-xs"
            onClick={() => setLeadModal({ open: true })}
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="shrink-0">
        <CRMStatsBar />
      </div>

      {/* View content */}
      <div className="flex-1 overflow-auto">
        {/* Table view */}
        {viewMode === 'table' && <CRMTableView />}

        {/* List view */}
        {viewMode === 'list' && (
          <div className="p-0">
            <CRMListView />
          </div>
        )}

        {/* Kanban view */}
        {viewMode === 'kanban' && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 p-6 items-start">
              {crmLists.map(list => (
                <PipelineColumn
                  key={list.id}
                  list={list}
                  leads={leadsWithCards.filter(l => l.card.listId === list.id)}
                  onAddLead={listId => setLeadModal({ open: true, listId })}
                />
              ))}
            </div>

            <DragOverlay>
              {draggedLead && (
                <div className="rotate-2 opacity-90 w-[270px]">
                  <LeadCard lead={draggedLead} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modals */}
      <LeadFormModal
        open={leadModal.open}
        onClose={() => setLeadModal({ open: false })}
        initialListId={leadModal.listId}
      />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
