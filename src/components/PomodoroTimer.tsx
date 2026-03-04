import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Coffee, Brain, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Phase = 'work' | 'short-break' | 'long-break';

const PHASES: Record<Phase, { label: string; duration: number; color: string; icon: React.ElementType }> = {
  work:        { label: 'Focus',       duration: 25 * 60, color: 'text-primary',       icon: Brain  },
  'short-break': { label: 'Break',    duration:  5 * 60, color: 'text-green-500',     icon: Coffee },
  'long-break':  { label: 'Long Break', duration: 15 * 60, color: 'text-indigo-400', icon: Coffee },
};

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export function PomodoroTimer() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('work');
  const [timeLeft, setTimeLeft] = useState(PHASES.work.duration);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);      // completed work sessions
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = PHASES[phase].duration;
  const progress = ((total - timeLeft) / total) * 100;
  const PhaseIcon = PHASES[phase].icon;

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            handlePhaseEnd();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, phase]);

  const handlePhaseEnd = useCallback(() => {
    if (phase === 'work') {
      const newCycle = cycle + 1;
      setCycle(newCycle);
      const next: Phase = newCycle % 4 === 0 ? 'long-break' : 'short-break';
      setPhase(next);
      setTimeLeft(PHASES[next].duration);
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('ZigZup · Pomodoro', { body: `Focus session done! Time for a ${next === 'long-break' ? 'long ' : ''}break.` });
      }
    } else {
      setPhase('work');
      setTimeLeft(PHASES.work.duration);
      if (Notification.permission === 'granted') {
        new Notification('ZigZup · Pomodoro', { body: 'Break over! Time to focus.' });
      }
    }
  }, [phase, cycle]);

  const reset = () => {
    setRunning(false);
    setTimeLeft(PHASES[phase].duration);
  };

  const switchPhase = (p: Phase) => {
    setRunning(false);
    setPhase(p);
    setTimeLeft(PHASES[p].duration);
  };

  const requestNotifPerm = () => {
    if (Notification.permission === 'default') Notification.requestPermission();
  };

  // SVG circle
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ - (progress / 100) * circ;

  return (
    <div className="fixed bottom-6 left-5 z-40 flex flex-col items-start gap-2">

      {/* Expanded panel */}
      {open && (
        <div className="w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 self-start">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Pomodoro</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Phase tabs */}
          <div className="flex gap-1 p-3 pb-0">
            {(Object.keys(PHASES) as Phase[]).map(p => (
              <button
                key={p}
                onClick={() => switchPhase(p)}
                className={cn(
                  "flex-1 text-[9px] font-bold uppercase tracking-wider py-1 rounded-lg transition-all",
                  phase === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                {p === 'work' ? 'Focus' : p === 'short-break' ? 'Break' : 'Long'}
              </button>
            ))}
          </div>

          {/* Timer dial */}
          <div className="flex flex-col items-center py-5 gap-2">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                {/* Track */}
                <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                {/* Progress */}
                <circle
                  cx="44" cy="44" r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dash}
                  className={cn("transition-all duration-1000", PHASES[phase].color)}
                />
              </svg>
              {/* Center time */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono tracking-tight">{fmt(timeLeft)}</span>
                <span className={cn("text-[9px] font-bold uppercase tracking-wider", PHASES[phase].color)}>
                  {PHASES[phase].label}
                </span>
              </div>
            </div>

            {/* Cycle pips */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i < (cycle % 4) ? "bg-primary" : "bg-muted"
                )} />
              ))}
              <span className="text-[9px] text-muted-foreground ml-1">{cycle} done</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 px-4 pb-4">
            <Button
              className="flex-1 h-9 gap-2 font-bold"
              onClick={() => { setRunning(r => !r); requestNotifPerm(); }}
            >
              {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> {timeLeft === PHASES[phase].duration ? 'Start' : 'Resume'}</>}
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Skip / next phase hint */}
          <div className="px-4 pb-3 text-center">
            <button
              onClick={handlePhaseEnd}
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Skip to next phase →
            </button>
          </div>
        </div>
      )}

      {/* Floating pill button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 rounded-2xl border shadow-lg transition-all duration-200 hover:scale-105 active:scale-95",
          running
            ? "bg-primary text-primary-foreground border-primary/30 shadow-primary/25"
            : "bg-card text-foreground border-border hover:border-primary/40"
        )}
      >
        {/* Mini progress arc */}
        <div className="relative w-6 h-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <circle
              cx="14" cy="14" r="11"
              fill="none" stroke="currentColor" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 11}
              strokeDashoffset={2 * Math.PI * 11 * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <PhaseIcon className="w-3 h-3" />
          </div>
        </div>
        <span className="text-xs font-bold font-mono">{fmt(timeLeft)}</span>
        <ChevronUp className={cn("w-3.5 h-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
