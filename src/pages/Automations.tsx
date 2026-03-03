import { useState, useEffect } from 'react';
import {
    Zap,
    Plus,
    Trash2,
    Clock,
    ArrowRight,
    Kanban,
    Bell,
    MoreVertical,
    PlayCircle,
    X,
    ChevronDown,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useProject } from '@/context/ProjectContext';

// ── Types ──────────────────────────────────────────────────────────────

type TriggerType = 'card_overdue' | 'card_due_today' | 'card_due_soon' | 'card_high_priority';
type ActionType = 'set_priority_critical' | 'set_priority_high' | 'move_to_list' | 'notify';

interface AutomationRule {
    id: string;
    name: string;
    trigger: TriggerType;
    action: ActionType;
    actionParam?: string; // e.g. list id for move_to_list
    isActive: boolean;
    lastRun?: string;
    runCount: number;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
    card_overdue: 'When a task is overdue',
    card_due_today: 'When a task is due today',
    card_due_soon: 'When a task is due within 24 hours',
    card_high_priority: 'When a task has High or Critical priority',
};

const ACTION_LABELS: Record<ActionType, string> = {
    set_priority_critical: 'Set priority to Critical',
    set_priority_high: 'Set priority to High',
    move_to_list: 'Move task to list…',
    notify: 'Show a notification',
};

const STORAGE_KEY = 'zigzup-automations';

function loadRules(): AutomationRule[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function saveRules(rules: AutomationRule[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

// ── Main Component ─────────────────────────────────────────────────────

export default function Automations() {
    const { cards, lists, updateCard } = useProject();
    const [rules, setRules] = useState<AutomationRule[]>(loadRules);
    const [showCreate, setShowCreate] = useState(false);

    // Persist whenever rules change
    useEffect(() => { saveRules(rules); }, [rules]);

    // Run all active rules on mount
    useEffect(() => {
        rules.filter(r => r.isActive).forEach(r => runRule(r, false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Execute a rule against live data ──────────────────────────────

    const runRule = async (rule: AutomationRule, showFeedback = true) => {
        const now = new Date();
        const today = now.toDateString();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find matching cards
        let matched = cards.filter(card => {
            switch (rule.trigger) {
                case 'card_overdue':
                    return card.dueDate && new Date(card.dueDate) < now;
                case 'card_due_today':
                    return card.dueDate && new Date(card.dueDate).toDateString() === today;
                case 'card_due_soon':
                    return card.dueDate && new Date(card.dueDate) > now && new Date(card.dueDate) <= in24h;
                case 'card_high_priority':
                    return card.priority === 'high' || card.priority === 'critical';
                default:
                    return false;
            }
        });

        if (matched.length === 0) {
            if (showFeedback) toast.info(`No matching tasks found for "${rule.name}".`);
            return;
        }

        // Apply action
        let actionsApplied = 0;
        for (const card of matched) {
            try {
                switch (rule.action) {
                    case 'set_priority_critical':
                        if (card.priority !== 'critical') {
                            await updateCard(card.id, { priority: 'critical' });
                            actionsApplied++;
                        }
                        break;
                    case 'set_priority_high':
                        if (card.priority !== 'high' && card.priority !== 'critical') {
                            await updateCard(card.id, { priority: 'high' });
                            actionsApplied++;
                        }
                        break;
                    case 'move_to_list':
                        if (rule.actionParam && card.listId !== rule.actionParam) {
                            await updateCard(card.id, { listId: rule.actionParam });
                            actionsApplied++;
                        }
                        break;
                    case 'notify':
                        toast.warning(`Task "${card.title}" — ${TRIGGER_LABELS[rule.trigger]}`, {
                            duration: 6000,
                        });
                        actionsApplied++;
                        break;
                }
            } catch {
                // silently skip individual failures
            }
        }

        // Update run metadata
        setRules(prev => prev.map(r =>
            r.id === rule.id
                ? { ...r, lastRun: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), runCount: (r.runCount ?? 0) + 1 }
                : r
        ));

        if (showFeedback) {
            toast.success(
                actionsApplied > 0
                    ? `"${rule.name}" ran — ${actionsApplied} task${actionsApplied > 1 ? 's' : ''} updated.`
                    : `"${rule.name}" ran — all tasks already up to date.`
            );
        }
    };

    const toggleRule = (id: string) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
        const rule = rules.find(r => r.id === id);
        toast.info(`"${rule?.name}" ${rule?.isActive ? 'paused' : 'activated'}.`);
    };

    const deleteRule = (id: string) => {
        const rule = rules.find(r => r.id === id);
        setRules(prev => prev.filter(r => r.id !== id));
        toast.success(`"${rule?.name}" deleted.`);
    };

    const getTypeIcon = (trigger: TriggerType) => {
        switch (trigger) {
            case 'card_overdue': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'card_due_today': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'card_due_soon': return <Bell className="w-4 h-4 text-blue-500" />;
            case 'card_high_priority': return <Kanban className="w-4 h-4 text-purple-500" />;
        }
    };

    const activeCount = rules.filter(r => r.isActive).length;

    return (
        <div className="p-6 max-w-6xl mx-auto animate-fade-in pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
                    <p className="text-muted-foreground mt-2">
                        Create smart rules that run automatically against your live task data.
                    </p>
                </div>
                <Button
                    className="gap-2 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl"
                    onClick={() => setShowCreate(true)}
                >
                    <Plus className="w-5 h-5" /> Create New Rule
                </Button>
            </div>

            {/* Template Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[
                    { icon: Zap, label: 'Custom Rule', desc: 'If Trigger → Then Action. Build your own automation from scratch.', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20 border-dashed', action: () => setShowCreate(true) },
                    { icon: Clock, label: 'Due Date Alert', desc: 'Notify assignees about tasks due within 24 hours.', color: 'text-blue-500', bg: 'bg-blue-500/10', border: '', action: () => { setShowCreate(true); } },
                    { icon: AlertTriangle, label: 'Overdue Escalation', desc: 'Escalate overdue tasks to Critical priority automatically.', color: 'text-red-500', bg: 'bg-red-500/10', border: '', action: () => setShowCreate(true) },
                ].map((t, i) => (
                    <Card
                        key={i}
                        onClick={t.action}
                        className={cn('shadow-none overflow-hidden cursor-pointer hover:bg-muted/5 transition-all group', t.border || 'border-border')}
                    >
                        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[160px] text-center">
                            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform', t.bg)}>
                                <t.icon className={cn('w-6 h-6', t.color)} />
                            </div>
                            <h3 className="font-bold text-base mb-1">{t.label}</h3>
                            <p className="text-xs text-muted-foreground px-4 leading-relaxed">{t.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Rules List */}
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    Your Rules
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5">
                        {rules.length}
                    </Badge>
                    {activeCount > 0 && (
                        <Badge className="bg-green-500/10 text-green-600 border-none text-[10px]">
                            {activeCount} active
                        </Badge>
                    )}
                </h2>
                {rules.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <PlayCircle className="w-3.5 h-3.5" />
                        Rules run automatically on load
                    </div>
                )}
            </div>

            {rules.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No automation rules yet.</p>
                    <p className="text-sm mt-1">Click "Create New Rule" to get started.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {rules.map((rule) => (
                        <div
                            key={rule.id}
                            className={cn(
                                'group relative flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-2xl border transition-all duration-300',
                                rule.isActive
                                    ? 'bg-card border-border hover:border-primary/30 shadow-sm'
                                    : 'bg-muted/10 border-border opacity-60'
                            )}
                        >
                            <div className={cn(
                                'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border',
                                rule.isActive ? 'bg-muted/30 border-border' : 'bg-muted/10 border-transparent'
                            )}>
                                {getTypeIcon(rule.trigger)}
                            </div>

                            <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-base font-bold truncate">{rule.name}</h4>
                                    {rule.isActive && (
                                        <Badge className="bg-green-500/10 text-green-600 border-none text-[10px] h-5 py-0">Active</Badge>
                                    )}
                                    {rule.runCount > 0 && (
                                        <Badge variant="outline" className="text-[10px] h-5 py-0 text-muted-foreground">
                                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                            Ran {rule.runCount}×
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                                    <div className="text-muted-foreground">
                                        <span className="font-bold text-foreground">If: </span>
                                        {TRIGGER_LABELS[rule.trigger]}
                                    </div>
                                    <ArrowRight className="hidden md:block w-3 h-3 text-muted-foreground/30" />
                                    <div className="text-muted-foreground">
                                        <span className="font-bold text-foreground">Then: </span>
                                        {rule.action === 'move_to_list'
                                            ? `Move to "${lists.find(l => l.id === rule.actionParam)?.name ?? rule.actionParam}"`
                                            : ACTION_LABELS[rule.action]}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4 pt-4 md:pt-0 border-t md:border-none border-border">
                                {rule.lastRun && (
                                    <div className="text-[11px] text-muted-foreground bg-muted/20 px-2 py-1 rounded-md border border-border/50">
                                        Last run: {rule.lastRun}
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <Switch
                                        checked={rule.isActive}
                                        onCheckedChange={() => toggleRule(rule.id)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                            <DropdownMenuItem
                                                className="gap-2 text-sm focus:bg-primary/5 focus:text-primary"
                                                onClick={() => runRule(rule)}
                                            >
                                                <PlayCircle className="w-3.5 h-3.5" />
                                                Run Now
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => deleteRule(rule.id)}
                                                className="gap-2 text-sm text-destructive focus:bg-destructive/5 focus:text-destructive"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete Rule
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Rule Dialog */}
            {showCreate && (
                <CreateRuleDialog
                    lists={lists}
                    onClose={() => setShowCreate(false)}
                    onCreate={(rule) => {
                        setRules(prev => [...prev, rule]);
                        setShowCreate(false);
                        toast.success(`Automation "${rule.name}" created!`);
                        if (rule.isActive) runRule(rule, false);
                    }}
                />
            )}
        </div>
    );
}

// ── Create Rule Dialog ─────────────────────────────────────────────────

interface CreateRuleDialogProps {
    lists: ReturnType<typeof useProject>['lists'];
    onClose: () => void;
    onCreate: (rule: AutomationRule) => void;
}

function CreateRuleDialog({ lists, onClose, onCreate }: CreateRuleDialogProps) {
    const [name, setName] = useState('');
    const [trigger, setTrigger] = useState<TriggerType>('card_overdue');
    const [action, setAction] = useState<ActionType>('set_priority_critical');
    const [actionParam, setActionParam] = useState('');

    const handleCreate = () => {
        if (!name.trim()) { toast.error('Please enter a rule name.'); return; }
        if (action === 'move_to_list' && !actionParam) { toast.error('Please select a target list.'); return; }

        onCreate({
            id: `rule-${Date.now()}`,
            name: name.trim(),
            trigger,
            action,
            actionParam: action === 'move_to_list' ? actionParam : undefined,
            isActive: true,
            runCount: 0,
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold">New Automation Rule</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Name */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                            Rule Name
                        </label>
                        <Input
                            placeholder="e.g. Escalate overdue tasks"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="rounded-xl"
                            autoFocus
                        />
                    </div>

                    {/* Trigger */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-600 text-[9px] font-black flex items-center justify-center">IF</span>
                            Trigger
                        </label>
                        <div className="relative">
                            <select
                                value={trigger}
                                onChange={e => setTrigger(e.target.value as TriggerType)}
                                className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                            >
                                {(Object.entries(TRIGGER_LABELS) as [TriggerType, string][]).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    {/* Action */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1.5">
                            <span className="w-5 h-4 rounded bg-primary/20 text-primary text-[9px] font-black flex items-center justify-center">THEN</span>
                            Action
                        </label>
                        <div className="relative mb-3">
                            <select
                                value={action}
                                onChange={e => setAction(e.target.value as ActionType)}
                                className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                            >
                                {(Object.entries(ACTION_LABELS) as [ActionType, string][]).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {action === 'move_to_list' && (
                            <div className="relative">
                                <select
                                    value={actionParam}
                                    onChange={e => setActionParam(e.target.value)}
                                    className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                                >
                                    <option value="">Select a list…</option>
                                    {lists.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="bg-muted/30 border border-border rounded-xl p-4 text-sm">
                        <p className="font-bold text-foreground mb-1">Preview</p>
                        <p className="text-muted-foreground leading-relaxed">
                            <span className="text-amber-600 font-semibold">If </span>
                            {TRIGGER_LABELS[trigger].toLowerCase()}
                            <span className="text-primary font-semibold"> → </span>
                            {action === 'move_to_list'
                                ? `move task to "${lists.find(l => l.id === actionParam)?.name ?? '(select list)'}"`
                                : ACTION_LABELS[action].toLowerCase()}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 pt-0">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
                        <Zap className="w-4 h-4" />
                        Create Rule
                    </Button>
                </div>
            </div>
        </div>
    );
}
