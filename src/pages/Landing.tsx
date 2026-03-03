import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    CheckCircle2,
    Layout,
    Zap,
    Shield,
    Users,
    BarChart3,
    MessageSquare,
    Globe,
    Sparkles,
    ChevronRight,
    Play,
    Menu,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            icon: <Layout className="w-6 h-6" />,
            title: "Intuitive Kanban Boards",
            description: "Visualize your workflow and move tasks with ease. Our drag-and-drop interface makes project management feel like play."
        },
        {
            icon: <Sparkles className="w-6 h-6" />,
            title: "AI-Powered Insights",
            description: "Get smart suggestions and performance analytics to optimize your team's velocity and identify bottlenecks before they happen."
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "Instant Automations",
            description: "Save hours every week with custom triggers and actions. Let Zigzup handle the repetitive tasks while you focus on deep work."
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: "Seamless Collaboration",
            description: "Invite team members, share feedback in real-time, and keep everyone aligned with built-in communication tools."
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: "Advanced Reporting",
            description: "Track progress across multiple workspaces with high-level overviews and granular data exports."
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Enterprise Security",
            description: "Your data is protected with industrial-grade encryption and granular role-based access controls."
        }
    ];

    return (
        <div className="min-h-screen bg-white text-slate-900 selection:bg-primary/20 selection:text-primary overflow-hidden font-sans">
            {/* Dynamic Background Elements */}
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-[15%] left-[5%] w-[150px] h-[150px] bg-yellow-400 rounded-full blur-[80px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[10%] w-[200px] h-[200px] bg-blue-400 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] right-[30%] w-[100px] h-[100px] bg-primary/30 rounded-full blur-[60px]" />
            </div>

            {/* Navbar */}
            <nav className={cn(
                "fixed top-0 inset-x-0 z-50 transition-all duration-500",
                isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-3 shadow-sm" : "bg-transparent py-6"
            )}>
                <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 lowercase">zig<span className="text-primary italic">z</span>up</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-12">
                        {['Product', 'Pricing', 'Company', 'Jobs'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors relative group">
                                {item}
                                {item === 'Jobs' && <span className="ml-2 bg-yellow-400 text-[10px] font-black px-2 py-0.5 rounded-full inline-block transform -translate-y-1">6</span>}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Button
                                onClick={() => navigate('/dashboard')}
                                variant="ghost"
                                className="rounded-full px-6 text-sm font-bold text-slate-600 hover:bg-slate-50"
                            >
                                Go to Dashboard
                            </Button>
                        ) : (
                            <>
                                <Link to="/login" className="hidden sm:block text-sm font-bold text-slate-600 hover:text-slate-900 px-4">Login</Link>
                                <Button
                                    asChild
                                    className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-8 h-12 text-sm font-bold transition-all shadow-lg hover:shadow-xl active:scale-95"
                                >
                                    <Link to="/signup">Sign up</Link>
                                </Button>
                            </>
                        )}
                        <button className="md:hidden text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section - The "Nunito/DSM" style */}
            <section className="relative pt-40 pb-24 md:pt-64 md:pb-40 px-6 max-w-[1400px] mx-auto overflow-visible">
                <div className="text-center relative">

                    {/* Illustrative Decorations */}
                    <div className="absolute top-[-100px] left-[5%] animate-bounce duration-[3000ms] hidden xl:block">
                        <div className="w-40 h-40 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl">
                            <div className="w-4 h-4 rounded-full bg-blue-500 absolute top-10 left-10" />
                            <div className="w-12 h-6 bg-white rounded-full flex items-center px-1 shadow-inner">
                                <div className="w-4 h-4 bg-slate-200 rounded-full" />
                            </div>
                        </div>
                        <svg className="absolute top-40 left-20 w-80 h-40 text-slate-900 opacity-20" fill="none">
                            <path d="M0 0 C 40 100, 160 100, 200 150" stroke="currentColor" strokeWidth="3" strokeDasharray="8 8" />
                            <circle cx="200" cy="150" r="6" fill="#3b82f6" />
                        </svg>
                    </div>

                    <div className="absolute top-[150px] right-[5%] hidden xl:block">
                        <div className="w-32 h-12 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center gap-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="w-4 h-4 rounded-full bg-green-500" />
                            <div className="w-12 h-2 bg-slate-200 rounded-full" />
                        </div>
                        <svg className="absolute top-6 left-[-150px] w-[150px] h-[100px] text-slate-900 opacity-20" fill="none">
                            <path d="M150 0 C 100 0, 50 50, 0 50" stroke="currentColor" strokeWidth="3" strokeDasharray="8 8" />
                            <polygon points="-5,50 5,45 5,55" fill="currentColor" />
                        </svg>
                    </div>

                    {/* Main Title Area */}
                    <div className="relative inline-block px-4">
                        <h1 className="text-6xl md:text-[140px] font-bold text-slate-900 leading-[0.85] tracking-[-0.04em] mb-4">
                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
                                <span>ignite</span>
                                <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 bg-primary rounded-full group transition-transform hover:scale-110 cursor-pointer shadow-lg shadow-primary/20">
                                    <ArrowRight className="w-12 h-12 md:w-16 md:h-16 text-white group-hover:translate-x-2 transition-transform" />
                                </div>
                                <div className="w-40 h-20 md:w-56 md:h-28 bg-gradient-to-r from-primary to-accent rounded-full relative overflow-hidden group">
                                    <div className="absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                                        <Zap className="w-6 h-6 md:w-8 md:h-8 text-primary animate-pulse" />
                                    </div>
                                    <div className="absolute top-1/2 right-4 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 flex items-center justify-center opacity-60">
                                        <span className="text-2xl md:text-3xl animate-bounce">🚀</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 mt-6">
                                <span>— your next</span>
                                <div className="w-32 h-14 md:w-48 md:h-20 border-4 border-slate-900 rounded-full flex items-center justify-center group overflow-hidden">
                                    <div className="w-3/4 h-3 md:h-4 bg-primary rounded-full group-hover:w-full transition-all duration-700" />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 mt-6">
                                <div className="w-32 h-24 md:w-44 md:h-32 bg-gradient-to-br from-primary/80 to-accent rounded-full flex items-center justify-center relative shadow-lg">
                                    <div className="w-16 h-8 md:w-24 md:h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-inner">
                                        <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                                    </div>
                                </div>
                                <span>project</span>
                            </div>
                        </h1>
                    </div>

                    <p className="max-w-xl mx-auto text-lg md:text-xl text-slate-500 font-medium py-12 animate-in fade-in slide-in-from-bottom-8 duration-700 leading-relaxed italic">
                        The AI-powered workspace where ambitious teams <br className="hidden md:block" />
                        plan, build, and ship. Faster than ever. 🦾
                    </p>

                    <div className="flex flex-col items-center gap-6">
                        <Button
                            asChild
                            className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-12 h-16 text-md font-black shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all"
                        >
                            <Link to="/signup">
                                Try it for free
                            </Link>
                        </Button>
                        <button className="text-sm font-bold text-slate-900 underline underline-offset-4 hover:text-primary transition-colors">
                            Watch the demo video
                        </button>
                    </div>

                    {/* Brand/Partner Logos Area */}
                    <div className="mt-32 opacity-30 grayscale contrast-125">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 mb-12">Trusted by founders & creators at</p>
                        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
                            {['Vercel', 'Linear', 'Replit', 'Notion', 'Slack'].map(brand => (
                                <span key={brand} className="text-xl md:text-4xl font-black tracking-tighter lowercase">{brand}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Floating elements at bottom */}
                <div className="absolute bottom-20 left-[15%] text-blue-400 animate-pulse transition-opacity duration-1000">
                    <Sparkles className="w-8 h-8 fill-current" />
                </div>
                <div className="absolute bottom-40 right-[15%] text-yellow-500 animate-bounce transition-opacity duration-1000">
                    <Sparkles className="w-6 h-6 fill-current" />
                </div>
                <div className="absolute bottom-10 right-[35%] text-primary animate-pulse transition-opacity duration-1000">
                    <Sparkles className="w-5 h-5 fill-current" />
                </div>
            </section>

            {/* Features Grid - Clean & Minimal */}
            <section id="product" className="py-32 px-8 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                        {features.map((feature, i) => (
                            <div key={i} className="group flex flex-col items-start gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-xl group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:-rotate-6">
                                    {feature.icon}
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{feature.title}</h3>
                                    <p className="text-slate-500 leading-relaxed text-md font-medium">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer - Minimal */}
            <footer className="py-24 px-8 border-t border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-900 rounded-[10px] flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-black tracking-tighter text-slate-900 lowercase">zig<span className="text-primary italic">z</span>up</span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium pl-1">
                                A product from <span className="font-bold text-slate-600">dotbotz Interactives Private Limited</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-x-10 gap-y-6">
                            <a href="#product" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Features</a>
                            <Link to="/donate" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Pricing</Link>
                            <Link to="/contact" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Contact</Link>
                            <Link to="/privacy" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Privacy</Link>
                            <Link to="/terms" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Terms</Link>
                        </div>

                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            © 2026 dotbotz Interactives
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
