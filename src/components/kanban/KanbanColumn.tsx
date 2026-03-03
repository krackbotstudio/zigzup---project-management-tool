import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, X, Edit2, Trash2, Check, GripVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { KanbanList as KanbanListType, Card } from '@/types';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanColumnProps {
  list: KanbanListType;
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export function KanbanColumn({ list, cards, onCardClick }: KanbanColumnProps) {
  const {
    setNodeRef, attributes, listeners, transform, transition, isDragging, isOver,
  } = useSortable({ id: list.id, data: { type: 'list', list } });
  const { addCard, updateList, deleteList, members } = useProject();
  const { user } = useAuth();

  // Card Creation State
  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  // List Edit State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(list.name);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    await addCard({
      listId: list.id,
      title: newCardTitle,
      priority: 'medium',
      status: 'todo',
      createdBy: user?.uid || '',
      labels: [],
      assignees: [],
    });
    setNewCardTitle('');
    setIsAdding(false);
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
              title="Drag to reorder list"
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Rename List
                </DropdownMenuItem>
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

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} members={members} />
          ))}
        </SortableContext>

        {isAdding && (
          <div className="bg-kanban-card rounded-lg p-3 shadow-sm border border-primary/20 animate-in slide-in-from-top-2 duration-200">
            <Input
              autoFocus
              placeholder="What needs to be done?"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="text-sm h-8 mb-2 focus-visible:ring-1"
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

      {/* Add card footer */}
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
