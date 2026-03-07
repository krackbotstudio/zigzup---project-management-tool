import { useState, useRef, useEffect } from 'react';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns2, GripVertical, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // can't hide (e.g. Name)
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'name',        label: 'Name',          visible: true,  locked: true },
  { id: 'company',     label: 'Company',        visible: true },
  { id: 'email',       label: 'Email',          visible: true },
  { id: 'phone',       label: 'Phone',          visible: true },
  { id: 'stage',       label: 'Stage',          visible: true },
  { id: 'dealValue',   label: 'Deal Value',     visible: true },
  { id: 'source',      label: 'Source',         visible: true },
  { id: 'priority',    label: 'Priority',       visible: true },
  { id: 'owner',       label: 'Owner',          visible: false },
  { id: 'website',     label: 'Website',        visible: false },
  { id: 'daysInStage', label: 'Days in Stage',  visible: false },
  { id: 'tags',        label: 'Tags',           visible: false },
  { id: 'notes',       label: 'Notes',          visible: false },
  { id: 'created',     label: 'Created',        visible: true },
];

const STORAGE_KEY = 'crm-table-columns-v2';

export function loadColumns(): ColumnDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNS;
    const saved: ColumnDef[] = JSON.parse(raw);
    // Merge: keep saved order/visibility, add any new columns from defaults
    const savedIds = new Set(saved.map(c => c.id));
    const merged = [
      ...saved.map(s => {
        const def = DEFAULT_COLUMNS.find(d => d.id === s.id);
        return def ? { ...s, label: def.label, locked: def.locked } : s;
      }),
      ...DEFAULT_COLUMNS.filter(d => !savedIds.has(d.id)),
    ];
    return merged;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export function saveColumns(cols: ColumnDef[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

// ── Sortable row ──────────────────────────────────────────
function SortableRow({ col, onToggle }: { col: ColumnDef; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md group',
        isDragging ? 'bg-primary/10 z-50' : 'hover:bg-muted/50'
      )}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </span>

      {/* Label */}
      <span className={cn('flex-1 text-xs', col.visible ? 'text-foreground' : 'text-muted-foreground/50')}>
        {col.label}
        {col.locked && <span className="ml-1 text-[10px] text-muted-foreground/40">(required)</span>}
      </span>

      {/* Toggle */}
      <button
        onClick={onToggle}
        disabled={col.locked}
        className={cn(
          'p-0.5 rounded transition-colors shrink-0',
          col.locked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted',
          col.visible ? 'text-primary' : 'text-muted-foreground/40'
        )}
        title={col.visible ? 'Hide column' : 'Show column'}
      >
        {col.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ── Main ColumnCustomizer ─────────────────────────────────
interface Props {
  columns: ColumnDef[];
  onChange: (cols: ColumnDef[]) => void;
}

export function ColumnCustomizer({ columns, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex(c => c.id === active.id);
    const newIndex = columns.findIndex(c => c.id === over.id);
    onChange(arrayMove(columns, oldIndex, newIndex));
  };

  const toggleColumn = (id: string) => {
    onChange(columns.map(c => c.id === id && !c.locked ? { ...c, visible: !c.visible } : c));
  };

  const visibleCount = columns.filter(c => c.visible).length;
  const hiddenCount  = columns.length - visibleCount;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors',
          open
            ? 'bg-primary/10 border-primary/40 text-primary'
            : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80'
        )}
        title="Customize columns"
      >
        <Columns2 className="w-3.5 h-3.5" />
        Columns
        {hiddenCount > 0 && (
          <span className="bg-primary/20 text-primary text-[10px] px-1 rounded-full">{visibleCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-xs font-semibold">Columns</span>
            <button
              onClick={() => onChange(DEFAULT_COLUMNS)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Sortable list */}
          <div className="p-1.5 max-h-80 overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {columns.map(col => (
                  <SortableRow key={col.id} col={col} onToggle={() => toggleColumn(col.id)} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
            {visibleCount} visible · drag to reorder
          </div>
        </div>
      )}
    </div>
  );
}
