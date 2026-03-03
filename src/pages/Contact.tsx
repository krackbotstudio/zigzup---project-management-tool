import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Mail, Twitter, Github, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Contact() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 py-4 px-8">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-slate-900 rounded-[12px] flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-slate-900 lowercase">zig<span className="text-primary italic">z</span>up</span>
                    </Link>
                    <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-8 py-20">
                {/* Header */}
                <div className="mb-16">
                    <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-primary mb-6">
                        <MessageCircle className="w-3 h-3" />
                        Get in Touch
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-none">Say<br /><span className="text-primary italic">Hello 👋</span></h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
                        We'd love to hear from you — whether it's feedback, a bug report, a feature idea, or just to say hi. Every message gets read.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Contact Cards */}
                    <div className="space-y-6">
                        {[
                            {
                                icon: <Mail className="w-5 h-5" />,
                                label: "Email Us",
                                value: "hello@dotbotz.com",
                                desc: "For general inquiries, feedback & support",
                                href: "mailto:hello@dotbotz.com",
                                color: "bg-blue-50 text-blue-600"
                            },
                            {
                                icon: <Twitter className="w-5 h-5" />,
                                label: "Twitter / X",
                                value: "@zigzup_app",
                                desc: "Fastest way to reach us publicly",
                                href: "https://twitter.com/zigzup_app",
                                color: "bg-sky-50 text-sky-600"
                            },
                            {
                                icon: <Github className="w-5 h-5" />,
                                label: "GitHub",
                                value: "github.com/dotbotz",
                                desc: "Open issues, suggest features",
                                href: "https://github.com/dotbotz",
                                color: "bg-slate-100 text-slate-700"
                            }
                        ].map((c) => (
                            <a
                                key={c.label}
                                href={c.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-4 p-6 rounded-3xl border-2 border-slate-100 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group"
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.color} group-hover:scale-110 transition-transform`}>
                                    {c.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
                                    <p className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">{c.value}</p>
                                    <p className="text-sm text-slate-500 font-medium mt-1">{c.desc}</p>
                                </div>
                            </a>
                        ))}
                    </div>

                    {/* About dotbotz */}
                    <div className="flex flex-col gap-8">
                        <div className="p-8 bg-slate-900 rounded-3xl text-white">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight mb-3">dotbotz Interactives<br />Private Limited</h2>
                            <p className="text-white/70 font-medium leading-relaxed text-sm">
                                We're a small, passionate team building tools that help people do meaningful work. Zigzup is our flagship product — built with love, shipped fast, and always improving thanks to our community.
                            </p>
                        </div>

                        <div className="p-8 bg-primary/5 border-2 border-primary/20 rounded-3xl">
                            <h3 className="text-xl font-black text-slate-900 mb-3">Response Time</h3>
                            <p className="text-slate-600 font-medium text-sm leading-relaxed mb-6">
                                We typically respond to emails within <strong>1–2 business days</strong>. For urgent issues, Twitter DMs are fastest.
                            </p>
                            <Button asChild className="w-full bg-slate-900 text-white rounded-2xl h-12 font-bold hover:bg-slate-800 transition-all">
                                <a href="mailto:hello@dotbotz.com">Send us an Email</a>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
