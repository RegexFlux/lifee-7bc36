"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    CreditCard,
    Image as ImageIcon,
    Loader2,
    Upload,
    Trash2,
    RefreshCw, Percent, Gift,
} from "lucide-react";
import {useRouter} from "next/router";
import {type Pack} from "@/hooks/useVideoResultModal";
import AlbumShowCase from "@/components/album/AlbumShowcase";

import type {PackDTO, AppliedPromoQuote, ValidatePromoResponse, PacksResponse, Tier} from "@/types/billing";
import PromoRoulette from "@/components/PromoRoulette";
import {recommendPackId} from "@/lib/album/packs.server";
import {studioApi} from "@/lib/studioApi";


type DraftItem = {
    assetId: string;
    title: string;
    position: number;
    thumbnailUrl?: string;
    videoUrl?: string;
};

type DraftDTO = {
    draftId: string;
    status: "draft" | "paid" | "archived";
    items: DraftItem[];
    requiredCredits: number;
    quote: { requiredCredits: number; recommendedPackId: string; packs: Pack[] };
};

type OrderStatusDTO = {
    orderId: string;
    status: "generating" | "assembling" | "done" | "error";
    videos: { total: number; done: number; failed: number };
    export: null | { status: "queued" | "rendering" | "done" | "error"; progress: number; url?: string };
    finalUrl: string | null;
    error: string | null;
};

export async function safeJson<T>(res: Response): Promise<T> {
    const txt = await res.text();
    try {
        return JSON.parse(txt) as T;
    } catch {
        throw new Error(txt || `HTTP ${res.status}`);
    }
}

function normalizeJobId(q: unknown) {
    if (typeof q === "string") return q;
    if (Array.isArray(q)) return q[0] ?? "";
    return "";
}

function reindex(items: DraftItem[]) {
    return items.map((it, i) => ({...it, position: i}));
}


type SaveState = "idle" | "saving" | "saved" | "error";

type PromoEffect =
    | { kind: "percent"; percent: number }
    | { kind: "credits"; extraCredits: number }
    | { kind: "unknown" };

type Promo = {
    code: string;
    label: string;
    rarity: "common" | "uncommon" | "rare" | "jackpot";
    effect: PromoEffect;
};

function formatEUR(n: number) {
    return n.toFixed(2).replace(".", ",") + "€";
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function cx(...v: Array<string | false | null | undefined>) {
    return v.filter(Boolean).join(" ");
}

export function promoPill(r: Promo["rarity"]) {
    switch (r) {
        case "common":
            return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
        case "uncommon":
            return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
        case "rare":
            return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
        case "jackpot":
            return "bg-rose-50 text-rose-800 ring-1 ring-rose-200";
    }
}

function baseCredits(pack: Pack) {
    return pack.credits + (pack.includedExtraCredits ?? 0);
}

function effectiveCredits(pack: Pack, promo: Promo | null) {
    const base = baseCredits(pack);
    if (!promo) return base;
    if (promo.effect.kind === "credits") return base + promo.effect.extraCredits;
    return base;
}

function discountedPrice(pack: Pack, promo: Promo | null) {
    const base = pack.priceEur;
    if (!promo) return base;
    if (promo.effect.kind === "percent") return clamp(base * (1 - promo.effect.percent / 100), 0, base);
    return base;
}

function savingsText(pack: Pack, promo: Promo | null) {
    if (!promo) return null;
    if (promo.effect.kind === "percent") {
        const saved = pack.priceEur - discountedPrice(pack, promo);
        return saved > 0.009 ? `Économie ${formatEUR(saved)}` : null;
    }
    if (promo.effect.kind === "credits") return `+${promo.effect.extraCredits} crédits`;
    return null;
}


export function AlbumSimple(props: { onRequireAuth?: () => void }) {
    const router = useRouter();
    const jobId = useMemo(() => normalizeJobId(router.query.jobId), [router.query.jobId]);

    const fileRef = useRef<HTMLInputElement | null>(null);

    const [draft, setDraft] = useState<DraftDTO | null>(null);

    const [packs, setPacks] = useState<PackDTO[]>(draft?.quote.packs ?? []);
    const [packsLoading, setPacksLoading] = useState(false);

    // --- promo / roulette (AlbumSimple) ---

    const [promoCode, setPromoCode] = useState<string | null>(null);
    const [promoSource, setPromoSource] = useState<"manual" | "roulette" | null>(null);
    const [promoByPackId, setPromoByPackId] = useState<Record<string, Promo | null>>({});
    const [promoBusy, setPromoBusy] = useState(false);

    const [promoToast, setPromoToast] = useState<string | null>(null);


    const [promoInput, setPromoInput] = useState("");
    const [hasSpun, setHasSpun] = useState(false);

    useEffect(() => {
        if (!promoToast) return;
        const t = window.setTimeout(() => setPromoToast(null), 1400);
        return () => window.clearTimeout(t);
    }, [promoToast]);

    useEffect(() => {
        // reset promo when job changes or first load
        setPromoInput("");
        setPromoCode(null);
        setPromoSource(null);
        setPromoByPackId({});
        setHasSpun(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);


    // ✅ On stocke l’ordre comme un tableau déjà ordonné (position = index)
    const [items, setItems] = useState<DraftItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const [order, setOrder] = useState<OrderStatusDTO | null>(null);
    const pollRef = useRef<unknown>(null);

    // --- reorder engine (no reload) ---
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveHint, setSaveHint] = useState<string | null>(null);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);
    const pendingRef = useRef<string[] | null>(null);
    const lastSentRef = useRef<string>("");

    const flushReorder = async () => {
        if (!draft?.draftId) return;
        const ordered = pendingRef.current;
        if (!ordered) return;

        // If already sending, keep pending, exit
        if (inFlightRef.current) return;

        pendingRef.current = null;
        inFlightRef.current = true;

        setSaveState("saving");
        setSaveHint("Enregistrement…");

        try {
            const payload = JSON.stringify({draftId: draft.draftId, orderedAssetIds: ordered});
            lastSentRef.current = payload;

            const r = await fetch("/api/album/draft/reorder", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: payload,
            });
            if (!r.ok) throw new Error(await r.text());

            setSaveState("saved");
            setSaveHint("Enregistré");
            // petit fade-out
            window.setTimeout(() => {
                setSaveState("idle");
                setSaveHint(null);
            }, 1200);
        } catch {
            setSaveState("error");
            setSaveHint("Erreur d’enregistrement");
        } finally {
            inFlightRef.current = false;
            // if new pending exists, flush again (last-write-wins)
            if (pendingRef.current) void flushReorder();
        }
    };

    const scheduleReorderSave = (orderedAssetIds: string[]) => {
        pendingRef.current = orderedAssetIds;

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            void flushReorder();
        }, 220);
    };

    const retrySave = () => {
        // retry last payload if we have it, else just flush pending
        if (!draft?.draftId) return;
        if (pendingRef.current) return void flushReorder();

        const last = lastSentRef.current;
        if (!last) return;

        setSaveState("saving");
        setSaveHint("Enregistrement…");
        void (async () => {
            try {
                const r = await fetch("/api/album/draft/reorder", {
                    method: "POST",
                    credentials: "include",
                    headers: {"Content-Type": "application/json"},
                    body: last,
                });
                if (!r.ok) throw new Error(await r.text());
                setSaveState("saved");
                setSaveHint("Enregistré");
                window.setTimeout(() => {
                    setSaveState("idle");
                    setSaveHint(null);
                }, 1200);
            } catch {
                setSaveState("error");
                setSaveHint("Erreur d’enregistrement");
            }
        })();
    };

    // --- load draft (initial + after upload only) ---
    const loadDraft = async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/album/draft?jobId=${encodeURIComponent(jobId || "")}`, {credentials: "include"});
            if (r.status === 401) {
                setDraft(null);
                setItems([]);
                props.onRequireAuth?.();
                return;
            }
            const d = await safeJson<DraftDTO>(r);

            const sorted = [...d.items].sort((a, b) => a.position - b.position);
            setDraft(d);
            await loadPacks(d.draftId);
            setItems(reindex(sorted));

            const rec = recommendPackId(d.quote.packs, sorted.length);
            setSelectedPackId(rec ?? d.quote.recommendedPackId);
        } finally {
            setLoading(false);
        }
    };

    const loadPacks = async (draftId: string) => {
        setPacksLoading(true);
        try {
            const r = await fetch(`/api/album/packs?draftId=${encodeURIComponent(draftId)}`, {credentials: "include"});
            if (!r.ok) throw new Error(await r.text());
            const data = (await r.json()) as PacksResponse;

            setPacks(data.packs);
            if (!selectedPackId) setSelectedPackId(data.recommendedPackId);
        } finally {
            setPacksLoading(false);
        }
    };

    useEffect(() => {
        if (!router.isReady) return;
        void loadDraft();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    // stripe return
    useEffect(() => {
        if (!router.isReady) return;
        const paid = String(router.query.paid || "") === "1";
        const draftId = String(router.query.draftId || "");
        const sessionId = String(router.query.session_id || "");

        if (paid && draftId && sessionId) {
            void (async () => {
                const r = await fetch("/api/album/confirm", {
                    method: "POST",
                    credentials: "include",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({draftId, stripeSessionId: sessionId}),
                });
                const data = await safeJson<{ orderId: string }>(r);
                await router.replace({query: {}}, undefined, {shallow: true});
                console.log('dd', data);
                startPolling(data.orderId);
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    const startPolling = (orderId: string) => {
        stopPolling();
        const tick = async () => {
            const r = await studioApi.albumOrderStatus(orderId);
            // const s = await safeJson<OrderStatusDTO>(r);
            setOrder(r);
            if (s.status === "done" || s.status === "error") stopPolling();
        };
        void tick();
        pollRef.current = setInterval(tick, 1400);
    };

    const stopPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    };

    useEffect(() => () => stopPolling(), []);

    // --- upload (OK to reload draft once; reorder never reloads) ---
    const uploadFiles = async (files: FileList) => {
        if (!draft) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("draftId", draft.draftId);
            Array.from(files).forEach((f) => fd.append("files", f));

            const r = await fetch("/api/album/draft/upload", {method: "POST", credentials: "include", body: fd});
            if (!r.ok) throw new Error(await r.text());

            // If API returns draft, use it. Otherwise fallback to loadDraft().
            try {
                const d = await safeJson<DraftDTO>(r);
                const sorted = [...d.items].sort((a, b) => a.position - b.position);
                setDraft(d);
                setItems(reindex(sorted));
                const rec = recommendPackId(d.quote.packs, sorted.length);
                setSelectedPackId(rec ?? d.quote.recommendedPackId);
            } catch {
                await loadDraft();
            }
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const ensureSelectedPackStillValid = (nextItemsLen: number) => {
        if (!draft) return;
        const selected = packs.find((p) => p.id === selectedPackId);
        if (selected && selected.credits >= nextItemsLen) return;

        const rec = recommendPackId(packs, nextItemsLen);
        setSelectedPackId(rec);
    };

    const moveItem = (assetId: string, dir: -1 | 1) => {
        const idx = items.findIndex((x) => x.assetId === assetId);
        if (idx < 0) return;

        const j = idx + dir;
        if (j < 0 || j >= items.length) return;

        const next = [...items];
        const tmp = next[idx];
        next[idx] = next[j];
        next[j] = tmp;

        const nextReindexed = reindex(next);
        setItems(nextReindexed);

        // save in background (no reload)
        scheduleReorderSave(nextReindexed.map((x) => x.assetId));
    };

    const reverseOrder = () => {
        const next = reindex([...items].reverse());
        setItems(next);
        scheduleReorderSave(next.map((x) => x.assetId));
    };

    const removeItem = async (assetId: string) => {
        if (!draft) return;

        const prev = items;
        const next = reindex(items.filter((x) => x.assetId !== assetId));
        setItems(next);
        ensureSelectedPackStillValid(next.length);

        // persist new order immediately (so DB stays contiguous)
        scheduleReorderSave(next.map((x) => x.assetId));

        try {
            const r = await fetch("/api/album/draft/remove", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({draftId: draft.draftId, assetId}),
            });
            if (!r.ok) throw new Error(await r.text());
        } catch {
            // rollback UI (rare), and let user retry
            setItems(prev);
            setSaveState("error");
            setSaveHint("Erreur suppression");
        }
    };

    const proceedToCheckout = async () => {
        if (!draft || !selectedPackId) return;

        setCheckoutLoading(true);
        try {
            const base = window.location.origin;

            const r = await fetch("/api/album/checkout", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    draftId: draft.draftId,
                    packId: selectedPackId,
                    successUrl: `${base}${router.pathname}`,
                    cancelUrl: `${base}${router.pathname}`,
                    promoCode,
                    promoSource,
                }),
            });

            const data = await safeJson<{ ok: boolean; url?: string; error?: string }>(r);
            if (!data.ok || !data.url) throw new Error(data.error || "Checkout failed");
            window.location.href = data.url;
        } finally {
            setCheckoutLoading(false);
        }
    };


    const clearPromo = () => {
        setPromoInput("");
        setPromoCode(null);
        setPromoSource(null);
        setPromoByPackId({});
        setPromoToast("Promo retirée");
    };

    async function validatePromoForPack(code: string, pack: Pack): Promise<Promo | null> {
        const r = await fetch("/api/album/promo/validate", {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({code, packId: pack.id, tier: pack.tier}),
        });
        if (!r.ok) return null;
        const data = await safeJson<ValidatePromoResponse>(r);
        console.log('dd', data);
        if (!data.ok) return null;
        return data.quote.promo;
    }

    async function applyPromoAll(codeRaw: string, source: "manual" | "roulette") {
        if (!draft) return;
        const code = codeRaw.trim().toUpperCase();
        if (!code) return;

        setPromoBusy(true);
        try {
            const packs = draft.quote.packs;

            const results = await Promise.all(
                packs.map(async (p) => {
                    const promo = await validatePromoForPack(code, p);
                    console.log('pp', promo)
                    return [p.id, promo] as const;
                })
            );

            const map: Record<string, Promo | null> = {};
            let anyOk = false;
            for (const [id, promo] of results) {
                map[id] = promo;
                if (promo) anyOk = true;
            }

            console.log('isAnyOk', results, anyOk);
            if (!anyOk) {
                setPromoToast("Code invalide");
                return;
            }

            setPromoByPackId(map);
            setPromoCode(code);
            setPromoSource(source);
            setPromoInput(code);
            setPromoToast(source === "roulette" ? "Promo appliquée 🎉" : "Code promo appliqué ✅");
        } finally {
            setPromoBusy(false);
        }
    }

    const header = (
        <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
                <div
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                    <ImageIcon size={12} className="text-rose-600"/>
                    Album Simple
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                    Déposez vos photos, organisez-les, puis validez.
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="animate-spin" size={16}/> Chargement…
                </div>
            </div>
        );
    }

    if (!draft) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-slate-800 font-semibold">Connexion requise</div>
                <div className="text-sm text-slate-600 mt-1">Connectez-vous pour créer et enregistrer votre album.</div>
                <button onClick={() => props.onRequireAuth?.()}
                        className="mt-4 px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold">
                    Continuer
                </button>
            </div>
        );
    }

    // order progress panel
    if (order) {
        const pct = order.videos.total ? Math.round((order.videos.done / order.videos.total) * 100) : 0;

        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                {header}

                <div className="mt-6 rounded-2xl border border-slate-200 p-5 bg-slate-50">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-black text-slate-900">Création en cours</div>
                            <div className="text-xs text-slate-600 mt-1">
                                Vidéos : {order.videos.done}/{order.videos.total} • {pct}%
                            </div>
                        </div>
                        <div className="text-xs font-mono text-slate-500">{order.status}</div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-slate-900" style={{width: `${pct}%`}}/>
                    </div>

                    {order.export ? (
                        <div className="mt-4 text-xs text-slate-600">
                            Export: <span
                            className="font-semibold">{order.export.status}</span> • {order.export.progress ?? 0}%
                        </div>
                    ) : (
                        <div className="mt-4 text-xs text-slate-600">Export: en attente (démarre après la
                            génération)</div>
                    )}

                    {order.error ? <div className="mt-4 text-sm text-red-600">{order.error}</div> : null}

                    {order.finalUrl ? (
                        <a className="mt-4 inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold"
                           href={order.finalUrl}>
                            <CheckCircle2 size={18}/>
                            Ouvrir mon album
                        </a>
                    ) : null}
                </div>
            </div>
        );
    }

    const showcaseItem = items.find((x) => x.thumbnailUrl && x.videoUrl);


    const selectedPack = packs.find((p) => p.id === selectedPackId) ?? null;
    const promoForSelected = selectedPack ? (promoCode ? promoByPackId[selectedPack.id] ?? null : null) : null;

// ✅ important: pour “insuffisant”, on compte les bonus crédits promo si présents
    const selectedEffectiveCredits = selectedPack ? effectiveCredits(selectedPack, promoForSelected) : 0;
    const selectedTooSmall = !!selectedPack && selectedEffectiveCredits < draft.requiredCredits;


    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {header}

            <AlbumShowCase videoUrl={showcaseItem?.videoUrl} thumbnailUrl={showcaseItem?.thumbnailUrl}/>

            {/* Upload */}
            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <div className="text-sm font-black text-slate-900">1) Ajouter des photos</div>
                        <div className="text-xs text-slate-600 mt-1">Cliquez pour choisir plusieurs photos d’un coup.
                        </div>
                    </div>

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) void uploadFiles(e.target.files);
                        }}
                    />

                    <button
                        onClick={() => fileRef.current?.click()}
                        className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold flex items-center gap-2"
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>}
                        {uploading ? "Ajout…" : "Ajouter des photos"}
                    </button>
                </div>
            </div>

            {/* Organize */}
            <div className="mt-4 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <div className="text-sm font-black text-slate-900">2) Organiser l’ordre</div>
                        <div className="text-xs text-slate-600 mt-1">
                            Vue “film” + boutons simples. L’ordre se sauvegarde automatiquement, sans recharger.
                        </div>
                    </div>

                    {/* Save indicator */}
                    <div className="flex items-center gap-2">
                        {saveHint ? (
                            <div
                                className={[
                                    "text-[11px] px-3 py-1 rounded-full border",
                                    saveState === "saving"
                                        ? "border-slate-200 bg-slate-50 text-slate-600"
                                        : saveState === "saved"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : saveState === "error"
                                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                                : "border-slate-200 bg-white text-slate-600",
                                ].join(" ")}
                            >
                <span className="inline-flex items-center gap-2">
                  {saveState === "saving" ? <Loader2 size={12} className="animate-spin"/> : null}
                    {saveState === "saved" ? <CheckCircle2 size={12}/> : null}
                    {saveState === "error" ? <RefreshCw size={12}/> : null}
                    {saveHint}
                </span>
                            </div>
                        ) : null}

                        {saveState === "error" ? (
                            <button
                                onClick={retrySave}
                                className="text-[11px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold"
                            >
                                Réessayer
                            </button>
                        ) : null}

                        <button
                            onClick={reverseOrder}
                            disabled={items.length < 2}
                            className="text-[11px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold disabled:opacity-40"
                        >
                            Inverser
                        </button>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="mt-4 text-sm text-slate-500">Ajoutez quelques photos pour commencer.</div>
                ) : (
                    <>
                        {/* Filmstrip (order visualization) */}
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 overflow-x-auto">
                            <div className="flex items-center gap-2 min-w-max">
                                {items.map((it, idx) => (
                                    <div key={it.assetId} className="relative">
                                        <div
                                            className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white">
                                            {it.thumbnailUrl ? <img src={it.thumbnailUrl} alt=""
                                                                    className="w-full h-full object-cover"/> : null}
                                        </div>
                                        <div
                                            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {items.map((it, idx) => (
                                <div
                                    key={it.assetId}
                                    className="rounded-2xl border border-slate-200 overflow-hidden bg-white flex transition-transform"
                                >
                                    <div className="w-24 h-24 bg-slate-100 shrink-0 relative">
                                        {it.thumbnailUrl ? <img src={it.thumbnailUrl} alt=""
                                                                className="w-full h-full object-cover"/> : null}
                                        <div
                                            className="absolute top-2 left-2 w-7 h-7 rounded-xl bg-white/90 border border-slate-200 text-slate-900 text-xs font-black flex items-center justify-center">
                                            {idx + 1}
                                        </div>
                                    </div>

                                    <div className="flex-1 p-3 min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{it.title}</div>
                                        <div className="text-[11px] text-slate-500 mt-1">Position {idx + 1}</div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => moveItem(it.assetId, -1)}
                                                disabled={idx === 0}
                                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold disabled:opacity-40 inline-flex items-center gap-2"
                                            >
                                                <ArrowUp size={14}/> Monter
                                            </button>
                                            <button
                                                onClick={() => moveItem(it.assetId, +1)}
                                                disabled={idx === items.length - 1}
                                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold disabled:opacity-40 inline-flex items-center gap-2"
                                            >
                                                <ArrowDown size={14}/> Descendre
                                            </button>
                                            <button
                                                onClick={() => void removeItem(it.assetId)}
                                                className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold inline-flex items-center gap-2"
                                            >
                                                <Trash2 size={14}/> Retirer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Promo + roulette */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-black text-slate-900">Réduction</div>
                    <div className="text-xs text-slate-600 mt-1">
                        Entre un code promo <span className="font-black">ou</span> tente la roulette (1 fois).
                    </div>

                    {promoCode && promoForSelected ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-3 py-2 text-[12px] font-black">
          <Gift className="h-4 w-4"/>
            {promoCode}
            <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-black", promoPill(promoForSelected.rarity))}>
            {promoSource === "roulette" ? "ROULETTE" : "CODE"}
          </span>
        </span>

                            <span
                                className="inline-flex items-center rounded-2xl bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-800 ring-1 ring-emerald-200">
          {selectedPack ? (savingsText(selectedPack, promoForSelected) ?? "Avantage appliqué") : "Avantage appliqué"}
        </span>

                            <button
                                type="button"
                                onClick={clearPromo}
                                disabled={checkoutLoading || promoBusy}
                                className="inline-flex items-center rounded-2xl bg-slate-100 px-3 py-2 text-[12px] font-black text-slate-700 hover:bg-slate-200"
                            >
                                Retirer
                            </button>
                        </div>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                        <div className="relative flex-1">
                            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                            <input
                                value={promoInput}
                                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                                placeholder="Code promo (ex: LUCKY10)"
                                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-[14px] font-bold outline-none focus:ring-2 focus:ring-rose-200"
                                disabled={checkoutLoading || promoBusy}
                            />
                        </div>

                        <button
                            type="button"
                            disabled={checkoutLoading || promoBusy || promoInput.trim().length < 4}
                            onClick={() => void applyPromoAll(promoInput, "manual")}
                            className={cx(
                                "rounded-2xl px-4 py-3 text-[14px] font-black transition-all",
                                promoInput.trim().length >= 4 && !checkoutLoading && !promoBusy
                                    ? "bg-slate-900 text-white hover:opacity-95 active:scale-[0.99]"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            )}
                        >
                            {promoBusy ? "…" : "Appliquer"}
                        </button>
                    </div>
                </div>

                <PromoRoulette
                    tier={(selectedPack?.tier ?? "standard") as Tier}
                    disabled={checkoutLoading || promoBusy || hasSpun}
                    hasSpun={hasSpun}
                    packId={selectedPackId}
                    onResult={(promo) => {
                        setHasSpun(true);
                        void applyPromoAll(promo.code, "roulette");
                    }}
                />
            </div>

            {/* Packs — cards avec prix live */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {packs.map((p) => {
                    const selected = selectedPackId === p.id;

                    // promo propre à ce pack (cache validé back)
                    const promoForPack = promoCode ? promoByPackId[p.id] ?? null : null;

                    const base = p.priceEur;
                    const withPromo = discountedPrice(p, promoForPack);
                    const hasDiscount = withPromo < base - 0.005;

                    const credits = effectiveCredits(p, promoForPack);
                    const creditBase = baseCredits(p);

                    const tooSmall = credits < draft.requiredCredits;

                    return (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPackId(p.id)}
                            className={cx(
                                "relative text-left rounded-2xl border p-4 transition overflow-hidden",
                                selected ? "border-slate-900 bg-white shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50",
                                p.highlight && !selected && "ring-1 ring-amber-200",
                                tooSmall && "opacity-70"
                            )}
                        >
                            {/* badge */}
                            {p.badge ? (
                                <div className="absolute top-3 right-3">
            <span
                className={cx(
                    "rounded-full px-2 py-1 text-[10px] font-black",
                    selected
                        ? "bg-slate-900 text-white"
                        : p.highlight
                            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                )}
            >
              {p.badge}
            </span>
                                </div>
                            ) : null}

                            <div className="text-sm font-black text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500 mt-1">{p.subtitle}</div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                                {/* credits */}
                                <div>
                                    <div className="text-[26px] leading-none font-black text-slate-900">
                                        {credits}
                                        <span className="ml-1 text-[12px] font-black text-slate-500">crédits</span>
                                    </div>

                                    {credits > creditBase ? (
                                        <div
                                            className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800 ring-1 ring-emerald-200">
                                            +{credits - creditBase} via promo
                                        </div>
                                    ) : p.includedExtraCredits ? (
                                        <div
                                            className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800 ring-1 ring-emerald-200">
                                            +{p.includedExtraCredits} offerts
                                        </div>
                                    ) : null}
                                </div>

                                {/* price */}
                                <div className="text-right">
                                    {hasDiscount ? (
                                        <div
                                            className="text-[12px] font-black text-slate-400 line-through">{formatEUR(base)}</div>
                                    ) : null}
                                    <div className="text-[22px] font-black text-slate-900">{formatEUR(withPromo)}</div>

                                    {promoForPack ? (
                                        <div
                                            className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-800 ring-1 ring-rose-200">
                                            <Percent className="h-3.5 w-3.5"/>
                                            {savingsText(p, promoForPack) ?? "Avantage appliqué"}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                                {p.benefits.slice(0, 3).map((b) => (
                                    <div key={b}>• {b}</div>
                                ))}
                            </div>

                            {tooSmall ? (
                                <div className="mt-2 text-[11px] text-rose-700 font-semibold">
                                    Insuffisant pour {draft.requiredCredits} vidéo(s)
                                </div>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {promoToast ? (
                <div className="mt-3 text-center">
    <span className="inline-flex rounded-full bg-slate-900 text-white px-4 py-2 text-[12px] font-black">
      {promoToast}
    </span>
                </div>
            ) : null}


            {/* Checkout */}
            <div className="mt-4 rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <div className="text-sm font-black text-slate-900">3) Valider la commande</div>

                <button
                    onClick={() => void proceedToCheckout()}
                    disabled={checkoutLoading || items.length === 0 || selectedTooSmall}
                    className="mt-4 w-full px-4 py-3 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {checkoutLoading ? <Loader2 className="animate-spin" size={18}/> : <CreditCard size={18}/>}
                    Procéder à la commande
                </button>

                <div className="mt-3 text-[11px] text-slate-600">
                    Paiement → génération automatique → album prêt. Ensuite vous pourrez ré-ordonner et ré-exporter sans
                    payer.
                </div>
            </div>
        </div>
    );
}
