import { useParams, useNavigate } from 'react-router-dom';
import { Filter, Search, Sparkles, Users, ArrowLeft, ChevronDown, Check, Kanban, GitBranch } from 'lucide-react';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { PipelineView } from '@/components/pipeline/PipelineView';
import { useProject } from '@/context/ProjectContext';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { boards, members } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'kanban' | 'pipeline'>('kanban');

  const board = boards.find(b => b.id === boardId) || { name: 'Loading...', createdAt: new Date().toISOString() };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Board Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/boards')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{board.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Created {new Date(board.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 border border-border/40">
            <button
              onClick={() => setActiveView('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                activeView === 'kanban'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Kanban className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setActiveView('pipeline')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                activeView === 'pipeline'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GitBranch className="w-3.5 h-3.5" /> Pipeline
            </button>
          </div>

          {/* Search/Filter — only shown in kanban view */}
          <div className={cn('relative w-64 hidden md:block', activeView !== 'kanban' && 'invisible')}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter tasks..."
              className="pl-10 h-9 bg-muted/50 border-border focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Filter className="w-3.5 h-3.5" />
                Filter
                {activeFilters.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              {['critical', 'high', 'medium', 'low'].map(prio => (
                <DropdownMenuItem key={prio} onClick={() => toggleFilter(prio)} className="flex items-center justify-between">
                  <span className="capitalize">{prio}</span>
                  {activeFilters.includes(prio) && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setSearchQuery(''); setActiveFilters([]); }}
                className="text-destructive focus:text-destructive"
              >
                Clear All Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Users className="w-3.5 h-3.5" /> Members
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Board Members</DropdownMenuLabel>
              <div className="p-2 space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary font-medium">
                Invite Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2 h-9 bg-primary hover:bg-primary/90">
                <Sparkles className="w-3.5 h-3.5" /> AI Actions <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem className="gap-2 py-2.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium">Summarize Board</span>
                  <span className="text-xs text-muted-foreground">Get an AI overview of all tasks</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 py-2.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium">Prioritize Tasks</span>
                  <span className="text-xs text-muted-foreground">Let AI suggest based on deadlines</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 py-2.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium">Generate Subtasks</span>
                  <span className="text-xs text-muted-foreground">Break down complex items</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Board / Pipeline */}
      <div className="flex-1 overflow-auto bg-background">
        {activeView === 'kanban'
          ? <KanbanBoard filter={searchQuery} activeFilters={activeFilters} />
          : <PipelineView boardId={boardId!} />
        }
      </div>
    </div>
  );
}
