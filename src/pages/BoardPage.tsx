import { useParams } from 'react-router-dom';
import { Filter, Search, Sparkles, Users } from 'lucide-react';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { mockBoards } from '@/data/mock';

export default function BoardPage() {
  const { boardId } = useParams();
  const board = mockBoards.find(b => b.id === boardId) ?? mockBoards[0];

  return (
    <div className="flex flex-col h-screen">
      {/* Board Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div>
          <h1 className="text-lg font-bold text-foreground">{board.name}</h1>
          <p className="text-xs text-muted-foreground">Created {new Date(board.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors border border-border">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors border border-border">
            <Users className="w-3.5 h-3.5" /> Members
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
            <Sparkles className="w-3.5 h-3.5" /> AI Actions
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto bg-background">
        <KanbanBoard />
      </div>
    </div>
  );
}
