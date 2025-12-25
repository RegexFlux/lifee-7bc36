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
    RefreshCw,
} from "lucide-react";
import {useRouter} from "next/router";
import {type Pack} from "@/hooks/useVideoResultModal";
import AlbumShowCase from "@/components/album/AlbumShowcase";

import type {PackDTO, AppliedPromoQuote, ValidatePromoResponse, PacksResponse} from "@/types/billing";
import {PromoRoulette} from "@/components/PromoRoulette";
import {recommendPackId} from "@/lib/album/packs.server";


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

async function safeJson<T>(res: Response): Promise<T> {
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

export function AlbumSimple(props: { onRequireAuth?: () => void }) {
    const router = useRouter();
    const jobId = useMemo(() => normalizeJobId(router.query.jobId), [router.query.jobId]);

    const fileRef = useRef<HTMLInputElement | null>(null);

    const [draft, setDraft] = useState<DraftDTO | null>(null);

    const [packs, setPacks] = useState<PackDTO[]>([]);
    const [packsLoading, setPacksLoading] = useState(false);

    const [promoInput, setPromoInput] = useState("");
    const [promoQuote, setPromoQuote] = useState<AppliedPromoQuote | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);
    const [hasSpun, setHasSpun] = useState(false);


    // ✅ On stocke l’ordre comme un tableau déjà ordonné (position = index)
    const [items, setItems] = useState<DraftItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const [order, setOrder] = useState<OrderStatusDTO | null>(null);
    const pollRef = useRef<any>(null);

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
                startPolling(data.orderId);
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    const startPolling = (orderId: string) => {
        stopPolling();
        const tick = async () => {
            const r = await fetch(`/api/album/status/${encodeURIComponent(orderId)}`, {credentials: "include"});
            const s = await safeJson<OrderStatusDTO>(r);
            setOrder(s);
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
            const promoCode = promoQuote?.promo?.code ?? null;
            const promoSource = promoQuote?.promo ? (promoQuote.promoSource ?? null) : null;

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


    const applyPromoManual = async () => {
        if (!selectedPackId || !draft) return;
        setPromoLoading(true);
        setPromoError(null);
        try {
            const r = await fetch("/api/album/promo/validate", {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    packId: selectedPackId,
                    tier: (packs.find(p => p.id === selectedPackId)?.tier ?? "standard"),
                    code: promoInput
                }),
            });
            const data = (await r.json()) as ValidatePromoResponse;
            if (!data.ok) throw new Error(data.error);

            setPromoQuote(data.quote);
        } catch (e: any) {
            setPromoQuote(null);
            setPromoError(e?.message || "Code invalide");
        } finally {
            setPromoLoading(false);
        }
    };

    const clearPromo = () => {
        setPromoQuote(null);
        setPromoError(null);
        setPromoInput("");
    };

    useEffect(() => {
        setPromoQuote(null);
        setPromoError(null);
        setHasSpun(false); // tu peux décider de conserver, mais UX-wise souvent on reset quand pack change
    }, [selectedPackId]);

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

    // selected pack warning
    const selectedPack = packs.find((p) => p.id === selectedPackId) ?? null;
    const selectedTooSmall = !!selectedPack && selectedPack.credits < draft.requiredCredits;

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

            {/* PROMO + ROULETTE */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-black text-slate-900">Réduction</div>
                    <div className="text-xs text-slate-600 mt-1">Code promo (validé côté serveur) :</div>

                    <div className="mt-3 flex gap-2">
                        <input
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                            placeholder="Code (ex: LUCKY10)"
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-200"
                        />
                        <button
                            onClick={applyPromoManual}
                            disabled={promoLoading || promoInput.trim().length < 4 || !selectedPackId}
                            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black disabled:opacity-40"
                        >
                            {promoLoading ? "..." : "Appliquer"}
                        </button>
                    </div>

                    {promoError ? (
                        <div className="mt-2 text-xs text-rose-700">{promoError}</div>
                    ) : null}

                    {promoQuote?.promo ? (
                        <div className="mt-3 text-xs font-bold text-emerald-700">
                            Appliqué : {promoQuote.promo.code} — prix {promoQuote.finalPriceEur.toFixed(2)}€ •
                            crédits {promoQuote.finalCredits}
                            <button onClick={clearPromo} className="ml-3 underline text-slate-700">retirer</button>
                        </div>
                    ) : null}
                </div>

                <PromoRoulette
                    tier={(packs.find(p => p.id === selectedPackId)?.tier ?? "standard")}
                    packId={selectedPackId ?? ""}
                    hasSpun={hasSpun}
                    disabled={!selectedPackId}
                    onApplied={(quote) => {
                        setHasSpun(true);
                        setPromoInput(quote.promo?.code ?? "");
                        setPromoQuote(quote);
                        setPromoError(null);
                    }}
                />
            </div>


            {/* Checkout */}
            <div className="mt-4 rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <div className="text-sm font-black text-slate-900">3) Valider la commande</div>

                <div className="mt-2 text-xs text-slate-600">
                    {draft.requiredCredits} photo(s) → {items.length} vidéo(s) IA
                </div>

                {selectedTooSmall ? (
                    <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                        Le pack sélectionné est trop petit ({selectedPack?.credits} crédits). Choisissez un pack avec
                        ≥ {draft.requiredCredits}.
                    </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {packs.map((p) => {
                        const selected = selectedPackId === p.id;
                        const tooSmall = p.credits < draft.requiredCredits;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPackId(p.id)}
                                className={[
                                    "text-left rounded-2xl border p-4 transition",
                                    selected ? "border-slate-900 bg-white" : "border-slate-200 bg-white hover:bg-slate-50",
                                    p.highlight ? "shadow-sm" : "",
                                    tooSmall ? "opacity-60" : "",
                                ].join(" ")}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-black text-slate-900">{p.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{p.subtitle}</div>
                                    </div>
                                    <div className="text-sm font-black text-slate-900">{p.priceEur}€</div>
                                </div>

                                <div className="mt-3 text-xs text-slate-700 font-semibold">{p.credits} crédits</div>

                                <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                                    {p.benefits.slice(0, 4).map((b) => (
                                        <div key={b}>• {b}</div>
                                    ))}
                                </div>

                                {p.tier === "creator" ? (
                                    <div className="mt-3 text-[11px] text-slate-700 font-semibold">1080p • plus stable •
                                        couleurs restaurées</div>
                                ) : (
                                    <div className="mt-3 text-[11px] text-slate-500">720p • idéal pour tester</div>
                                )}

                                {tooSmall ? (
                                    <div className="mt-2 text-[11px] text-rose-700 font-semibold">
                                        Insuffisant pour {draft.requiredCredits} vidéo(s)
                                    </div>
                                ) : null}
                            </button>
                        );
                    })}
                </div>

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
