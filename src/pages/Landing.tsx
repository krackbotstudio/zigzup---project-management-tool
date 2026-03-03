import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight, Layout, Zap, Menu, X, Calendar, Bell, Bot, Video,
    CheckCircle2, ChevronRight, AlertCircle, MoreHorizontal, Check,
    Users, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// ─── Inject keyframe animations (runs once at module load) ───────────
if (typeof document !== 'undefined' && !document.getElementById('landing-anims')) {
    const s = document.createElement('style');
    s.id = 'landing-anims';
    s.textContent = `
        @keyframes hfloat1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        @keyframes hfloat2 { 0%,100%{transform:translateY(-5px)} 50%{transform:translateY(7px)} }
        @keyframes hfloat3 { 0%,100%{transform:translateY(-2px)} 50%{transform:translateY(6px)} }
        @keyframes hfloat4 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-7px)} }
        @keyframes cardIn  { from{opacity:0;transform:translateY(14px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes progressFill { from{width:0%} to{width:75%} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes checkPop { 0%{transform:scale(0) rotate(-30deg)} 70%{transform:scale(1.2) rotate(5deg)} 100%{transform:scale(1) rotate(0deg)} }
    `;
    document.head.appendChild(s);
}

// ─── Color constants (indigo theme) ─────────────────────────────────
const C = {
    indigo:     '#4f46e5',
    indigoDark: '#4338ca',
    indigoLight:'#818cf8',
    indigoBg:   '#eef2ff',
    violet:     '#7c3aed',
    slate900:   '#0f172a',
    slate800:   '#1e293b',
    slate700:   '#334155',
    slate600:   '#475569',
    slate500:   '#64748b',
    slate400:   '#94a3b8',
    slate200:   '#e2e8f0',
    slate100:   '#f1f5f9',
    slate50:    '#f8fafc',
    white:      '#ffffff',
    green:      '#10b981',
    amber:      '#f59e0b',
    blue:       '#3b82f6',
};

// ─── Logo SVG ────────────────────────────────────────────────────────
function ZigZupIcon({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill={dark ? C.white : C.indigo} />
            {/* Zigzag lightning bolt */}
            <path
                d="M21 7L11 19h7l-3 10 14-12h-7l3-10z"
                fill={dark ? C.indigo : C.white}
            />
        </svg>
    );
}

// ─── Interactive Hero Board ──────────────────────────────────────────
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface HeroCard {
    id: string;
    title: string;
    tag: string;
    tagBg: string;
    tagColor: string;
    priority: Priority;
    avatar: string;
    done: boolean;
}

interface HeroCol {
    id: string;
    name: string;
    dot: string;
    cards: HeroCard[];
}

const PRIO: Record<Priority, { bg: string; text: string }> = {
    critical: { bg: '#fee2e2', text: '#991b1b' },
    high:     { bg: '#ffedd5', text: '#9a3412' },
    medium:   { bg: '#fef9c3', text: '#854d0e' },
    low:      { bg: '#f1f5f9', text: '#475569' },
};

const INITIAL_COLS: HeroCol[] = [
    {
        id: 'todo', name: 'To Do', dot: C.slate400,
        cards: [
            { id: 'c1', title: 'Design onboarding flow', tag: 'Design', tagBg: C.indigoBg, tagColor: C.indigo, priority: 'medium', avatar: C.indigo, done: false },
            { id: 'c2', title: 'Write API documentation', tag: 'Docs', tagBg: '#dcfce7', tagColor: '#16a34a', priority: 'low', avatar: C.green, done: false },
        ],
    },
    {
        id: 'progress', name: 'In Progress', dot: C.indigo,
        cards: [
            { id: 'c3', title: 'Build landing page', tag: 'Frontend', tagBg: '#ede9fe', tagColor: C.violet, priority: 'high', avatar: C.violet, done: false },
            { id: 'c4', title: 'Auth flow integration', tag: 'Backend', tagBg: '#ffedd5', tagColor: '#c2410c', priority: 'critical', avatar: C.amber, done: false },
        ],
    },
    {
        id: 'done', name: 'Done', dot: C.green,
        cards: [
            { id: 'c5', title: 'Project setup', tag: 'DevOps', tagBg: '#e0f2fe', tagColor: '#0369a1', priority: 'low', avatar: C.blue, done: true },
            { id: 'c6', title: 'UI component library', tag: 'Design', tagBg: C.indigoBg, tagColor: C.indigo, priority: 'medium', avatar: C.indigo, done: true },
        ],
    },
];

function InteractiveBoard() {
    const [cols, setCols] = useState<HeroCol[]>(INITIAL_COLS);
    const [dragging, setDragging] = useState<{ cardId: string; fromColId: string } | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);
    const [hint, setHint] = useState(true);
    const [mounted, setMounted] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 80);
        return () => clearTimeout(t);
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || !boardRef.current) return;
        const r = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            if (boardRef.current) {
                boardRef.current.style.transform =
                    `perspective(1200px) rotateX(${-y * 3.5}deg) rotateY(${x * 5}deg)`;
            }
        });
    }, []);

    const onMouseLeave = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        if (boardRef.current) {
            boardRef.current.style.transition = 'transform 0.6s ease';
            boardRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
            setTimeout(() => { if (boardRef.current) boardRef.current.style.transition = ''; }, 600);
        }
    }, []);

    const handleDragStart = (e: React.DragEvent, cardId: string, fromColId: string) => {
        setDragging({ cardId, fromColId });
        setHint(false);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (toColId: string) => {
        if (!dragging || dragging.fromColId === toColId) {
            setDragging(null); setDragOverColId(null); return;
        }
        setCols(prev => {
            const card = prev.find(c => c.id === dragging.fromColId)?.cards.find(c => c.id === dragging.cardId);
            if (!card) return prev;
            return prev.map(col => {
                if (col.id === dragging.fromColId) return { ...col, cards: col.cards.filter(c => c.id !== dragging.cardId) };
                if (col.id === toColId) return { ...col, cards: [...col.cards, { ...card, done: toColId === 'done' }] };
                return col;
            });
        });
        setDragging(null); setDragOverColId(null);
    };

    const markDone = (cardId: string, fromColId: string) => {
        setHint(false);
        setCols(prev => {
            const card = prev.find(c => c.id === fromColId)?.cards.find(c => c.id === cardId);
            if (!card || fromColId === 'done') return prev;
            return prev.map(col => {
                if (col.id === fromColId) return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
                if (col.id === 'done') return { ...col, cards: [{ ...card, done: true }, ...col.cards] };
                return col;
            });
        });
    };

    return (
        <div
            ref={containerRef}
            className="relative h-[520px] lg:h-[600px]"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            {/* Dot-grid background */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden"
                style={{ backgroundImage: `radial-gradient(circle, ${C.indigoBg} 1.5px, transparent 1.5px)`, backgroundSize: '26px 26px' }} />

            {/* ── Main Board ── */}
            <div ref={boardRef} className="absolute inset-4" style={{ willChange: 'transform' }}>
                <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden border"
                    style={{ backgroundColor: C.slate50, borderColor: C.slate200 }}>

                    {/* Board header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b"
                        style={{ backgroundColor: C.white, borderColor: C.slate200 }}>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                            <span className="ml-3 text-xs font-bold" style={{ color: C.slate600 }}>
                                🗂 Product Sprint Q1
                            </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            {hint && (
                                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full animate-pulse"
                                    style={{ backgroundColor: C.indigoBg, color: C.indigo }}>
                                    ✨ Drag cards between columns
                                </span>
                            )}
                            <div className="flex -space-x-1.5">
                                {[C.indigo, C.blue, C.green, C.amber].map((c, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white"
                                        style={{ backgroundColor: c }}>
                                        {['A', 'B', 'C', 'D'][i]}
                                    </div>
                                ))}
                            </div>
                            <MoreHorizontal className="w-4 h-4" style={{ color: C.slate400 }} />
                        </div>
                    </div>

                    {/* Columns */}
                    <div className="flex gap-3 p-3 h-[calc(100%-52px)] overflow-x-auto">
                        {cols.map(col => (
                            <div
                                key={col.id}
                                className="flex-shrink-0 w-44 flex flex-col gap-2 rounded-xl p-2 transition-all duration-200"
                                style={{
                                    backgroundColor: dragOverColId === col.id ? 'rgba(79,70,229,0.07)' : 'transparent',
                                    border: dragOverColId === col.id ? `2px dashed rgba(79,70,229,0.4)` : '2px dashed transparent',
                                }}
                                onDragOver={e => { e.preventDefault(); setDragOverColId(col.id); }}
                                onDragLeave={() => setDragOverColId(null)}
                                onDrop={() => handleDrop(col.id)}
                            >
                                {/* Column header */}
                                <div className="flex items-center gap-1.5 px-1 mb-0.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.dot }} />
                                    <span className="text-[11px] font-bold" style={{ color: C.slate600 }}>{col.name}</span>
                                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: C.slate100, color: C.slate400 }}>
                                        {col.cards.length}
                                    </span>
                                </div>

                                {/* Cards */}
                                {col.cards.map((card, idx) => (
                                    <div
                                        key={card.id}
                                        draggable
                                        onDragStart={e => handleDragStart(e, card.id, col.id)}
                                        onDragEnd={() => { setDragging(null); setDragOverColId(null); }}
                                        className="rounded-xl p-2.5 border group transition-all duration-200"
                                        style={{
                                            backgroundColor: C.white,
                                            borderColor: dragging?.cardId === card.id ? C.indigo : C.slate200,
                                            boxShadow: dragging?.cardId === card.id
                                                ? `0 8px 24px rgba(79,70,229,0.22)`
                                                : '0 1px 3px rgba(0,0,0,0.05)',
                                            opacity: dragging?.cardId === card.id ? 0.55 : 1,
                                            cursor: 'grab',
                                            animation: mounted ? `cardIn 0.35s ease both` : 'none',
                                            animationDelay: `${idx * 70}ms`,
                                        }}
                                    >
                                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mb-1.5"
                                            style={{ backgroundColor: card.tagBg, color: card.tagColor }}>
                                            {card.tag}
                                        </span>
                                        <p className="text-[11px] font-semibold leading-snug mb-2"
                                            style={{
                                                color: C.slate800,
                                                textDecoration: card.done ? 'line-through' : 'none',
                                                opacity: card.done ? 0.55 : 1,
                                            }}>
                                            {card.title}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tight"
                                                style={{ backgroundColor: PRIO[card.priority].bg, color: PRIO[card.priority].text }}>
                                                {card.priority}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {!card.done && col.id !== 'done' && (
                                                    <button
                                                        onClick={() => markDone(card.id, col.id)}
                                                        title="Mark as done"
                                                        className="w-4 h-4 rounded-full border flex items-center justify-center transition-all hover:scale-110"
                                                        style={{ borderColor: C.slate200 }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.slate200; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                    >
                                                        <Check className="w-2.5 h-2.5 text-green-500" />
                                                    </button>
                                                )}
                                                {card.done && (
                                                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: C.green }} />
                                                )}
                                                <div className="w-4 h-4 rounded-full border border-white text-[7px] font-black text-white"
                                                    style={{ backgroundColor: card.avatar }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty drop hint */}
                                {col.cards.length === 0 && (
                                    <div className="rounded-xl p-3 text-center"
                                        style={{ border: `1.5px dashed ${C.slate200}` }}>
                                        <p className="text-[10px]" style={{ color: C.slate400 }}>Drop here</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Floating panel: Sprint progress (top-right) ── */}
            <div className="absolute top-2 right-3 z-20 rounded-2xl shadow-xl p-3 w-44"
                style={{ backgroundColor: C.white, border: `1px solid ${C.slate100}`, animation: 'hfloat1 4s ease-in-out infinite' }}>
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: C.indigoBg }}>
                        <Zap className="w-3.5 h-3.5" style={{ color: C.indigo }} />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: C.slate700 }}>Sprint Active</span>
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </div>
                <div className="w-full rounded-full h-1.5 mb-1.5 overflow-hidden" style={{ backgroundColor: C.slate100 }}>
                    <div className="h-1.5 rounded-full" style={{ width: '75%', backgroundColor: C.indigo, animation: 'progressFill 1.8s ease forwards' }} />
                </div>
                <p className="text-[10px] font-medium" style={{ color: C.slate400 }}>12 / 16 tasks done • 75%</p>
            </div>

            {/* ── Floating panel: AI suggestion (left) ── */}
            <div className="absolute left-3 top-[28%] z-20 rounded-2xl shadow-xl p-3 w-52"
                style={{ backgroundColor: C.white, border: `1px solid ${C.slate100}`, animation: 'hfloat2 5s ease-in-out infinite' }}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: C.indigo }}>
                        <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: C.slate700 }}>Zig — AI Insight</span>
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>New</span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: C.slate500 }}>
                    "Auth flow" blocks 3 other tasks — move it to top priority.
                </p>
            </div>

            {/* ── Floating panel: Task complete (bottom-left) ── */}
            <div className="absolute bottom-3 left-6 z-20 rounded-2xl shadow-xl p-2.5 flex items-center gap-2.5"
                style={{ backgroundColor: C.white, border: `1px solid ${C.slate100}`, minWidth: '210px', animation: 'hfloat3 3.5s ease-in-out infinite' }}>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#f0fdf4' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />
                </div>
                <div>
                    <p className="text-[10px] font-bold" style={{ color: C.slate700 }}>Task completed!</p>
                    <p className="text-[9px]" style={{ color: C.slate400 }}>UI components — Alex</p>
                </div>
            </div>

            {/* ── Floating panel: Due today (bottom-right) ── */}
            <div className="absolute bottom-14 right-3 z-20 rounded-2xl shadow-xl p-2.5 flex items-center gap-2"
                style={{ backgroundColor: C.white, border: `1px solid ${C.slate100}`, animation: 'hfloat4 4.5s ease-in-out infinite 1s' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: C.amber }} />
                <div>
                    <p className="text-[10px] font-bold" style={{ color: C.slate700 }}>Due today</p>
                    <p className="text-[9px]" style={{ color: C.slate400 }}>Client demo prep</p>
                </div>
            </div>
        </div>
    );
}

// ─── Rotating word component ─────────────────────────────────────────
const WORDS = ['projects', 'sprints', 'products', 'ideas'];

function RotatingWord() {
    const [idx, setIdx] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => {
            setVisible(false);
            setTimeout(() => { setIdx(i => (i + 1) % WORDS.length); setVisible(true); }, 280);
        }, 2600);
        return () => clearInterval(timer);
    }, []);

    return (
        <span
            className="inline-block px-3 py-1 rounded-2xl italic"
            style={{
                backgroundColor: `rgba(79,70,229,0.12)`,
                color: C.indigo,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.28s ease, transform 0.28s ease',
                /* Fixed width prevents any reflowing of sibling text */
                minWidth: '9ch',
            }}
        >
            {WORDS[idx]}
        </span>
    );
}

// ─── Main Landing Component ──────────────────────────────────────────
export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    useEffect(() => {
        const h = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', h);
        return () => window.removeEventListener('scroll', h);
    }, []);

    const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full font-bold text-sm px-6 h-10 cursor-pointer select-none transition-all text-white`;
    const btnPrimaryLg = `inline-flex items-center justify-center gap-2 rounded-full font-bold text-base px-8 h-12 cursor-pointer select-none transition-all shadow-lg text-white`;
    const btnOutlineLg = `inline-flex items-center justify-center gap-2 rounded-full font-bold text-base px-8 h-12 border-2 cursor-pointer select-none transition-all`;

    return (
        <div className="min-h-screen font-sans overflow-x-hidden" style={{ backgroundColor: C.white, color: C.slate900 }}>

            {/* ── Navbar ───────────────────────────────────────────── */}
            <nav
                className={cn('fixed top-0 inset-x-0 z-50 transition-all duration-300', isScrolled ? 'py-3' : 'py-5')}
                style={{
                    backgroundColor: 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: isScrolled ? `1px solid ${C.slate100}` : 'none',
                    boxShadow: isScrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
                }}
            >
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <ZigZupIcon size={36} />
                        <span className="text-xl font-black tracking-tight lowercase" style={{ color: C.slate900 }}>
                            zig<span style={{ color: C.indigo, fontStyle: 'italic' }}>z</span>up
                        </span>
                    </div>

                    {/* Nav links */}
                    <div className="hidden md:flex items-center gap-10">
                        {[
                            { label: 'Features', href: '#features' },
                            { label: 'How it works', href: '#how-it-works' },
                            { label: 'Pricing', href: '#pricing' },
                        ].map(nav => (
                            <a key={nav.label} href={nav.href}
                                className="text-sm font-semibold transition-colors"
                                style={{ color: C.slate500 }}
                                onMouseEnter={e => (e.currentTarget.style.color = C.slate900)}
                                onMouseLeave={e => (e.currentTarget.style.color = C.slate500)}>
                                {nav.label}
                            </a>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-3">
                        <Link to="/login"
                            className="hidden sm:block text-sm font-semibold px-2 transition-colors"
                            style={{ color: C.slate600 }}
                            onMouseEnter={e => (e.currentTarget.style.color = C.indigo)}
                            onMouseLeave={e => (e.currentTarget.style.color = C.slate600)}>
                            Log in
                        </Link>
                        <Link to="/signup" className={btnPrimary}
                            style={{ backgroundColor: C.indigo }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.indigoDark)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.indigo)}>
                            Get started free
                        </Link>
                        <button className="md:hidden" style={{ color: C.slate700 }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden px-6 py-5 flex flex-col gap-4" style={{ backgroundColor: C.white, borderTop: `1px solid ${C.slate100}` }}>
                        {[{ label: 'Features', href: '#features' }, { label: 'How it works', href: '#how-it-works' }, { label: 'Pricing', href: '#pricing' }].map(item => (
                            <a key={item.label} href={item.href} className="text-sm font-semibold" style={{ color: C.slate600 }} onClick={() => setMobileMenuOpen(false)}>{item.label}</a>
                        ))}
                        <Link to="/login" className="text-sm font-semibold" style={{ color: C.slate600 }}>Log in</Link>
                    </div>
                )}
            </nav>

            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className="pt-28 pb-10 px-6" style={{ backgroundColor: C.white, overflowX: 'hidden' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center pb-16">

                        {/* Left — Text */}
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest rounded-full px-4 py-2"
                                style={{ color: C.indigo, backgroundColor: C.indigoBg }}>
                                <Sparkles className="w-3.5 h-3.5" />
                                AI-Powered Project Management
                            </div>

                            <h1 className="text-5xl lg:text-6xl xl:text-[66px] font-black tracking-tight" style={{ color: C.slate900, lineHeight: '1.1' }}>
                                The smarter way<br />
                                to ship your<br />
                                <RotatingWord />
                            </h1>

                            <p className="text-lg leading-relaxed max-w-lg font-medium" style={{ color: C.slate500 }}>
                                ZigZup brings AI-powered planning, kanban boards, and team workflows into one beautifully simple workspace — so you focus on building, not managing.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link to="/signup" className={btnPrimaryLg}
                                    style={{ backgroundColor: C.indigo }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.indigoDark; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.indigo; (e.currentTarget as HTMLElement).style.transform = ''; }}>
                                    Start for free <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link to="/login" className={btnOutlineLg}
                                    style={{ borderColor: C.slate200, color: C.slate800 }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.indigo; (e.currentTarget as HTMLElement).style.color = C.indigo; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.slate200; (e.currentTarget as HTMLElement).style.color = C.slate800; }}>
                                    Log in
                                </Link>
                            </div>

                            <div className="flex flex-wrap items-center gap-5 pt-1">
                                {['No credit card', 'Free forever plan', 'Setup in 30 seconds'].map(item => (
                                    <div key={item} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.slate400 }}>
                                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: C.indigo }} />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — Interactive Board */}
                        <InteractiveBoard />
                    </div>

                    {/* Stats Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x py-6" style={{ borderTop: `1px solid ${C.slate100}` }}>
                        {[
                            { label: 'Active Workspaces', value: '12K+' },
                            { label: 'Tasks Managed',     value: '2M+'  },
                            { label: 'AI Insights Given', value: '500K+'},
                            { label: 'Hours Saved / Team',value: '8 / wk' },
                        ].map(stat => (
                            <div key={stat.label} className="px-6 first:pl-0">
                                <p className="text-2xl font-black" style={{ color: C.slate900 }}>{stat.value}</p>
                                <p className="text-xs font-medium mt-0.5" style={{ color: C.slate400 }}>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ─────────────────────────────────────────── */}
            <section id="features" className="py-24 px-6" style={{ backgroundColor: C.slate50 }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.indigo }}>Everything you need</p>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight" style={{ color: C.slate900 }}>
                            One platform,{' '}
                            <span style={{ color: C.indigo }}>every tool</span>
                        </h2>
                        <p className="mt-4 max-w-xl mx-auto font-medium leading-relaxed" style={{ color: C.slate500 }}>
                            From kanban boards to AI assistants, ZigZup brings your entire workflow into one powerful workspace.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { icon: <Layout className="w-5 h-5" />, title: 'Kanban Boards',        desc: 'Drag-and-drop boards with custom lists, priorities, deadlines and assignees. Visualise everything at a glance.', bg: C.indigoBg, ic: C.indigo },
                            { icon: <Bot className="w-5 h-5" />,    title: 'AI Assistant — Zig',   desc: 'Ask Zig about your projects, get smart suggestions, detect bottlenecks, and generate task plans with advanced AI.', bg: '#ede9fe', ic: C.violet },
                            { icon: <Zap className="w-5 h-5" />,    title: 'Automations',          desc: 'Set up no-code triggers and actions to automate repetitive workflows. Save hours every single week.', bg: '#fef9c3', ic: '#ca8a04' },
                            { icon: <Calendar className="w-5 h-5"/>, title: 'Calendar View',       desc: 'See all tasks and deadlines in a unified calendar. Plan sprints and avoid scheduling conflicts effortlessly.', bg: '#dbeafe', ic: '#2563eb' },
                            { icon: <Video className="w-5 h-5" />,  title: 'Demo Recorder',        desc: 'Record, annotate, and share product demos with your team and clients — directly inside the platform.', bg: '#dcfce7', ic: '#16a34a' },
                            { icon: <Users className="w-5 h-5" />,  title: 'Team Collaboration',   desc: 'Invite members, assign roles, and work in real-time across unlimited workspaces with granular permissions.', bg: '#ffedd5', ic: '#ea580c' },
                        ].map((f, i) => (
                            <div key={i}
                                className="rounded-2xl p-6 border transition-all group cursor-default"
                                style={{ backgroundColor: C.white, borderColor: C.slate100 }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.30)'; e.currentTarget.style.boxShadow = '0 10px 30px -8px rgba(79,70,229,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = C.slate100; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = ''; }}>
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: f.bg, color: f.ic }}>
                                    {f.icon}
                                </div>
                                <h3 className="font-bold mb-2" style={{ color: C.slate900 }}>{f.title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: C.slate500 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 px-6" style={{ backgroundColor: C.white }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.indigo }}>Simple by design</p>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight" style={{ color: C.slate900 }}>
                            Up and running in <span style={{ color: C.indigo }}>minutes</span>
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-11 left-[20%] right-[20%] h-px"
                            style={{ backgroundImage: `linear-gradient(to right, ${C.indigo}30, ${C.indigo}80, ${C.indigo}30)` }} />
                        {[
                            { step: '01', title: 'Create your workspace', desc: 'Sign up, create a workspace, and invite your team in under 30 seconds. No complex setup required.' },
                            { step: '02', title: 'Build your boards',      desc: 'Create boards, add task lists and cards. Set priorities, deadlines, and assignees with one click.' },
                            { step: '03', title: 'Ship faster with AI',    desc: 'Let Zig surface insights, suggest priorities, and keep your whole team aligned — every single day.' },
                        ].map((s, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center text-center gap-5">
                                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg text-white"
                                    style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})` }}>
                                    {s.step}
                                </div>
                                <h3 className="text-lg font-black" style={{ color: C.slate900 }}>{s.title}</h3>
                                <p className="text-sm leading-relaxed max-w-xs" style={{ color: C.slate500 }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Kanban Preview ───────────────────────────────────── */}
            <section className="py-20 px-6" style={{ backgroundColor: C.slate50, borderTop: `1px solid ${C.slate100}`, borderBottom: `1px solid ${C.slate100}` }}>
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
                    <div className="space-y-6">
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.indigo }}>Boards & Cards</p>
                        <h2 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: C.slate900 }}>
                            A board for <span style={{ color: C.indigo, fontStyle: 'italic' }}>every</span> project
                        </h2>
                        <p className="leading-relaxed" style={{ color: C.slate500 }}>
                            Create unlimited boards across multiple workspaces. Drag cards across lists, set priorities, and track progress with beautiful pipeline views.
                        </p>
                        <ul className="space-y-3">
                            {['Drag-and-drop card management', 'Priority levels: Critical → Low', 'Custom labels, due dates & assignees', 'Pipeline stage tracking'].map(item => (
                                <li key={item} className="flex items-center gap-2 text-sm font-medium" style={{ color: C.slate700 }}>
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: C.indigo }} /> {item}
                                </li>
                            ))}
                        </ul>
                        <Link to="/signup" className={btnPrimaryLg}
                            style={{ backgroundColor: C.indigo, display: 'inline-flex', width: 'fit-content' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.indigoDark)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.indigo)}>
                            Try boards for free <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="rounded-3xl border shadow-xl p-5 overflow-hidden" style={{ backgroundColor: C.white, borderColor: C.slate100 }}>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {[
                                { name: 'To Do',       bg: C.slate50,                         cards: ['Design mockups', 'API planning', 'User research'] },
                                { name: 'In Progress', bg: `rgba(79,70,229,0.05)`,             cards: ['Build landing page', 'Auth flow'] },
                                { name: 'Done',        bg: '#f0fdf4',                          cards: ['Project setup', 'DB schema'] },
                            ].map(col => (
                                <div key={col.name} className="flex-shrink-0 w-44 rounded-xl p-3"
                                    style={{ backgroundColor: col.bg, border: `1px solid ${C.slate100}` }}>
                                    <p className="text-xs font-bold mb-3" style={{ color: C.slate600 }}>{col.name}</p>
                                    <div className="space-y-2">
                                        {col.cards.map(card => (
                                            <div key={card} className="rounded-lg p-2.5 shadow-sm border"
                                                style={{ backgroundColor: C.white, borderColor: C.slate100 }}>
                                                <p className="text-xs font-semibold" style={{ color: C.slate700 }}>{card}</p>
                                                <div className="flex gap-1 mt-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `${C.indigo}60` }} />
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.slate200 }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── AI Assistant ─────────────────────────────────────── */}
            <section className="py-24 px-6" style={{ backgroundColor: C.white }}>
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
                    {/* Chat mockup */}
                    <div className="rounded-3xl p-6 shadow-2xl" style={{ backgroundColor: C.slate900 }}>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: C.indigo }}>
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-sm text-white">Zig — AI Assistant</span>
                            <div className="ml-auto flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[10px] font-medium" style={{ color: C.slate400 }}>Online</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[
                                { role: 'user', text: 'What tasks are overdue this week?' },
                                { role: 'ai',   text: '3 overdue: "API integration" (2d), "Design review" (1d), and "Client demo prep" (due today). Want me to escalate priorities?' },
                                { role: 'user', text: 'Yes — and suggest how to reorganise the sprint.' },
                                { role: 'ai',   text: 'Moving 2 low-priority cards to next sprint frees up 6 hours. I\'d prioritise client demo first — highest business impact this week.' },
                            ].map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className="max-w-[82%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed"
                                        style={msg.role === 'user'
                                            ? { backgroundColor: C.indigo, color: C.white }
                                            : { backgroundColor: C.slate800, color: '#cbd5e1' }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.indigo }}>AI Assistant — Zig</p>
                        <h2 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: C.slate900 }}>
                            Your AI-powered <span style={{ color: C.indigo, fontStyle: 'italic' }}>co-pilot</span>
                        </h2>
                        <p className="leading-relaxed" style={{ color: C.slate500 }}>
                            Zig knows your entire project. Ask it anything — sprint planning, risk detection, team bottlenecks — and get instant, data-driven answers.
                        </p>
                        <ul className="space-y-3">
                            {['Natural language task creation', 'Automated sprint suggestions', 'Bottleneck & risk detection', 'Weekly project summaries'].map(item => (
                                <li key={item} className="flex items-center gap-2 text-sm font-medium" style={{ color: C.slate700 }}>
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: C.indigo }} /> {item}
                                </li>
                            ))}
                        </ul>
                        <Link to="/signup" className={btnPrimaryLg}
                            style={{ backgroundColor: C.indigo, display: 'inline-flex', width: 'fit-content' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.indigoDark)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.indigo)}>
                            Try Zig for free <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Notifications & Automations ──────────────────────── */}
            <section className="py-24 px-6" style={{ backgroundColor: C.slate50 }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.indigo }}>Stay in control</p>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight" style={{ color: C.slate900 }}>
                            Never miss a beat
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Notifications */}
                        <div className="rounded-3xl p-8 border" style={{ backgroundColor: C.white, borderColor: C.slate100 }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                                <Bell className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black mb-3" style={{ color: C.slate900 }}>Smart Notifications</h3>
                            <p className="mb-6 leading-relaxed text-sm" style={{ color: C.slate500 }}>
                                Stay on top of everything. Get notified when tasks update, deadlines approach, or teammates mention you.
                            </p>
                            <div className="space-y-2.5">
                                {[
                                    { title: 'Task assigned to you', time: '2m ago',  dot: C.indigo  },
                                    { title: 'Comment on "Landing page"', time: '15m ago', dot: '#2563eb' },
                                    { title: 'Deadline tomorrow: API docs', time: '1h ago',  dot: C.amber  },
                                ].map((n, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"
                                        style={{ backgroundColor: C.slate50, borderColor: C.slate100 }}>
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: n.dot }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate" style={{ color: C.slate700 }}>{n.title}</p>
                                            <p className="text-[10px]" style={{ color: C.slate400 }}>{n.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Automations */}
                        <div className="rounded-3xl p-8 text-white" style={{ backgroundColor: C.slate900 }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                                style={{ backgroundColor: 'rgba(79,70,229,0.25)', color: C.indigoLight }}>
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black mb-3">Automations</h3>
                            <p className="mb-6 leading-relaxed text-sm" style={{ color: C.slate400 }}>
                                Build powerful workflows without code. Automate routine tasks and focus on what actually matters.
                            </p>
                            <div className="space-y-3">
                                {[
                                    { trigger: 'When task is overdue',          action: '→ Escalate to Critical priority' },
                                    { trigger: 'When priority set to Critical', action: '→ Notify team & move to top'      },
                                    { trigger: 'When deadline in 24 hours',     action: '→ Send reminder to assignees'     },
                                ].map((rule, i) => (
                                    <div key={i} className="rounded-xl p-3.5" style={{ backgroundColor: C.slate800 }}>
                                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.slate500 }}>Trigger</p>
                                        <p className="text-xs font-semibold text-white">{rule.trigger}</p>
                                        <p className="text-xs font-bold mt-1" style={{ color: C.indigoLight }}>{rule.action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pricing ──────────────────────────────────────────── */}
            <section id="pricing" className="py-24 px-6" style={{ backgroundColor: C.white }}>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.indigo }}>Simple pricing</p>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight" style={{ color: C.slate900 }}>
                            Start free,{' '}
                            <span style={{ color: C.indigo }}>scale as you grow</span>
                        </h2>
                        <p className="mt-4 max-w-xl mx-auto font-medium" style={{ color: C.slate500 }}>
                            ZigZup is free to use. Support us to unlock premium features and keep the platform growing.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Free */}
                        <div className="rounded-3xl p-8 space-y-5 border-2" style={{ borderColor: C.slate100 }}>
                            <div>
                                <p className="font-black text-lg" style={{ color: C.slate900 }}>Free</p>
                                <p className="text-4xl font-black mt-1" style={{ color: C.slate900 }}>
                                    $0<span className="text-base font-medium" style={{ color: C.slate400 }}>/mo</span>
                                </p>
                            </div>
                            <ul className="space-y-3">
                                {['Unlimited boards', '3 workspaces', 'AI assistant (limited)', 'Real-time collaboration', '5 GB storage'].map(f => (
                                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.slate600 }}>
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: C.indigo }} /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="block text-center rounded-full font-bold py-3 transition-all text-white"
                                style={{ backgroundColor: C.slate900 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.indigo; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.slate900; }}>
                                Get started free
                            </Link>
                        </div>

                        {/* Donate / Supporter */}
                        <div className="rounded-3xl p-8 space-y-5 border-2 relative overflow-hidden"
                            style={{ borderColor: C.indigo, backgroundColor: 'rgba(79,70,229,0.04)' }}>
                            <div className="absolute top-5 right-5 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide text-white"
                                style={{ backgroundColor: C.indigo }}>
                                Supporter
                            </div>
                            <div>
                                <p className="font-black text-lg" style={{ color: C.slate900 }}>Donate</p>
                                <p className="text-4xl font-black mt-1" style={{ color: C.slate900 }}>
                                    Your<span className="text-base font-medium" style={{ color: C.slate400 }}> choice</span>
                                </p>
                            </div>
                            <ul className="space-y-3">
                                {['Everything in Free', 'Unlimited workspaces', 'Full AI access', 'Priority support', 'Early feature access'].map(f => (
                                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.slate600 }}>
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: C.indigo }} /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/donate" className="block text-center rounded-full font-bold py-3 text-white transition-all"
                                style={{ backgroundColor: C.indigo }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.indigoDark)}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.indigo)}>
                                Support ZigZup ♥
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ───────────────────────────────────────── */}
            <section id="contact" className="py-20 px-6 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${C.slate900} 0%, #1e1b4b 50%, ${C.slate900} 100%)` }}>
                {/* Subtle grid overlay */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: `radial-gradient(circle, rgba(79,70,229,0.15) 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
                <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-2"
                        style={{ backgroundColor: 'rgba(79,70,229,0.25)', color: C.indigoLight, fontSize: '12px', fontWeight: 700 }}>
                        <Sparkles className="w-3.5 h-3.5" />
                        Trusted by 12,000+ teams worldwide
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white">
                        Ready to{' '}
                        <span style={{
                            background: `linear-gradient(135deg, ${C.indigoLight}, #a5b4fc)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontStyle: 'italic',
                        }}>
                            ship faster?
                        </span>
                    </h2>
                    <p className="text-lg max-w-xl mx-auto" style={{ color: C.slate400 }}>
                        Join thousands of teams already using ZigZup. No credit card, no commitment, no complexity.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-2">
                        <Link to="/signup" className={btnPrimaryLg}
                            style={{ backgroundColor: C.indigo }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.indigoDark)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.indigo)}>
                            Start for free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link to="/login"
                            className="inline-flex items-center justify-center gap-2 rounded-full font-bold text-base px-8 h-12 border-2 cursor-pointer select-none transition-all text-white"
                            style={{ borderColor: 'rgba(79,70,229,0.5)' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = C.indigoLight)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)')}>
                            Log in
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────── */}
            <footer className="py-16 px-6" style={{ backgroundColor: '#020617' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-10 mb-12">
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <ZigZupIcon size={36} />
                                <span className="text-xl font-black tracking-tight lowercase text-white">
                                    zig<span style={{ color: C.indigoLight, fontStyle: 'italic' }}>z</span>up
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs" style={{ color: C.slate500 }}>
                                AI-powered project management for ambitious teams. Plan, build, and ship faster — together.
                            </p>
                            <p className="text-xs" style={{ color: C.slate600 }}>
                                A product by <span className="font-bold" style={{ color: C.slate500 }}>dotbotz Interactives Pvt. Ltd.</span>
                            </p>
                        </div>

                        <div>
                            <p className="font-bold text-sm mb-5 uppercase tracking-wide" style={{ color: C.slate400 }}>Product</p>
                            <ul className="space-y-3">
                                {[{ label: 'Features', href: '#features' }, { label: 'How it works', href: '#how-it-works' }, { label: 'Pricing', href: '#pricing' }].map(l => (
                                    <li key={l.label}>
                                        <a href={l.href} className="text-sm transition-colors" style={{ color: C.slate600 }}
                                            onMouseEnter={e => (e.currentTarget.style.color = C.white)}
                                            onMouseLeave={e => (e.currentTarget.style.color = C.slate600)}>{l.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p className="font-bold text-sm mb-5 uppercase tracking-wide" style={{ color: C.slate400 }}>Company</p>
                            <ul className="space-y-3">
                                {[{ label: 'Contact', to: '/contact' }, { label: 'Privacy Policy', to: '/privacy' }, { label: 'Terms of Service', to: '/terms' }, { label: 'Donate', to: '/donate' }].map(l => (
                                    <li key={l.label}>
                                        <Link to={l.to} className="text-sm transition-colors" style={{ color: C.slate600 }}
                                            onMouseEnter={e => (e.currentTarget.style.color = C.white)}
                                            onMouseLeave={e => (e.currentTarget.style.color = C.slate600)}>{l.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8"
                        style={{ borderTop: `1px solid ${C.slate800}` }}>
                        <p className="text-xs" style={{ color: C.slate600 }}>
                            © 2026 dotbotz Interactives Private Limited. All rights reserved.
                        </p>
                        <div className="flex gap-5">
                            <Link to="/privacy" className="text-xs transition-colors" style={{ color: C.slate600 }}>Privacy</Link>
                            <Link to="/terms"   className="text-xs transition-colors" style={{ color: C.slate600 }}>Terms</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
