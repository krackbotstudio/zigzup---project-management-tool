import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { useCRM } from '@/context/CRMContext';

export function CRMStatsBar() {
  const { leadsWithCards, contacts, crmLists } = useCRM();

  const totalLeads = leadsWithCards.length;
  const pipelineValue = leadsWithCards.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);

  const wonListName = 'Won';
  const lostListName = 'Lost';
  const wonCount = leadsWithCards.filter(l => l.currentStage === wonListName).length;
  const lostCount = leadsWithCards.filter(l => l.currentStage === lostListName).length;
  const closedTotal = wonCount + lostCount;
  const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0;

  const activeLeads = leadsWithCards.filter(
    l => l.currentStage !== wonListName && l.currentStage !== lostListName
  ).length;

  const stats = [
    {
      label: 'Total Leads',
      value: totalLeads,
      sub: `${activeLeads} active`,
      icon: <Users className="w-4 h-4 text-primary" />,
      bg: 'bg-primary/10',
    },
    {
      label: 'Pipeline Value',
      value: `$${pipelineValue >= 1000 ? (pipelineValue / 1000).toFixed(1) + 'K' : pipelineValue.toLocaleString()}`,
      sub: 'active deals',
      icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      sub: `${wonCount} won · ${lostCount} lost`,
      icon: <Target className="w-4 h-4 text-amber-500" />,
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Contacts',
      value: contacts.length,
      sub: 'in directory',
      icon: <TrendingUp className="w-4 h-4 text-purple-500" />,
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 border-b border-border/40">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-3">
          <div className={`${s.bg} rounded-lg p-2 shrink-0`}>{s.icon}</div>
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground leading-tight">{s.value}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
            <div className="text-[10px] text-muted-foreground/60 leading-tight">{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
