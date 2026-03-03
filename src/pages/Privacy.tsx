import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Lock } from 'lucide-react';

export default function Privacy() {
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
                    <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
                        <Lock className="w-3 h-3" />
                        Legal Document
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-none">Privacy<br /><span className="text-primary italic">Policy</span></h1>
                    <p className="text-slate-500 font-medium">Last updated: March 2, 2026</p>
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <p className="text-sm text-slate-600 font-medium">
                            Zigzup is a product of <strong>dotbotz Interactives Private Limited</strong>. We are committed to protecting your privacy and being transparent about how we handle your data.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="prose prose-slate max-w-none space-y-12">
                    {[
                        {
                            title: "1. Information We Collect",
                            body: `When you use Zigzup, we collect information you provide directly — such as your name, email address, and any content you create (boards, tasks, notes). We also automatically collect usage data like browser type, IP address, and interaction patterns to improve the product.`
                        },
                        {
                            title: "2. How We Use Your Information",
                            body: `We use collected information to provide, operate, and improve Zigzup. We may use your email to send important product updates, security alerts, or onboarding guides. We do not sell your personal data to third parties — ever.`
                        },
                        {
                            title: "3. Data Storage & Security",
                            body: `Your data is stored securely on Firebase (Google Cloud infrastructure), protected by industry-standard encryption at rest and in transit. We implement role-based access controls to ensure only you can access your workspace data.`
                        },
                        {
                            title: "4. Third-Party Services",
                            body: `Zigzup uses Firebase for authentication and data storage, and Stripe (if donations are processed). These services have their own privacy policies. We encourage you to review them.`
                        },
                        {
                            title: "5. Cookies",
                            body: `We use essential cookies for authentication sessions. We do not use advertising or tracking cookies. You can control cookie preferences in your browser settings.`
                        },
                        {
                            title: "6. Your Rights",
                            body: `You have the right to access, correct, or delete your personal data at any time. To make a request, contact us at hello@dotbotz.com. We will respond within 30 days.`
                        },
                        {
                            title: "7. Children's Privacy",
                            body: `Zigzup is not directed to children under 13. We do not knowingly collect personal data from children. If you believe we have inadvertently collected such data, contact us immediately.`
                        },
                        {
                            title: "8. Changes to This Policy",
                            body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a prominent in-app notice. Continued use of Zigzup after changes constitutes acceptance.`
                        },
                        {
                            title: "9. Contact Us",
                            body: `For privacy-related questions, contact dotbotz Interactives Private Limited at hello@dotbotz.com.`
                        }
                    ].map((section) => (
                        <div key={section.title} className="border-b border-slate-100 pb-10">
                            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{section.title}</h2>
                            <p className="text-slate-600 leading-relaxed font-medium">{section.body}</p>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="mt-16 p-6 bg-slate-900 rounded-3xl text-center">
                    <p className="text-white/70 text-sm font-medium">
                        This policy applies to all Zigzup products and services provided by{' '}
                        <span className="text-white font-bold">dotbotz Interactives Private Limited</span>.
                    </p>
                </div>
            </main>
        </div>
    );
}
