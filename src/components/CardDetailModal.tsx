import {
  X, Calendar as CalendarIcon, Tag, Users, CheckSquare, MessageSquare,
  Sparkles, Trash2, ChevronDown, Link as LinkIcon,
  ExternalLink, Plus, Globe, Send, MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Card, Priority, Label, ChecklistItem, CardLink, CardComment } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/context/ProjectContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const priorityColors: Record<Priority, string> = {
  critical: 'bg-priority-critical text-white',
  high: 'bg-priority-high text-white',
  medium: 'bg-priority-medium text-black',
  low: 'bg-priority-low text-white',
};

const availableLabels: Label[] = [
  { id: 'lb-1', name: 'Design', color: 'hsl(351 60% 50%)' },
  { id: 'lb-2', name: 'Feature', color: 'hsl(210 72% 55%)' },
  { id: 'lb-3', name: 'Backend', color: 'hsl(25 95% 53%)' },
  { id: 'lb-4', name: 'DevOps', color: 'hsl(152 60% 46%)' },
];

interface CardDetailModalProps {
  card: Card | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Card>) => void;
}

export function CardDetailModal({ card, onClose, onUpdate }: CardDetailModalProps) {
  const { deleteCard, members } = useProject();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [newTodo, setNewTodo] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority);
    }
  }, [card]);

  if (!card) return null;

  const handleUpdate = (updates: Partial<Card>) => {
    onUpdate(updates);
  };

  // Checklist logic
  const toggleTodo = (todoId: string) => {
    const newItems = card.checklistItems?.map(item =>
      item.id === todoId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    handleUpdate({ checklistItems: newItems });
  };

  const addCriterion = () => {
    if (!newTodo.trim()) return;
    const newItem: ChecklistItem = {
      id: `ci-${Date.now()}`,
      content: newTodo,
      isCompleted: false
    };
    handleUpdate({ checklistItems: [...(card.checklistItems || []), newItem] });
    setNewTodo('');
  };

  const removeTodo = (todoId: string) => {
    handleUpdate({ checklistItems: card.checklistItems?.filter(i => i.id !== todoId) });
  };

  // Links/Embeds logic
  const addLink = (type: 'link' | 'embed') => {
    if (!newLinkUrl.trim()) return;
    const newLink: CardLink = {
      id: `link-${Date.now()}`,
      title: newLinkTitle || (newLinkUrl.split('//')[1]?.split('/')[0] || 'Link'),
      url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`,
      type
    };
    handleUpdate({ links: [...(card.links || []), newLink] });
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const removeLink = (id: string) => {
    handleUpdate({ links: card.links?.filter(l => l.id !== id) });
  };

  // Comments logic
  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment: CardComment = {
      id: `comment-${Date.now()}`,
      userId: 'u-1',
      userName: 'Alex Chen',
      text: commentText,
      createdAt: new Date().toISOString()
    };
    handleUpdate({
      comments: [...(card.comments || []), newComment],
      commentsCount: (card.commentsCount || 0) + 1
    });
    setCommentText('');
  };

  const toggleAssignee = (userId: string) => {
    const isAssigned = card.assignees.includes(userId);
    const newAssignees = isAssigned
      ? card.assignees.filter(id => id !== userId)
      : [...card.assignees, userId];
    handleUpdate({ assignees: newAssignees });
  };

  const toggleLabel = (label: Label) => {
    const isLabeled = card.labels.some(l => l.id === label.id);
    const newLabels = isLabeled
      ? card.labels.filter(l => l.id !== label.id)
      : [...card.labels, label];
    handleUpdate({ labels: newLabels });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 backdrop-blur-sm bg-foreground/10 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="relative bg-popover text-popover-foreground rounded-2xl shadow-elegant w-full max-w-4xl max-h-[90vh] flex flex-col border border-border animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between p-6 pb-2 shrink-0 border-b border-border/50 bg-muted/5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn("text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all shadow-sm ring-1 ring-inset ring-foreground/10", priorityColors[priority])}>
                    {priority} <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
                    <DropdownMenuItem key={p} onClick={() => { setPriority(p); handleUpdate({ priority: p }); }} className="text-xs">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-4 w-px bg-border" />

              <div className="flex items-center gap-2 text-xs font-medium">
                {/* Start Date Picker */}
                <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Start: {card.startDate ? format(new Date(card.startDate), 'MMM d, yyyy') : 'Set date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={card.startDate ? new Date(card.startDate) : undefined}
                      onSelect={(date) => {
                        handleUpdate({ startDate: date ? date.toISOString() : undefined });
                        setStartPickerOpen(false);
                      }}
                      initialFocus
                    />
                    {card.startDate && (
                      <div className="border-t border-border p-2">
                        <button
                          onClick={() => { handleUpdate({ startDate: undefined }); setStartPickerOpen(false); }}
                          className="w-full text-xs text-muted-foreground hover:text-destructive py-1 transition-colors"
                        >
                          Clear date
                        </button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Due Date Picker */}
                <Popover open={duePickerOpen} onOpenChange={setDuePickerOpen}>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors",
                      card.dueDate && new Date(card.dueDate) < new Date()
                        ? "text-priority-critical hover:text-priority-critical"
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Due: {card.dueDate ? format(new Date(card.dueDate), 'MMM d, yyyy') : 'Set date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={card.dueDate ? new Date(card.dueDate) : undefined}
                      onSelect={(date) => {
                        handleUpdate({ dueDate: date ? date.toISOString() : undefined });
                        setDuePickerOpen(false);
                      }}
                      initialFocus
                    />
                    {card.dueDate && (
                      <div className="border-t border-border p-2">
                        <button
                          onClick={() => { handleUpdate({ dueDate: undefined }); setDuePickerOpen(false); }}
                          className="w-full text-xs text-muted-foreground hover:text-destructive py-1 transition-colors"
                        >
                          Clear date
                        </button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleUpdate({ title })}
              className="text-2xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 shadow-none h-auto mb-1 tracking-tight"
              placeholder="Task title..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => { deleteCard(card.id); onClose(); }} className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4.5 h-4.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 text-muted-foreground">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content (Left) */}
            <div className="lg:col-span-8 space-y-10">

              {/* Description Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  Description
                </h3>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleUpdate({ description })}
                  placeholder="What is this task about?"
                  className="min-h-[140px] text-sm bg-muted/10 border-border/50 focus:bg-background transition-all rounded-xl leading-relaxed"
                />
              </section>

              {/* Checklist Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4 text-primary" /> Checklist / Todos
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {card.checklistItems?.filter(i => i.isCompleted).length || 0} / {card.checklistItems?.length || 0}
                  </span>
                </div>

                <div className="space-y-2">
                  {card.checklistItems?.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-muted/10 p-2.5 rounded-xl group hover:bg-muted/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => toggleTodo(item.id)}
                        className="w-4.5 h-4.5 rounded-md border-border text-primary shadow-sm"
                      />
                      <span className={cn("text-sm flex-1", item.isCompleted && "line-through text-muted-foreground")}>
                        {item.content}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => removeTodo(item.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pl-7 mt-3">
                    <Input
                      placeholder="Add an item..."
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
                      className="text-sm h-9 bg-transparent border-dashed"
                    />
                    <Button onClick={addCriterion} size="sm" className="h-9 shrink-0 gap-1.5 px-3">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </section>

              {/* Links & Embeds Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2.5">
                  <LinkIcon className="w-4 h-4 text-primary" /> Links & Resources
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {card.links?.filter(l => l.type === 'link').map(link => (
                    <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background shadow-sm hover:border-primary/30 transition-all group">
                      <div className="p-2 bg-primary/5 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{link.title}</p>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline truncate block">
                          {link.url}
                        </a>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}

                  <div className="p-3 rounded-xl border border-dashed border-border bg-muted/5 flex flex-col gap-2">
                    <Input
                      placeholder="Link title (optional)"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="text-[11px] h-7 px-2"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste URL here..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="text-[11px] h-7 px-2 flex-1"
                      />
                      <Button onClick={() => addLink('link')} size="sm" className="h-7 text-[10px] font-bold">
                        Attach
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Website Embeds */}
                {card.links?.some(l => l.type === 'embed') && (
                  <div className="mt-8 space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" /> Website Previews
                    </h4>
                    <div className="space-y-6">
                      {card.links?.filter(l => l.type === 'embed').map(embed => (
                        <div key={embed.id} className="p-0 rounded-2xl border border-border overflow-hidden bg-background shadow-lg group">
                          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 opacity-60" />
                              <span className="text-[10px] font-bold tracking-wide uppercase opacity-70">{embed.title}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeLink(embed.id)} className="h-6 w-6">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="aspect-video w-full relative bg-muted">
                            <iframe
                              src={embed.url}
                              className="absolute inset-0 w-full h-full border-0 pointer-events-none opacity-90 group-hover:pointer-events-auto group-hover:opacity-100 transition-all"
                              title={embed.title}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:hidden backdrop-blur-[1px]">
                              <Button variant="secondary" size="sm" className="gap-2 h-7 text-[10px]">
                                Click to Interact
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Comments Section */}
              <section className="pt-6 border-t border-border">
                <h3 className="text-sm font-bold flex items-center gap-2.5 mb-6">
                  <MessageSquare className="w-4 h-4 text-primary" /> Team Updates & Discussion
                </h3>

                <div className="space-y-6">
                  {card.comments?.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-xs font-bold text-primary">
                        {comment.userName.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{comment.userName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-2xl rounded-tl-none text-sm leading-relaxed text-foreground/90 inline-block max-w-full">
                          {comment.text}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-4 mt-8 bg-muted/10 p-4 rounded-2xl border border-border/40">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border text-xs font-bold text-muted-foreground">
                      A
                    </div>
                    <div className="flex-1 relative flex flex-col gap-2">
                      <Textarea
                        placeholder="Type your update or mention a teammate..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="min-h-[80px] bg-background border-none shadow-none focus-visible:ring-0 text-sm p-0 mb-8"
                      />
                      <div className="absolute bottom-0 right-0 flex items-center gap-3">
                        <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-2">
                          <Tag className="w-3.5 h-3.5" /> Mention
                        </Button>
                        <Button size="sm" onClick={addComment} className="h-8 px-4 gap-2 text-[11px] font-bold shadow-lg shadow-primary/20">
                          Post Update <Send className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar (Right) */}
            <div className="lg:col-span-4 space-y-8">

              {/* Assignees Side Panel */}
              <div className="bg-card rounded-2xl border border-border/80 shadow-sm p-5 space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  Collaborators
                  <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="w-4 h-4" /></Button>
                </h3>
                <div className="space-y-3">
                  {members.map(member => (
                    <button
                      key={member.id}
                      onClick={() => toggleAssignee(member.userId)}
                      className={cn(
                        "flex items-center gap-3 w-full p-2.5 rounded-xl transition-all border border-transparent",
                        card.assignees.includes(member.userId)
                          ? "bg-primary/5 border-primary/20"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-background">
                        {member.name.charAt(0)}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-xs font-bold text-foreground truncate">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                      </div>
                      {card.assignees.includes(member.userId) && (
                        <div className="ml-auto flex items-center text-primary">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags Section */}
              <div className="bg-card rounded-2xl border border-border/80 shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Tags & Labels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map(label => {
                    const active = card.labels.some(l => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2",
                          active
                            ? "border-transparent text-white font-bold"
                            : "bg-transparent border-border text-muted-foreground hover:border-primary/50"
                        )}
                        style={{ backgroundColor: active ? label.color : undefined }}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-white" : "bg-muted-foreground")} style={{ backgroundColor: active ? 'white' : label.color }} />
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side AI Helper */}
              <div className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl border border-primary/10 shadow-inner relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Copilot Insights
                </h3>
                <p className="text-[11px] text-foreground/80 leading-relaxed mb-4 relative z-10">
                  This task has <strong>{card.checklistItems?.length || 0} subtasks</strong>. Based on team availability, I suggest assigning this to <strong>Dev Patel</strong> to ensure the deadline is met.
                </p>
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <Button variant="secondary" size="sm" className="w-full text-[10px] h-8 bg-background/80 hover:bg-background shadow-sm border-border/50">
                    Ask AI
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-[10px] h-8 hover:bg-background border-primary/20">
                    Log Time
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6L9 17l-5-5" /></svg>
  )
}
