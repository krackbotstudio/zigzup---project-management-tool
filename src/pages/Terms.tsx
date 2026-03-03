import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
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
                        <FileText className="w-3 h-3" />
                        Legal Document
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-none">Terms &amp;<br /><span className="text-primary italic">Conditions</span></h1>
                    <p className="text-slate-500 font-medium">Last updated: March 2, 2026</p>
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <p className="text-sm text-slate-600 font-medium">
                            These terms govern your use of Zigzup, a product by <strong>dotbotz Interactives Private Limited</strong>. By using Zigzup, you agree to these terms.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-12">
                    {[
                        {
                            title: "1. Acceptance of Terms",
                            body: "By accessing or using Zigzup, you confirm that you are at least 13 years old, capable of forming a binding contract, and agree to be bound by these Terms and Conditions and our Privacy Policy."
                        },
                        {
                            title: "2. Use of the Service",
                            body: "Zigzup grants you a limited, non-exclusive, non-transferable license to use the platform for personal or professional project management. You agree not to abuse, hack, reverse-engineer, scrape, or otherwise misuse the service. We reserve the right to terminate accounts that violate these terms."
                        },
                        {
                            title: "3. Your Content",
                            body: "You retain full ownership of any content you create on Zigzup (tasks, boards, notes). By using the service, you grant dotbotz Interactives Private Limited a limited license to store and display your content solely to provide the service to you."
                        },
                        {
                            title: "4. Account Responsibility",
                            body: "You are responsible for maintaining the confidentiality of your account credentials. You are liable for all activities that occur under your account. Notify us immediately at hello@dotbotz.com if you suspect unauthorized access."
                        },
                        {
                            title: "5. Donations & Payments",
                            body: "Zigzup is free to use. We accept voluntary donations from users who want to support the project. Donations are non-refundable and do not constitute a purchase of any specific features or services. All amounts are at the donor's discretion."
                        },
                        {
                            title: "6. Availability & Uptime",
                            body: "We strive for high availability but do not guarantee uninterrupted service. Zigzup may experience downtime for maintenance or due to unforeseen technical issues. We are not liable for any losses resulting from service interruptions."
                        },
                        {
                            title: "7. Intellectual Property",
                            body: "All Zigzup branding, UI design, logos, and proprietary software are owned by dotbotz Interactives Private Limited. You may not reproduce or redistribute them without explicit written permission."
                        },
                        {
                            title: "8. Termination",
                            body: "We may suspend or terminate your access to Zigzup at any time for violations of these terms, with or without notice. You may also delete your account at any time from the Settings page."
                        },
                        {
                            title: "9. Limitation of Liability",
                            body: "Zigzup is provided \"as is\" without warranty of any kind. dotbotz Interactives Private Limited shall not be liable for any indirect, incidental, or consequential damages arising from use of, or inability to use, the service."
                        },
                        {
                            title: "10. Governing Law",
                            body: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India."
                        },
                        {
                            title: "11. Contact",
                            body: "For any questions regarding these Terms, contact us at hello@dotbotz.com."
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
                        These terms apply to all Zigzup products and services provided by{' '}
                        <span className="text-white font-bold">dotbotz Interactives Private Limited</span>.
                    </p>
                </div>
            </main>
        </div>
    );
}
