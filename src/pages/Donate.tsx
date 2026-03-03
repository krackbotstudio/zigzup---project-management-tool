import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Heart, Coffee, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tiers = [
    {
        emoji: "☕",
        icon: <Coffee className="w-6 h-6" />,
        label: "Buy us a coffee",
        amount: "₹99",
        amountUSD: "$1",
        desc: "A small nudge that keeps the team going through late nights.",
        color: "bg-amber-50 border-amber-200",
        iconColor: "bg-amber-100 text-amber-700",
        tag: null,
    },
    {
        emoji: "🌟",
        icon: <Star className="w-6 h-6" />,
        label: "Super Supporter",
        amount: "₹499",
        amountUSD: "$6",
        desc: "You believe in what we're building. This means the world to us.",
        color: "bg-primary/5 border-primary/30",
        iconColor: "bg-primary/10 text-primary",
        tag: "Most Popular",
    },
    {
        emoji: "🚀",
        icon: <Sparkles className="w-6 h-6" />,
        label: "Founding Patron",
        amount: "₹1,999",
        amountUSD: "$24",
        desc: "You're helping shape the future of Zigzup. You're legendary.",
        color: "bg-slate-900 border-slate-900",
        iconColor: "bg-white/10 text-white",
        tag: "Legend",
    }
];

export default function Donate() {
    const handleDonate = (amount: string) => {
        // Link to a payment page — UPI or Stripe can be wired here
        // For now open a mailto or a UPI intent as placeholder
        window.open(`mailto:hello@dotbotz.com?subject=Donation: ${amount}&body=Hi dotbotz team, I'd like to donate ${amount} to support Zigzup! Please share payment details.`, '_blank');
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 py-4 px-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
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

            <main className="max-w-5xl mx-auto px-8 py-20">
                {/* Header */}
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 bg-rose-50 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-500 mb-6">
                        <Heart className="w-3 h-3 fill-rose-500" />
                        Support Zigzup
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-none">
                        Zigzup is<br /><span className="text-primary italic">Free, Forever.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                        We believe great tools should be accessible to everyone. Zigzup has no subscription, no paywalls, no ads. If you love what we're building and want to help it grow — a voluntary donation means everything to us. 💛
                    </p>
                </div>

                {/* Donation Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    {tiers.map((tier) => (
                        <div
                            key={tier.label}
                            className={`relative rounded-3xl border-2 p-8 flex flex-col gap-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${tier.color}`}
                        >
                            {tier.tag && (
                                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${tier.label === 'Founding Patron' ? 'bg-yellow-400 text-slate-900' : 'bg-primary text-white'}`}>
                                    {tier.tag}
                                </div>
                            )}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tier.iconColor}`}>
                                {tier.icon}
                            </div>
                            <div>
                                <p className={`text-xs font-black uppercase tracking-widest mb-2 ${tier.label === 'Founding Patron' ? 'text-white/50' : 'text-slate-400'}`}>{tier.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-5xl font-black tracking-tighter ${tier.label === 'Founding Patron' ? 'text-white' : 'text-slate-900'}`}>{tier.amount}</span>
                                    <span className={`text-sm font-bold ${tier.label === 'Founding Patron' ? 'text-white/50' : 'text-slate-400'}`}>/ one-time</span>
                                </div>
                                <p className={`text-sm font-medium mt-3 leading-relaxed ${tier.label === 'Founding Patron' ? 'text-white/70' : 'text-slate-500'}`}>{tier.desc}</p>
                            </div>
                            <Button
                                onClick={() => handleDonate(`${tier.amount} (${tier.amountUSD})`)}
                                className={`mt-auto h-12 rounded-2xl font-bold transition-all ${tier.label === 'Founding Patron' ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                {tier.emoji} Donate {tier.amount}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Custom Amount */}
                <div className="p-10 bg-slate-50 rounded-3xl border-2 border-slate-200 text-center mb-16">
                    <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Donate Any Amount</h2>
                    <p className="text-slate-500 font-medium mb-8 max-w-xl mx-auto">
                        Every rupee counts. Choose your own amount — even the smallest contribution fuels late-night debugging sessions and keeps Zigzup running.
                    </p>
                    <Button
                        onClick={() => handleDonate("custom amount")}
                        variant="outline"
                        className="h-14 px-12 rounded-full border-2 border-slate-900 font-black text-slate-900 hover:bg-slate-900 hover:text-white transition-all text-base"
                    >
                        <Heart className="w-4 h-4 mr-2 fill-rose-500 text-rose-500" />
                        Choose My Own Amount
                    </Button>
                </div>

                {/* Trust Note */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { icon: "🔓", title: "Always Free", desc: "Zigzup will always be free. Donations are 100% voluntary — no pressure, ever." },
                        { icon: "🎯", title: "Funds the Product", desc: "Your donation goes directly to server costs, development time, and new features." },
                        { icon: "💌", title: "We'll Say Thanks", desc: "Every donor gets a personal thank-you note from the dotbotz team." }
                    ].map((item) => (
                        <div key={item.title} className="p-6 rounded-2xl bg-white border border-slate-100 text-center">
                            <div className="text-4xl mb-4">{item.icon}</div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
