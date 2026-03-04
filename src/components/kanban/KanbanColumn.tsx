import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, MoreHorizontal, X, Edit2, Trash2, Check, GripVertical,
  LayoutList, CheckSquare, AlignLeft, ChevronRight
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { KanbanList as KanbanListType, Card } from '@/types';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ListDisplayType = 'cards' | 'checklist' | 'notes';

const LIST_TYPE_LABELS: Record<ListDisplayType, { label: string; icon: React.ElementType; desc: string }> = {
  cards: { label: 'Cards', icon: LayoutList, desc: 'Full task cards' },
  checklist: { label: 'Checklist', icon: CheckSquare, desc: 'Quick checkboxes' },
  notes: { label: 'Notes', icon: AlignLeft, desc: 'Simple text list' },
};

function getListType(listId: string): ListDisplayType {
  return (localStorage.getItem(`list-type-${listId}`) as ListDisplayType) || 'cards';
}

function setListType(listId: string, type: ListDisplayType) {
  localStorage.setItem(`list-type-${listId}`, type);
}

interface KanbanColumnProps {
  list: KanbanListType;
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export function KanbanColumn({ list, cards, onCardClick }: KanbanColumnProps) {
  const {
    setNodeRef, attributes, listeners, transform, transition, isDragging, isOver,
  } = useSortable({ id: list.id, data: { type: 'list', list } });
  const { addCard, updateCard, updateList, deleteList, members } = useProject();
  const { user } = useAuth();

  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(list.name);
  const [displayType, setDisplayType] = useState<ListDisplayType>(() => getListType(list.id));
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    try {
      await addCard({
        listId: list.id,
        title: newCardTitle,
        priority: 'medium',
        status: 'todo',
        createdBy: user?.id,
        labels: [],
        assignees: [],
      });
      setNewCardTitle('');
      setIsAdding(false);
    } catch (err: any) {
      toast.error(`Failed to add card: ${err.message}`);
    }
  };

  const handleRename = async () => {
    if (!editedTitle.trim() || editedTitle === list.name) {
      setIsEditingTitle(false);
      setEditedTitle(list.name);
      return;
    }
    await updateList(list.id, { name: editedTitle });
    setIsEditingTitle(false);
  };

  const handleChangeDisplayType = (type: ListDisplayType) => {
    setListType(list.id, type);
    setDisplayType(type);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const TypeIcon = LIST_TYPE_LABELS[displayType].icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col w-[300px] min-w-[300px] bg-kanban-column rounded-xl border border-border/40",
        isOver && "ring-2 ring-primary/30",
        isDragging && "opacity-50 shadow-2xl ring-2 ring-primary/30 rotate-1"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 w-full">
              <Input
                ref={titleInputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') { setIsEditingTitle(false); setEditedTitle(list.name); }
                }}
                onBlur={handleRename}
                className="h-7 text-sm font-semibold px-2 py-0 focus-visible:ring-1"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleRename}>
                <Check className="w-3.5 h-3.5 text-primary" />
              </Button>
            </div>
          ) : (
            <>
              {/* Type indicator dot */}
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0 transition-colors",
                displayType === 'checklist' ? "bg-green-500" :
                displayType === 'notes' ? "bg-amber-500" : "bg-primary"
              )} />
              <h3
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
              >
                {list.name}
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                {cards.length}
              </span>
            </>
          )}
        </div>

        {!isEditingTitle && (
          <div className="flex items-center gap-1">
            <button
              {...attributes}
              {...listeners}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Rename List
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-2 py-1">
                  Display as
                </DropdownMenuLabel>

                {(Object.entries(LIST_TYPE_LABELS) as [ListDisplayType, typeof LIST_TYPE_LABELS[ListDisplayType]][]).map(([type, meta]) => {
                  const Icon = meta.icon;
                  const active = displayType === type;
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => handleChangeDisplayType(type)}
                      className={cn("flex items-start gap-3 py-2", active && "bg-primary/5 text-primary")}
                    >
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{meta.label}</p>
                        <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
                      </div>
                      {active && <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => await deleteList(list.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Type badge */}
      {displayType !== 'cards' && (
        <div className="px-3 pb-1">
          <span className={cn(
            "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
            displayType === 'checklist'
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <TypeIcon className="w-2.5 h-2.5" />
            {LIST_TYPE_LABELS[displayType].label} mode
          </span>
        </div>
      )}

      {/* Cards Area */}
      <div className="flex-1 px-2 pb-2 min-h-[60px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>

          {/* ── CHECKLIST MODE ── */}
          {displayType === 'checklist' && (
            <div className="space-y-1 py-1">
              {cards.map(card => (
                <div
                  key={card.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg group hover:bg-muted/40 transition-colors cursor-default"
                >
                  <button
                    onClick={() => updateCard(card.id, {
                      status: card.status === 'done' ? 'todo' : 'done'
                    })}
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      card.status === 'done'
                        ? "bg-green-500 border-green-500"
                        : "border-border hover:border-green-400 bg-background"
                    )}
                  >
                    {card.status === 'done' && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <span
                    onClick={() => onCardClick(card)}
                    className={cn(
                      "text-xs flex-1 cursor-pointer",
                      card.status === 'done' ? "line-through text-muted-foreground" : "text-foreground hover:text-primary"
                    )}
                  >
                    {card.title}
                  </span>
                  <button
                    onClick={() => onCardClick(card)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── NOTES MODE ── */}
          {displayType === 'notes' && (
            <div className="space-y-1 py-1">
              {cards.map(card => (
                <button
                  key={card.id}
                  onClick={() => onCardClick(card)}
                  className="w-full text-left px-2.5 py-2 rounded-lg group hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                    <p className="text-xs text-foreground group-hover:text-primary transition-colors leading-relaxed line-clamp-2">
                      {card.title}
                    </p>
                  </div>
                  {card.description && (
                    <p className="text-[10px] text-muted-foreground ml-3 mt-0.5 line-clamp-1">{card.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── CARDS MODE (default) ── */}
          {displayType === 'cards' && cards.map(card => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} members={members} />
          ))}
        </SortableContext>

        {/* Quick-add input */}
        {isAdding && (
          <div className="bg-kanban-card rounded-lg p-3 shadow-sm border border-primary/20 animate-in slide-in-from-top-2 duration-200 mt-2">
            <Input
              autoFocus
              placeholder="What needs to be done?"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="text-sm h-8 mb-2 focus-visible:ring-1 bg-background border-border"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAddCard} className="h-7 text-xs">Add Task</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer add button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 mx-2 mb-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add card
        </button>
      )}
    </div>
  );
}
