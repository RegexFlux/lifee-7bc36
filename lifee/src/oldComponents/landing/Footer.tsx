import React from "react";
import {
    ShieldCheck,
    Heart,
    Mail,
    FileText,
    ScrollText,
    ArrowUpRight,
    Sparkles,
} from "lucide-react";

export default function Footer() {
    return (
        <footer className="relative overflow-hidden bg-stone-950 text-stone-300">
            {/* Ambient */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/[0.03]" />
            </div>

            <div className="relative border-t border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    {/* Top */}
                    <div className="grid gap-10 md:grid-cols-12 items-start">
                        {/* Brand */}
                        <div className="md:col-span-5">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                                    <Heart size={16} className="text-rose-300 fill-rose-300" />
                                </span>
                                <div className="min-w-0">
                                    <div className="font-serif text-stone-100 text-xl leading-none">Lifee.</div>
                                    <div className="mt-1 text-xs text-stone-400">
                                        Transformez vos souvenirs en film — simplement, en famille.
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-stone-300">
                                <Sparkles size={12} className="text-amber-300" />
                                Studio guidé • Export HD • Partage privé
                            </div>
                        </div>

                        {/* Trust */}
                        <div className="md:col-span-4">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                        <ShieldCheck size={16} className="text-emerald-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-stone-100">Données chiffrées & privées</div>
                                        <div className="mt-1 text-xs text-stone-400 leading-relaxed">
                                            Vos médias restent sous votre contrôle. Accès sécurisé et partage maîtrisé.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Links */}
                        <div className="md:col-span-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                                Ressources
                            </div>

                            <div className="mt-3 space-y-2">
                                <a
                                    href="#"
                                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:bg-white/[0.06] transition"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <FileText size={14} className="text-stone-300" />
                                        Mentions légales
                                    </span>
                                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-stone-200 transition" />
                                </a>

                                <a
                                    href="#"
                                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:bg-white/[0.06] transition"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <ScrollText size={14} className="text-stone-300" />
                                        CGV
                                    </span>
                                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-stone-200 transition" />
                                </a>

                                <a
                                    href="mailto:support@lifee.app"
                                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:bg-white/[0.06] transition"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <Mail size={14} className="text-stone-300" />
                                        Contact support
                                    </span>
                                    <ArrowUpRight size={14} className="text-stone-400 group-hover:text-stone-200 transition" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Bottom */}
                    <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="text-xs text-stone-500">
                            © {new Date().getFullYear()} Lifee. Fait avec amour en France.
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                                Sauvegarde automatique
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80" />
                                Export HD
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-300/80" />
                                Partage privé
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
