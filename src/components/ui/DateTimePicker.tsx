import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const HOURS   = Array.from({ length: 12 }, (_, i) => i + 1);   // 1–12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);   // 0,5,10…55

function getDays(year: number, month: number): Date[] {
  const first   = new Date(year, month, 1);
  const last    = new Date(year, month + 1, 0);
  const padStart = (first.getDay() + 6) % 7; // Mon=0
  const days: Date[] = [];
  for (let i = padStart; i > 0; i--)       days.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  const endPad = 7 - (days.length % 7 || 7);
  for (let i = 1; i <= endPad; i++)         days.push(new Date(year, month + 1, i));
  return days;
}

function parse(val: string): { date: Date | null; hour: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!val) return { date: null, hour: 10, minute: 0, ampm: 'AM' };
  const dt = new Date(val);
  const h24 = dt.getHours();
  return {
    date:   dt,
    hour:   h24 % 12 || 12,
    minute: Math.round(dt.getMinutes() / 5) * 5 % 60,
    ampm:   h24 < 12 ? 'AM' : 'PM',
  };
}

function toISO(date: Date, hour: number, minute: number, ampm: 'AM' | 'PM'): string {
  const h24 = ampm === 'AM' ? (hour % 12) : (hour % 12) + 12;
  const d = new Date(date);
  d.setHours(h24, minute, 0, 0);
  // Format as datetime-local string
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h24)}:${pad(minute)}`;
}

interface DateTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function DateTimePicker({ value, onChange, placeholder = 'Select date & time' }: DateTimePickerProps) {
  const parsed = parse(value);

  const [open, setOpen]       = useState(false);
  const [viewYear, setYear]   = useState(parsed.date?.getFullYear()  ?? new Date().getFullYear());
  const [viewMonth, setMonth] = useState(parsed.date?.getMonth()     ?? new Date().getMonth());
  const [selDate, setSelDate] = useState<Date | null>(parsed.date);
  const [hour, setHour]       = useState(parsed.hour);
  const [minute, setMinute]   = useState(parsed.minute);
  const [ampm, setAmpm]       = useState<'AM' | 'PM'>(parsed.ampm);

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Sync internal state when value changes externally
  useEffect(() => {
    const p = parse(value);
    setSelDate(p.date);
    setHour(p.hour);
    setMinute(p.minute);
    setAmpm(p.ampm);
    if (p.date) { setYear(p.date.getFullYear()); setMonth(p.date.getMonth()); }
  }, [value]);

  const commit = (d: Date | null, h: number, m: number, ap: 'AM' | 'PM') => {
    if (!d) return;
    onChange(toISO(d, h, m, ap));
  };

  const days    = getDays(viewYear, viewMonth);
  const today   = new Date();
  const display = selDate
    ? `${selDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}  ${hour}:${String(minute).padStart(2, '0')} ${ampm}`
    : '';

  const prevMonth = () => { if (viewMonth === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors text-left',
          open ? 'border-primary ring-1 ring-ring' : 'hover:border-border/80',
          display ? 'text-foreground' : 'text-muted-foreground/50'
        )}
      >
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate">{display || placeholder}</span>
        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden w-[340px]">

          <div className="flex">
            {/* ── Calendar ───────────────────────── */}
            <div className="flex-1 p-3">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-2">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-foreground">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/50 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-px">
                {days.map((day, i) => {
                  const isCurMonth  = day.getMonth() === viewMonth;
                  const isToday     = day.toDateString() === today.toDateString();
                  const isSelected  = selDate && day.toDateString() === selDate.toDateString();
                  const isPast      = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isPast && !isSelected}
                      onClick={() => {
                        setSelDate(day);
                        commit(day, hour, minute, ampm);
                      }}
                      className={cn(
                        'w-7 h-7 mx-auto rounded-lg text-xs flex items-center justify-center transition-all font-medium',
                        !isCurMonth && 'text-muted-foreground/20',
                        isCurMonth && isPast && !isSelected && 'text-muted-foreground/40 cursor-not-allowed',
                        isCurMonth && !isPast && !isSelected && 'text-foreground hover:bg-primary/20',
                        isToday && !isSelected && 'ring-1 ring-primary/40 text-primary',
                        isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Time ───────────────────────────── */}
            <div className="w-28 border-l border-border flex flex-col">
              <div className="px-2 py-2 border-b border-border text-center">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Time</p>
              </div>

              {/* Hour scroll */}
              <div className="flex-1 overflow-y-auto py-1 scroll-smooth" style={{ maxHeight: 200 }}>
                <p className="text-[9px] text-muted-foreground/40 px-2 py-1 uppercase tracking-wide font-bold">Hour</p>
                {HOURS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { setHour(h); if (selDate) commit(selDate, h, minute, ampm); }}
                    className={cn(
                      'w-full text-xs px-3 py-1.5 text-left transition-colors',
                      hour === h ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {h}
                  </button>
                ))}

                <p className="text-[9px] text-muted-foreground/40 px-2 py-1 uppercase tracking-wide font-bold mt-1">Min</p>
                {MINUTES.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMinute(m); if (selDate) commit(selDate, hour, m, ampm); }}
                    className={cn(
                      'w-full text-xs px-3 py-1.5 text-left transition-colors',
                      minute === m ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                ))}

                <p className="text-[9px] text-muted-foreground/40 px-2 py-1 uppercase tracking-wide font-bold mt-1">AM/PM</p>
                {(['AM', 'PM'] as const).map(ap => (
                  <button
                    key={ap}
                    type="button"
                    onClick={() => { setAmpm(ap); if (selDate) commit(selDate, hour, minute, ap); }}
                    className={cn(
                      'w-full text-xs px-3 py-1.5 text-left transition-colors',
                      ampm === ap ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {ap}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={() => { setSelDate(null); onChange(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!selDate}
              className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
