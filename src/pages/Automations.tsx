import { useState } from 'react';
import {
    Zap,
    Plus,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Clock,
    ArrowRight,
    Kanban,
    Bell,
    Mail,
    MoreVertical,
    PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AutomationRule {
    id: string;
    name: string;
    trigger: string;
    action: string;
    isActive: boolean;
    type: 'board' | 'notification' | 'system';
    lastRun?: string;
}

export default function Automations() {
    const { toast } = useToast();
    const [rules, setRules] = useState<AutomationRule[]>([
        {
            id: 'rule-1',
            name: 'Auto-move on Due Date',
            trigger: 'When task is due today',
            action: 'Move to "In Progress"',
            isActive: true,
            type: 'board',
            lastRun: '2 hours ago'
        },
        {
            id: 'rule-2',
            name: 'Deadline Alert',
            trigger: 'When task is nearing due date (24h)',
            action: 'Send notification to assignees',
            isActive: true,
            type: 'notification',
            lastRun: '5 hours ago'
        },
        {
            id: 'rule-3',
            name: 'Weekly Summary',
            trigger: 'Every Friday at 5:00 PM',
            action: 'Email board summary to members',
            isActive: false,
            type: 'system'
        },
        {
            id: 'rule-4',
            name: 'New Task Assignment',
            trigger: 'When a user is assigned to a task',
            action: 'Add "High Priority" label if deadline < 3 days',
            isActive: true,
            type: 'board',
            lastRun: '1 day ago'
        }
    ]);

    const toggleRule = (id: string) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
        const rule = rules.find(r => r.id === id);
        toast({
            title: `Automation ${!rule?.isActive ? 'Activated' : 'Paused'}`,
            description: `The rule "${rule?.name}" has been ${!rule?.isActive ? 'enabled' : 'disabled'}.`,
        });
    };

    const deleteRule = (id: string) => {
        setRules(prev => prev.filter(r => r.id !== id));
        toast({
            title: "Automation Deleted",
            description: "The rule has been permanently removed.",
            variant: "destructive"
        });
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'board': return <Kanban className="w-4 h-4 text-blue-500" />;
            case 'notification': return <Bell className="w-4 h-4 text-purple-500" />;
            case 'system': return <Mail className="w-4 h-4 text-orange-500" />;
            default: return <Zap className="w-4 h-4 text-primary" />;
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
                    <p className="text-muted-foreground mt-2">Create smart rules to automate your repetitive tasks and workflows.</p>
                </div>
                <Button className="gap-2 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl">
                    <Plus className="w-5 h-5" /> Create New Rule
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <Card className="bg-primary/5 border-primary/20 shadow-none overflow-hidden relative group cursor-pointer hover:bg-primary/10 transition-all border-dashed border-2">
                    <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[180px] text-center">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Custom Rule</h3>
                        <p className="text-xs text-muted-foreground px-4 italic leading-relaxed">
                            If Trigger → Then Action. Build your own automation from scratch.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm overflow-hidden relative group cursor-pointer hover:bg-muted/5 transition-all">
                    <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[180px] text-center">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Time-based</h3>
                        <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                            Schedule tasks, reminders and reports at specific times.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm overflow-hidden relative group cursor-pointer hover:bg-muted/5 transition-all">
                    <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[180px] text-center">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <ArrowRight className="w-6 h-6 text-purple-500" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Event-based</h3>
                        <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                            Trigger actions when tasks move, labels change or members are added.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    Your Active Rules <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5">{rules.length}</Badge>
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <PlayCircle className="w-3.5 h-3.5" />
                    Last active: Just now
                </div>
            </div>

            <div className="space-y-4">
                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className={cn(
                            "group relative flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-2xl border transition-all duration-300",
                            rule.isActive
                                ? "bg-card border-border hover:border-primary/30 shadow-sm"
                                : "bg-muted/10 border-border opacity-70 grayscale-[0.5]"
                        )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                            rule.isActive ? "bg-muted/30 border-border" : "bg-muted/10 border-transparent"
                        )}>
                            {getTypeIcon(rule.type)}
                        </div>

                        <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <h4 className="text-base font-bold truncate">{rule.name}</h4>
                                {rule.isActive && (
                                    <Badge className="bg-green-500/10 text-green-600 border-none text-[10px] h-5 py-0">Running</Badge>
                                )}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="font-bold text-foreground">Trigger:</span> {rule.trigger}
                                </div>
                                <ArrowRight className="hidden md:block w-3 h-3 text-muted-foreground/30" />
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="font-bold text-foreground">Action:</span> {rule.action}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-none border-border">
                            {rule.lastRun && (
                                <div className="text-[11px] text-muted-foreground bg-muted/20 px-2 py-1 rounded-md border border-border/50">
                                    Last run: {rule.lastRun}
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {rule.isActive ? 'Active' : 'Paused'}
                                    </span>
                                    <Switch
                                        checked={rule.isActive}
                                        onCheckedChange={() => toggleRule(rule.id)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 rounded-xl border-border bg-popover">
                                        <DropdownMenuItem className="gap-2 text-sm focus:bg-primary/5 focus:text-primary">
                                            Edit Automation
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2 text-sm focus:bg-primary/5 focus:text-primary">
                                            Run Now
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => deleteRule(rule.id)}
                                            className="gap-2 text-sm text-destructive focus:bg-destructive/5 focus:text-destructive"
                                        >
                                            Delete Rule
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
