import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, X, Minimize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { callClaude, type ClaudeMessage } from '@/lib/claude';
import { useProject } from '@/context/ProjectContext';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

function buildSystemPrompt(
  boards: ReturnType<typeof useProject>['boards'],
  cards: ReturnType<typeof useProject>['cards'],
  lists: ReturnType<typeof useProject>['lists'],
  members: ReturnType<typeof useProject>['members']
): string {
  const boardSummary = boards.map(b => `- Board: "${b.name}" (id: ${b.id})`).join('\n');
  const listSummary = lists.map(l => `- List: "${l.name}" in board ${l.boardId}`).join('\n');
  const cardSummary = cards.slice(0, 40).map(c =>
    `- "${c.title}" | priority: ${c.priority} | status: ${c.status} | due: ${c.dueDate ?? 'none'}`
  ).join('\n');
  const memberSummary = members.map(m => `- ${m.name} (${m.email})`).join('\n');

  return `You are Zig, a friendly and smart AI project management assistant for ZigZup.
You help users understand their project status, prioritize tasks, and get work done.
Keep responses concise (2-4 sentences max), actionable, and friendly.
Never refuse a reasonable project management question.

Current workspace data:
BOARDS:
${boardSummary || 'No boards yet.'}

LISTS:
${listSummary || 'No lists yet.'}

TASKS (up to 40):
${cardSummary || 'No tasks yet.'}

MEMBERS:
${memberSummary || 'No members yet.'}

Today's date: ${new Date().toDateString()}`;
}

export function ZigChat() {
  const { boards, cards, lists, members } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey! I'm Zig, your AI project assistant. Ask me anything about your tasks, priorities, or project status!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history: ClaudeMessage[] = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      history.push({ role: 'user', content: text });

      const systemPrompt = buildSystemPrompt(boards, cards, lists, members);
      const reply = await callClaude(history, systemPrompt);

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: err.message.includes('API key')
            ? 'API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.'
            : `Sorry, I hit an error: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      {isOpen && (
        <div className="w-[360px] h-[480px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none">Zig</p>
                <p className="text-[10px] opacity-75 leading-none mt-0.5">AI Project Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2 max-w-[90%]',
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  msg.role === 'user' ? 'bg-primary/10' : 'bg-muted'
                )}>
                  {msg.role === 'user'
                    ? <User className="w-3 h-3 text-primary" />
                    : <Bot className="w-3 h-3 text-indigo-500" />}
                </div>
                <div className={cn(
                  'px-3 py-2 rounded-xl text-xs leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted/50 text-foreground border border-border rounded-tl-none'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 mr-auto items-center">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-3 h-3 text-indigo-500" />
                </div>
                <div className="bg-muted/50 px-3 py-2 rounded-xl rounded-tl-none border border-border">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask Zig anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                  input.trim() && !isLoading
                    ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95',
          isOpen
            ? 'bg-muted border border-border text-foreground hover:bg-muted/80'
            : 'bg-primary text-primary-foreground hover:opacity-90 shadow-primary/30'
        )}
        title="Chat with Zig"
      >
        {isOpen
          ? <X className="w-5 h-5" />
          : <Sparkles className="w-6 h-6" />}
      </button>
    </div>
  );
}
