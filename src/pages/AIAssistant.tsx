import { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    Send,
    Bot,
    User,
    ListChecks,
    Zap,
    FileText,
    CornerDownLeft,
    Loader2,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useProject } from '@/context/ProjectContext';

interface Message {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: string;
}

export default function AIAssistant() {
    const { boards, cards } = useProject();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your ZigZup AI Assistant. How can I help you manage your projects today? You can ask me to summarize a board, help you prioritize tasks, or even draft a project update.",
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Mock AI response
        setTimeout(() => {
            let response = "I've analyzed your request. Based on the current board state, I recommend focusing on the tasks in 'In Progress' that are reaching their deadline soon.";

            if (input.toLowerCase().includes('summarize')) {
                response = `You have ${boards.length} boards active. The most active one is "${boards[0]?.name || 'Project Beta'}" with ${cards.length} total tasks. Most tasks are currently in the Design and Implementation phases.`;
            } else if (input.toLowerCase().includes('prioritize')) {
                response = "I've reviewed your pending tasks. The 'Database migration' and 'User auth' tasks should be your top priority as they are blockers for the frontend team.";
            }

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const clearChat = () => {
        setMessages([{
            id: 'start',
            role: 'assistant',
            content: "Chat cleared. How can I help you now?",
            timestamp: new Date().toISOString()
        }]);
    };

    const quickActions = [
        { icon: ListChecks, label: 'Summarize Board', query: 'Can you summarize the status of my primary board?' },
        { icon: Zap, label: 'Suggest Next Task', query: 'What should I work on next based on my workload?' },
        { icon: FileText, label: 'Draft Project Update', query: 'Help me draft a weekly update for the stakeholders.' },
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] max-w-5xl mx-auto p-4 md:p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">AI Assistant</h1>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Powered by ZigZup Intelligence
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearChat} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-3xl shadow-elegant overflow-hidden">
                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide"
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-3 max-w-[85%] animate-in slide-in-from-bottom-2 duration-300",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-1",
                                msg.role === 'user' ? "bg-primary/10 border-primary/20" : "bg-muted/30 border-border"
                            )}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-indigo-500" />}
                            </div>
                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed",
                                msg.role === 'user'
                                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/20"
                                    : "bg-muted/40 text-foreground border border-border rounded-tl-none"
                            )}>
                                {msg.content}
                                <div className={cn(
                                    "text-[10px] mt-2 opacity-60 font-medium",
                                    msg.role === 'user' ? "text-right" : "text-left"
                                )}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-3 mr-auto items-center">
                            <div className="w-8 h-8 rounded-full bg-muted/30 border border-border flex items-center justify-center">
                                <Bot className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div className="bg-muted/40 p-4 rounded-2xl rounded-tl-none border border-border">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 border-t border-border bg-muted/5">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => { setInput(action.query); handleSend(); }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary active:scale-95"
                            >
                                <action.icon className="w-3.5 h-3.5" />
                                {action.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <Input
                            placeholder="Ask anything about your projects..."
                            className="pr-20 h-14 bg-background border-border shadow-sm rounded-2xl focus-visible:ring-primary/30 text-base"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-muted-foreground mr-2 border border-border px-1.5 py-0.5 rounded bg-muted/20">
                                <CornerDownLeft className="w-3 h-3" /> Enter
                            </div>
                            <Button
                                size="icon"
                                className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20 active:scale-90 transition-transform"
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground mt-4">
                        AI can make mistakes. Consider checking important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
