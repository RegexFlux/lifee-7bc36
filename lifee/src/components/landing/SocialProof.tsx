"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Star,
    Quote,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    ShieldCheck,
    CheckCircle2,
    MapPin,
    Flag,
} from "lucide-react";

type Testimonial = {
    id: string;
    country: "US" | "FR" | "ES" | string;
    city?: string;
    rating: 1 | 2 | 3 | 4 | 5;
    dateLabel?: string;
    name: string;
    role?: string;
    highlight?: string;
    quote: string;
};

export const TESTIMONIALS = [
    // --- 🇺🇸 United States (27) ---
    { id: "us-01", country: "US", city: "Austin, TX", rating: 5, dateLabel: "Dec 2025", name: "Emma R.", role: "Granddaughter", highlight: "Tears", quote: "I animated my grandma’s 1962 wedding photo and my whole family went quiet. It felt respectful and real, not gimmicky." },
    { id: "us-02", country: "US", city: "Seattle, WA", rating: 5, dateLabel: "Dec 2025", name: "Michael T.", role: "Dad of 2", highlight: "So easy", quote: "Drop photos → drag timeline → export. I’m not a video person and I still made something beautiful in one evening." },
    { id: "us-03", country: "US", city: "New York, NY", rating: 4, dateLabel: "Nov 2025", name: "Olivia K.", role: "Family archivist", highlight: "Great quality", quote: "Love the look. Tiny gripe: I wish the first-time tutorial was a bit more guided, but once you get it, it’s smooth." },
    { id: "us-04", country: "US", city: "San Diego, CA", rating: 5, dateLabel: "Nov 2025", name: "James P.", role: "Son", highlight: "Sharing", quote: "The private sharing link is what sold me. No social networks, just family. That matters." },
    { id: "us-05", country: "US", city: "Chicago, IL", rating: 4, dateLabel: "Nov 2025", name: "Samantha L.", role: "Mom", highlight: "Fast", quote: "Export looked crisp. It took longer than I expected once (busy time?), but the result was worth it." },
    { id: "us-06", country: "US", city: "Boston, MA", rating: 5, dateLabel: "Oct 2025", name: "Noah D.", role: "Grandson", highlight: "Emotional", quote: "Seeing my grandfather ‘move’ from a single photo hit me hard. It’s like memory got upgraded." },
    { id: "us-07", country: "US", city: "Denver, CO", rating: 5, dateLabel: "Oct 2025", name: "Ava S.", role: "Sister", highlight: "Wow", quote: "The timeline is insanely intuitive. Dragging feels like a real editor, but without the complexity." },
    { id: "us-08", country: "US", city: "Miami, FL", rating: 4, dateLabel: "Oct 2025", name: "Daniel G.", role: "Cousin", highlight: "Clean", quote: "Love the clean UI. Minor thing: I’d like more export presets (720p quick / 1080p best)." },
    { id: "us-09", country: "US", city: "Portland, OR", rating: 5, dateLabel: "Sep 2025", name: "Chloe M.", role: "Daughter", highlight: "Quality", quote: "It didn’t destroy the photo. Colors stayed natural, faces looked respectful. That’s rare." },
    { id: "us-10", country: "US", city: "Phoenix, AZ", rating: 4, dateLabel: "Sep 2025", name: "Ryan B.", role: "Dad", highlight: "Simple", quote: "Super simple. I had one glitch where the preview didn’t refresh instantly, but it fixed itself after a second." },
    { id: "us-11", country: "US", city: "San Jose, CA", rating: 5, dateLabel: "Sep 2025", name: "Lily H.", role: "Granddaughter", highlight: "Family night", quote: "We watched it on TV and everyone started telling stories. It turned into a real family moment." },
    { id: "us-12", country: "US", city: "Philadelphia, PA", rating: 5, dateLabel: "Aug 2025", name: "Ethan W.", role: "Son", highlight: "Respectful", quote: "The animation is subtle. It feels like bringing life back without turning it into a cartoon." },
    { id: "us-13", country: "US", city: "Dallas, TX", rating: 4, dateLabel: "Aug 2025", name: "Mia J.", role: "Mom", highlight: "Great", quote: "I’d love a ‘recommended order’ button for timeline, but manually organizing was still easy." },
    { id: "us-14", country: "US", city: "Atlanta, GA", rating: 5, dateLabel: "Aug 2025", name: "Benjamin C.", role: "Grandson", highlight: "Surprised", quote: "I expected a gimmick. Instead I got something I’d actually keep and replay." },
    { id: "us-15", country: "US", city: "Minneapolis, MN", rating: 4, dateLabel: "Jul 2025", name: "Grace F.", role: "Daughter", highlight: "Lovely", quote: "Everything is smooth. The only thing: more music moods would be nice." },
    { id: "us-16", country: "US", city: "Las Vegas, NV", rating: 5, dateLabel: "Jul 2025", name: "Logan N.", role: "Brother", highlight: "Easy", quote: "I made a tribute video in 20 minutes. That’s wild." },
    { id: "us-17", country: "US", city: "Charlotte, NC", rating: 4, dateLabel: "Jul 2025", name: "Zoe V.", role: "Granddaughter", highlight: "Beautiful", quote: "The export is gorgeous. It did take a few minutes longer late at night, but I get it." },
    { id: "us-18", country: "US", city: "Nashville, TN", rating: 5, dateLabel: "Jun 2025", name: "Henry A.", role: "Son", highlight: "Story", quote: "It helped me build a story from scattered photos. The timeline makes narrative feel natural." },
    { id: "us-19", country: "US", city: "Cleveland, OH", rating: 5, dateLabel: "Jun 2025", name: "Isabella Q.", role: "Mom", highlight: "No stress", quote: "Finally something that doesn’t feel like a complicated editor. It’s guided but not annoying." },
    { id: "us-20", country: "US", city: "Salt Lake City, UT", rating: 4, dateLabel: "Jun 2025", name: "Jack E.", role: "Husband", highlight: "Good", quote: "I’d like keyboard shortcuts on desktop, but drag & drop already does most of the job." },
    { id: "us-21", country: "US", city: "Orlando, FL", rating: 5, dateLabel: "May 2025", name: "Natalie Z.", role: "Daughter", highlight: "Instant", quote: "Upload → timeline → done. It’s the first app that made me finish a memory project." },
    { id: "us-22", country: "US", city: "Detroit, MI", rating: 4, dateLabel: "May 2025", name: "Christopher I.", role: "Grandson", highlight: "Solid", quote: "Solid product. One photo looked slightly over-sharpened, but most came out perfect." },
    { id: "us-23", country: "US", city: "Raleigh, NC", rating: 5, dateLabel: "May 2025", name: "Victoria P.", role: "Sister", highlight: "Shared", quote: "We sent it to the family group chat and it became the best thread we’ve had in years." },
    { id: "us-24", country: "US", city: "San Francisco, CA", rating: 4, dateLabel: "Apr 2025", name: "Andrew S.", role: "Dad", highlight: "Great UI", quote: "UI is premium. Small gripe: I’d like a ‘duplicate clip’ option on the timeline." },
    { id: "us-25", country: "US", city: "Baltimore, MD", rating: 5, dateLabel: "Apr 2025", name: "Hannah B.", role: "Granddaughter", highlight: "Goosebumps", quote: "Goosebumps. The motion is subtle and keeps the original vibe." },
    { id: "us-26", country: "US", city: "Tampa, FL", rating: 4, dateLabel: "Mar 2025", name: "Jordan L.", role: "Son", highlight: "Nice", quote: "Great. I’d love more export progress details sometimes, but it always finished." },
    { id: "us-27", country: "US", city: "Madison, WI", rating: 5, dateLabel: "Mar 2025", name: "Sophia Y.", role: "Daughter", highlight: "So worth it", quote: "It turned an old shoebox of photos into something shareable. That’s the value." },

    // --- 🇫🇷 France (14) ---
    { id: "fr-01", country: "FR", city: "Paris", rating: 5, dateLabel: "Déc. 2025", name: "Camille L.", role: "Petite-fille", highlight: "Très émouvant", quote: "Voir mon grand-père “revivre” sur une photo, c’est indescriptible. Le rendu reste sobre et respectueux." },
    { id: "fr-02", country: "FR", city: "Lyon", rating: 5, dateLabel: "Déc. 2025", name: "Julien M.", role: "Papa", highlight: "Ultra simple", quote: "Je pensais que ça allait être technique. En fait : déposer, glisser, exporter. Mes enfants ont adoré." },
    { id: "fr-03", country: "FR", city: "Bordeaux", rating: 4, dateLabel: "Nov. 2025", name: "Sophie D.", role: "Aidante familiale", highlight: "Beau", quote: "Super beau. Petite critique : j’aimerais un peu plus de guidance au tout premier usage." },
    { id: "fr-04", country: "FR", city: "Toulouse", rating: 5, dateLabel: "Nov. 2025", name: "Nadia R.", role: "Sœur", highlight: "Partage", quote: "Le partage privé est parfait. On l’a envoyé à toute la famille sans passer par les réseaux." },
    { id: "fr-05", country: "FR", city: "Nantes", rating: 4, dateLabel: "Oct. 2025", name: "Thomas G.", role: "Fils", highlight: "Qualité photo", quote: "La qualité est vraiment bonne. Une image un peu sombre a été moins bien restaurée, mais globalement top." },
    { id: "fr-06", country: "FR", city: "Strasbourg", rating: 5, dateLabel: "Oct. 2025", name: "Élise P.", role: "Petite-fille", highlight: "Transmission", quote: "Ça rend la transmission facile : on raconte l’histoire en photos et ça devient un film." },
    { id: "fr-07", country: "FR", city: "Marseille", rating: 5, dateLabel: "Sept. 2025", name: "Karim B.", role: "Oncle", highlight: "Rendu cinéma", quote: "Je suis exigeant sur le rendu : ici c’est propre, pas gadget. Ça fait vraiment “film souvenir”." },
    { id: "fr-08", country: "FR", city: "Lille", rating: 4, dateLabel: "Sept. 2025", name: "Claire V.", role: "Maman", highlight: "Rapide", quote: "Très rapide à prendre en main. J’aimerais juste plus de musiques “douces” en sélection." },
    { id: "fr-09", country: "FR", city: "Montpellier", rating: 5, dateLabel: "Août 2025", name: "Pierre S.", role: "Petit-fils", highlight: "Wow", quote: "La timeline est une évidence. On comprend tout sans réfléchir." },
    { id: "fr-10", country: "FR", city: "Nice", rating: 4, dateLabel: "Août 2025", name: "Laura A.", role: "Fille", highlight: "Très bon", quote: "Export nickel. Un soir, j’ai trouvé l’export un peu long, mais ça a fini sans souci." },
    { id: "fr-11", country: "FR", city: "Rennes", rating: 5, dateLabel: "Juil. 2025", name: "Antoine N.", role: "Papa", highlight: "Fierté", quote: "J’ai enfin fini un projet “famille”. D’habitude je commence et j’abandonne." },
    { id: "fr-12", country: "FR", city: "Grenoble", rating: 4, dateLabel: "Juin 2025", name: "Manon C.", role: "Petite-fille", highlight: "Touchant", quote: "Très touchant. J’aimerais pouvoir ajouter une petite légende par clip (optionnel)." },
    { id: "fr-13", country: "FR", city: "Reims", rating: 5, dateLabel: "Mai 2025", name: "Alexis H.", role: "Fils", highlight: "Familial", quote: "On l’a regardé ensemble. Ça a relancé plein d’histoires qu’on ne racontait plus." },
    { id: "fr-14", country: "FR", city: "Tours", rating: 5, dateLabel: "Avr. 2025", name: "Chloé F.", role: "Sœur", highlight: "Cocoon", quote: "Le style est doux, rassurant. On sent que c’est pensé pour la famille, pas pour “faire du buzz”." },

    // --- 🇪🇸 Spain (4) ---
    { id: "es-01", country: "ES", city: "Madrid", rating: 5, dateLabel: "Dic 2025", name: "Lucía M.", role: "Nieta", highlight: "Emocionante", quote: "Ver la foto de mis abuelos moverse fue precioso. La animación es sutil y elegante." },
    { id: "es-02", country: "ES", city: "Barcelona", rating: 4, dateLabel: "Nov 2025", name: "Javier R.", role: "Hijo", highlight: "Muy bien", quote: "La interfaz es muy clara. Me gustaría un poco más de control en el orden automático, pero el drag & drop funciona perfecto." },
    { id: "es-03", country: "ES", city: "Valencia", rating: 5, dateLabel: "Oct 2025", name: "Paula S.", role: "Hermana", highlight: "Familia", quote: "Lo compartimos en familia y fue un momento increíble. Es justo lo que necesitábamos." },
    { id: "es-04", country: "ES", city: "Sevilla", rating: 4, dateLabel: "Sep 2025", name: "Carlos G.", role: "Nieto", highlight: "Calidad", quote: "Muy buena calidad. Una foto antigua quedó un poco oscura, pero el resultado final fue muy bonito." },

    // --- 🌍 Others (5) ---
    { id: "ot-01", country: "CA", city: "Montréal", rating: 5, dateLabel: "Dec 2025", name: "Émilie B.", role: "Daughter", highlight: "So moving", quote: "It’s the first tool that made my family actually watch the final result together." },
    { id: "ot-02", country: "UK", city: "London", rating: 4, dateLabel: "Nov 2025", name: "Oliver S.", role: "Son", highlight: "Great", quote: "The flow is amazing. Minor suggestion: add more soundtrack styles or upload your own track." },
    { id: "ot-03", country: "BE", city: "Bruxelles", rating: 5, dateLabel: "Oct 2025", name: "Sarah L.", role: "Petite-fille", highlight: "Transmission", quote: "On a tout centralisé et ça devient enfin simple à partager. Très rassurant." },
    { id: "ot-04", country: "CH", city: "Genève", rating: 4, dateLabel: "Sep 2025", name: "Nicolas M.", role: "Papa", highlight: "Propre", quote: "C’est propre et fluide. Une option 'raccourcis clavier' sur desktop serait un vrai plus." },
    { id: "ot-05", country: "DE", city: "Berlin", rating: 5, dateLabel: "Aug 2025", name: "Lea K.", role: "Granddaughter", highlight: "Love it", quote: "It feels premium, not like a toy. The small details make it feel safe and emotional." },
];

function cls(...a: Array<string | false | null | undefined>) {
    return a.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const update = () => {
            try {
                setIsMobile(window.matchMedia("(max-width: 768px)").matches);
            } catch {
                setIsMobile(false);
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);
    return isMobile;
}

function countryLabel(code: string) {
    if (code === "US") return "États-Unis";
    if (code === "FR") return "France";
    if (code === "ES") return "Espagne";
    return "Autres";
}

function countryPillStyle(code: string) {
    if (code === "US")
        return {
            bg: "bg-sky-50",
            border: "border-sky-200",
            text: "text-sky-800",
            dot: "bg-sky-500",
        };
    if (code === "FR")
        return {
            bg: "bg-indigo-50",
            border: "border-indigo-200",
            text: "text-indigo-800",
            dot: "bg-indigo-500",
        };
    if (code === "ES")
        return {
            bg: "bg-amber-50",
            border: "border-amber-200",
            text: "text-amber-800",
            dot: "bg-amber-500",
        };
    return {
        bg: "bg-stone-50",
        border: "border-stone-200",
        text: "text-stone-800",
        dot: "bg-stone-500",
    };
}

function initials(name: string) {
    const parts = name.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
}

function toneFromText(t: Testimonial) {
    const s = `${t.quote} ${t.highlight || ""}`.toLowerCase();
    const hasCritique =
        s.includes("gripe") ||
        s.includes("minor") ||
        s.includes("wish") ||
        s.includes("critique") ||
        s.includes("j’aimerais") ||
        s.includes("petite critique") ||
        s.includes("un peu long") ||
        s.includes("glitch") ||
        s.includes("me gustaría");
    return hasCritique ? "critique" : "praise";
}

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1" aria-label={`${rating} sur 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    size={14}
                    className={cls(
                        "text-amber-400",
                        i < rating ? "fill-amber-400" : "fill-transparent"
                    )}
                />
            ))}
        </div>
    );
}

function TestimonialCard({
                             t,
                             active,
                             depthStyle,
                         }: {
    t: Testimonial;
    active: boolean;
    depthStyle: React.CSSProperties;
}) {
    const pill = countryPillStyle(t.country);
    const tone = toneFromText(t);

    return (
        <div
            className={cls(
                "relative select-none",
                "w-[320px] sm:w-[360px]",
                "rounded-3xl border bg-white/85 backdrop-blur",
                "shadow-[0_22px_70px_-50px_rgba(2,6,23,0.40)]",
                "transition-transform duration-500 ease-out",
                active ? "border-rose-200/70" : "border-stone-200"
            )}
            style={depthStyle}
        >
            {/* glow ring */}
            <div
                className={cls(
                    "pointer-events-none absolute -inset-0.5 rounded-3xl opacity-0",
                    active && "opacity-100"
                )}
                style={{
                    background:
                        "linear-gradient(90deg, rgba(244,63,94,0.25), rgba(245,158,11,0.20))",
                    filter: "blur(14px)",
                }}
            />

            <div className="relative p-5">
                {/* top row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div
                                className={cls(
                                    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                    pill.bg,
                                    pill.border,
                                    pill.text
                                )}
                            >
                                <span className={cls("h-1.5 w-1.5 rounded-full", pill.dot)} />
                                {countryLabel(t.country)}
                                {t.city ? (
                                    <span className="hidden sm:inline text-stone-500 font-medium">
                    • {t.city}
                  </span>
                                ) : null}
                            </div>

                            {tone === "praise" ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  Recommandé
                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                  <Sparkles size={12} className="text-amber-600" />
                  “Petit plus”
                </span>
                            )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <Stars rating={t.rating} />
                            {t.dateLabel ? (
                                <span className="text-[11px] text-stone-500">{t.dateLabel}</span>
                            ) : null}
                        </div>
                    </div>

                    <div className="h-10 w-10 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center text-stone-700 font-bold">
                        {initials(t.name)}
                    </div>
                </div>

                {/* quote */}
                <div className="mt-4">
                    <div className="flex items-start gap-2.5">
                        <div className="mt-1 h-9 w-9 rounded-2xl border border-stone-200 bg-white flex items-center justify-center shadow-sm">
                            <Quote size={16} className="text-rose-500" />
                        </div>
                        <p className="text-stone-700 leading-relaxed text-[14px]">
                            <span className="italic">“{t.quote}”</span>
                        </p>
                    </div>
                </div>

                {/* footer */}
                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-stone-900 truncate">{t.name}</div>
                        <div className="text-xs text-stone-500 truncate">
                            {t.role || "Utilisateur"}
                            {t.highlight ? <span className="text-stone-400"> • {t.highlight}</span> : null}
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-500">
                        <MapPin size={12} className="text-stone-400" />
                        <span className="truncate max-w-[140px]">{t.city || countryLabel(t.country)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniRailCard({ t, active }: { t: Testimonial; active: boolean }) {
    const pill = countryPillStyle(t.country);
    return (
        <button
            className={cls(
                "shrink-0 text-left rounded-2xl border px-3 py-3 transition",
                active
                    ? "border-rose-200 bg-rose-50"
                    : "border-stone-200 bg-white hover:bg-stone-50"
            )}
            style={{ width: 240 }}
            aria-label={`Aller à l’avis de ${t.name}`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className={cls("inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold", pill.bg, pill.border, pill.text)}>
                    <span className={cls("h-1.5 w-1.5 rounded-full", pill.dot)} />
                    {t.country}
                </div>
                <Stars rating={t.rating} />
            </div>

            <div className="mt-2 text-sm font-bold text-stone-900 truncate">{t.name}</div>
            <div className="mt-1 text-[12px] text-stone-600 line-clamp-2">{t.quote}</div>
        </button>
    );
}

export default function SocialProof({
                                        title = "Ils ont sauvé leur patrimoine",
                                    }: {
    title?: string;
}) {
    const testimonials = TESTIMONIALS;
    const isMobile = useIsMobile();

    const [country, setCountry] = useState<"ALL" | "US" | "FR" | "ES" | "OTHER">("ALL");
    const [index, setIndex] = useState(0);

    // mobile swipe
    const swipeRef = useRef<{ x0: number; dx: number; active: boolean } | null>(null);

    const filtered = useMemo(() => {
        if (country === "ALL") return testimonials;
        if (country === "OTHER") return testimonials.filter((t) => !["US", "FR", "ES"].includes(t.country));
        return testimonials.filter((t) => t.country === country);
    }, [testimonials, country]);

    useEffect(() => {
        setIndex(0);
    }, [country]);

    const safeIndex = clamp(index, 0, Math.max(0, filtered.length - 1));
    useEffect(() => {
        if (safeIndex !== index) setIndex(safeIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeIndex]);

    const stats = useMemo(() => {
        const all = filtered.length || 1;
        const avg =
            filtered.reduce((acc, t) => acc + t.rating, 0) / (filtered.length || 1);
        const counts = filtered.reduce<Record<string, number>>((acc, t) => {
            acc[t.country] = (acc[t.country] || 0) + 1;
            return acc;
        }, {});
        return { all, avg, counts };
    }, [filtered]);

    const go = (dir: -1 | 1) => {
        setIndex((i) => clamp(i + dir, 0, Math.max(0, filtered.length - 1)));
    };

    // keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered.length]);

    const visible = useMemo(() => {
        // Desktop: show a 5-card “depth” stack centered around index
        const n = filtered.length;
        const arr: Array<{ t: Testimonial; pos: number }> = [];
        for (let d = -2; d <= 2; d++) {
            const j = index + d;
            if (j >= 0 && j < n) arr.push({ t: filtered[j], pos: d });
        }
        return arr;
    }, [filtered, index]);

    const countryTabs = useMemo(
        () => [
            { id: "ALL" as const, label: "Tous" },
            { id: "US" as const, label: "US" },
            { id: "FR" as const, label: "FR" },
            { id: "ES" as const, label: "ES" },
            { id: "OTHER" as const, label: "Autres" },
        ],
        []
    );

    const onPointerDown = (e: React.PointerEvent) => {
        if (!isMobile) return;
        swipeRef.current = { x0: e.clientX, dx: 0, active: true };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isMobile) return;
        const st = swipeRef.current;
        if (!st?.active) return;
        st.dx = e.clientX - st.x0;
    };

    const onPointerUp = () => {
        if (!isMobile) return;
        const st = swipeRef.current;
        if (!st?.active) return;
        const dx = st.dx || 0;
        swipeRef.current = null;
        if (dx > 60) go(-1);
        if (dx < -60) go(1);
    };

    return (
        <section id="temoignages" className="relative overflow-hidden py-24 bg-gradient-to-b from-rose-50 via-white to-amber-50 border-t border-stone-200">
            {/* ambient */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-rose-200/35 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-amber-200/35 blur-3xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.03] via-transparent to-white/[0.03]" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
                <div className="grid lg:grid-cols-12 gap-10 items-start">
                    {/* Left column */}
                    <div className="lg:col-span-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                            <ShieldCheck size={12} className="text-stone-500" />
                            Retours famille • usage réel • moments partagés
                        </div>

                        <h2 className="mt-5 text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                            {title}
                        </h2>

                        {/* Stats cards */}
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-5 shadow-sm">
                                <div className="text-[11px] text-stone-500 font-semibold">Note moyenne</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="text-3xl font-serif text-stone-900">{stats.avg.toFixed(1)}</div>
                                    <div className="flex flex-col">
                                        <Stars rating={Math.round(stats.avg) as any} />
                                        <div className="text-[11px] text-stone-500">{stats.all} avis</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-5 shadow-sm">
                                <div className="text-[11px] text-stone-500 font-semibold">Répartition</div>
                                <div className="mt-2 space-y-1 text-sm text-stone-700">
                                    <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> US
                    </span>
                                        <span className="tabular-nums">{stats.counts["US"] || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> FR
                    </span>
                                        <span className="tabular-nums">{stats.counts["FR"] || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> ES
                    </span>
                                        <span className="tabular-nums">{stats.counts["ES"] || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Country filter */}
                        <div className="mt-6 rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-2 shadow-sm">
                            <div className="flex items-center gap-2 px-2 py-2">
                                <Flag size={14} className="text-stone-500" />
                                <div className="text-xs font-bold text-stone-700">Filtrer</div>
                                <div className="ml-auto text-[11px] text-stone-500">
                                    {filtered.length} affichés
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2 px-2 pb-2">
                                {countryTabs.map((t) => {
                                    const active = country === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setCountry(t.id)}
                                            className={cls(
                                                "rounded-xl py-2 text-xs font-bold transition border",
                                                active
                                                    ? "bg-stone-900 text-white border-stone-900 shadow"
                                                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4 text-[11px] text-stone-500">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={12} className="text-stone-400" />
                  Nous attendons avec impatience votre avis, donnez le dès votre première essai !
                </span>
                        </div>
                    </div>

                    {/* Right column: multi-level carousel */}
                    <div className="lg:col-span-8">
                        <div className="relative">
                            {/* Desktop depth carousel */}
                            <div className="hidden lg:block">
                                <div className="relative rounded-[2rem] border border-stone-200 bg-white/70 backdrop-blur shadow-[0_30px_90px_-70px_rgba(2,6,23,0.45)] overflow-hidden">
                                    {/* top bar */}
                                    <div className="px-5 py-4 border-b border-stone-200 bg-gradient-to-b from-white/80 to-white/40">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
                                                    <Sparkles size={12} className="text-rose-600" />
                                                    Témoignages • sélection “famille”
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => go(-1)}
                                                    className="h-10 w-10 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center"
                                                    aria-label="Précédent"
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <button
                                                    onClick={() => go(1)}
                                                    className="h-10 w-10 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center"
                                                    aria-label="Suivant"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* stage */}
                                    <div className="relative p-6">
                                        <div className="pointer-events-none absolute inset-0">
                                            <div className="absolute -top-14 -left-14 h-56 w-56 rounded-full bg-rose-200/35 blur-3xl" />
                                            <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-amber-200/35 blur-3xl" />
                                        </div>

                                        <div className="relative h-[360px]">
                                            {/* center line (subtle) */}
                                            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-stone-200/70" />
                                            {/* cards */}
                                            {visible.map(({ t, pos }) => {
                                                // 3D-ish positioning
                                                const abs = Math.abs(pos);
                                                const translateX = pos * 220; // spacing
                                                const translateY = abs * 10;
                                                const scale = pos === 0 ? 1 : 0.92 - abs * 0.03;
                                                const rotate = pos * -2.2;
                                                const opacity = pos === 0 ? 1 : 1 - abs * 0.02;
                                                const z = 10 - abs;

                                                const style: React.CSSProperties = {
                                                    position: "absolute",
                                                    left: "50%",
                                                    top: "50%",
                                                    transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                                                    opacity,
                                                    zIndex: z,
                                                };

                                                return (
                                                    <TestimonialCard
                                                        key={t.id}
                                                        t={t}
                                                        active={pos === 0}
                                                        depthStyle={style}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* rail (level 2) */}
                                        <div className="mt-5">
                                            <div className="text-xs font-bold text-stone-700 px-1">
                                                Aperçu rapide
                                            </div>
                                            <div className="mt-2 flex gap-3 overflow-x-auto pb-2 pr-2">
                                                {filtered.slice(0, 18).map((t, i) => {
                                                    const active = i === index;
                                                    return (
                                                        <div key={t.id} className="shrink-0">
                                                            <div
                                                                onClick={() => setIndex(i)}
                                                                className="cursor-pointer"
                                                            >
                                                                <MiniRailCard t={t} active={active} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-1 text-[11px] text-stone-500 px-1">
                                                Nous attendons avec impatience votre avis, donnez le dès votre première essai !
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile story-deck */}
                            <div className="lg:hidden">
                                <div
                                    className="rounded-[1.75rem] border border-stone-200 bg-white/75 backdrop-blur shadow-[0_24px_70px_-55px_rgba(2,6,23,0.45)] overflow-hidden"
                                    onPointerDown={onPointerDown}
                                    onPointerMove={onPointerMove}
                                    onPointerUp={onPointerUp}
                                    onPointerCancel={onPointerUp}
                                >
                                    <div className="px-4 py-4 border-b border-stone-200 bg-gradient-to-b from-white/85 to-white/50">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-stone-900">Témoignages</div>
                                                <div className="text-xs text-stone-500 mt-0.5">
                                                    Swipe gauche/droite • {safeIndex + 1}/{filtered.length || 1}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => go(-1)}
                                                    className="h-10 w-10 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center"
                                                    aria-label="Précédent"
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <button
                                                    onClick={() => go(1)}
                                                    className="h-10 w-10 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center"
                                                    aria-label="Suivant"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative p-4">
                                        {/* current card */}
                                        {filtered[safeIndex] ? (
                                            <div className="relative">
                                                <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-rose-200/45 to-amber-200/45 blur-2xl opacity-60" />
                                                <div className="relative">
                                                    <div className="flex justify-center">
                                                        <TestimonialCard
                                                            t={filtered[safeIndex]}
                                                            active
                                                            depthStyle={{
                                                                position: "relative",
                                                                transform: "none",
                                                                opacity: 1,
                                                            }}
                                                        />
                                                    </div>

                                                    {/* peek next */}
                                                    {filtered[safeIndex + 1] ? (
                                                        <div className="mt-4 opacity-70">
                                                            <div className="text-[11px] text-stone-500 mb-2 flex items-center gap-2">
                                                                <span className="h-0.5 w-full rounded-full bg-stone-400/30" />
                                                            </div>
                                                            <div className="flex justify-center">
                                                                <div className="scale-[0.94] origin-top">
                                                                    <TestimonialCard
                                                                        t={filtered[safeIndex + 1]}
                                                                        active={false}
                                                                        depthStyle={{
                                                                            position: "relative",
                                                                            transform: "none",
                                                                            opacity: 1,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-stone-600 py-10">
                                                Aucun avis pour ce filtre.
                                            </div>
                                        )}

                                        {/* dots */}
                                        <div className="mt-4 flex items-center justify-center gap-1.5">
                                            {Array.from({ length: Math.min(filtered.length, 9) }).map((_, i) => {
                                                const n = Math.min(filtered.length, 9);
                                                // map safeIndex onto dot range
                                                const mapped =
                                                    filtered.length <= n
                                                        ? safeIndex
                                                        : Math.round((safeIndex / Math.max(1, filtered.length - 1)) * (n - 1));

                                                const active = i === mapped;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={cls(
                                                            "h-1.5 rounded-full transition-all",
                                                            active ? "w-6 bg-stone-900" : "w-2.5 bg-stone-300"
                                                        )}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div className="mt-3 text-[11px] text-stone-500 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-stone-400" />
                        Pas de réseaux sociaux • partage privé
                      </span>
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
