import { Calendar, CheckCircle2, Clock, AlertTriangle, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { mockCards, mockBoards } from '@/data/mock';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const priorityDot: Record<string, string> = {
  critical: 'bg-priority-critical',
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
};

export default function Dashboard() {
  const myTasks = mockCards.filter(c => c.assignees.includes('u-1'));
  const todayTasks = myTasks.filter(c => c.dueDate && new Date(c.dueDate).toDateString() === new Date().toDateString());
  const overdueTasks = myTasks.filter(c => c.dueDate && new Date(c.dueDate) < new Date() && c.status !== 'done');
  const inProgress = myTasks.filter(c => c.status === 'in-progress');
  const done = myTasks.filter(c => c.status === 'done');

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Good morning, Alex 👋</h1>
        <p className="text-muted-foreground mt-1">Here's what's on your plate today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={CheckCircle2} label="My Tasks" value={myTasks.length} color="text-primary" />
        <StatCard icon={Clock} label="In Progress" value={inProgress.length} color="text-info" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueTasks.length} color="text-destructive" />
        <StatCard icon={TrendingUp} label="Completed" value={done.length} color="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks list */}
        <div className="lg:col-span-2 space-y-6">
          <TaskSection title="Due Today" tasks={todayTasks} emptyMsg="Nothing due today 🎉" />
          <TaskSection title="In Progress" tasks={inProgress} emptyMsg="No tasks in progress" />
          <TaskSection title="Overdue" tasks={overdueTasks} emptyMsg="All caught up!" />
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* AI summary */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" /> AI Summary
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have {myTasks.length} tasks across {mockBoards.length} boards. {overdueTasks.length > 0
                ? `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue — consider reprioritizing.`
                : 'Everything is on track!'}
            </p>
            <button className="mt-3 text-sm text-primary hover:underline flex items-center gap-1">
              Get detailed insights <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick boards */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-3">Recent Boards</h3>
            <div className="space-y-2">
              {mockBoards.map(board => (
                <Link
                  key={board.id}
                  to={`/board/${board.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted transition-colors group"
                >
                  <span className="text-sm text-foreground">{board.name}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" /> Upcoming
            </h3>
            <p className="text-sm text-muted-foreground">Calendar integrations coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <span className="text-3xl font-bold text-foreground">{value}</span>
    </div>
  );
}

function TaskSection({ title, tasks, emptyMsg }: { title: string; tasks: typeof mockCards; emptyMsg: string }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title} <span className="text-muted-foreground font-normal">({tasks.length})</span></h3>
      </div>
      {tasks.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">{emptyMsg}</p>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className={cn("w-2 h-2 rounded-full", priorityDot[task.priority])} />
              <span className="text-sm flex-1 text-foreground">{task.title}</span>
              {task.dueDate && (
                <span className="text-[11px] text-muted-foreground">
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
