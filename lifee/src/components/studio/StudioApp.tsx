"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { Asset, MusicTrack, TimelineItem } from "@/types/studio";
import { studioApi } from "@/lib/studioApi";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { TimelineCanvas } from "./TimelineCanvas";
import {UploadDraft, UploadModal} from "@/components/studio/modals/UploadModal";
import {MusicModal} from "@/components/studio/modals/MusicModal";
import {AIGenModal} from "@/components/studio/modals/AIGenModal";
import {CreditModal} from "@/components/studio/modals/CreditModal";
import {ExportModal} from "@/components/studio/modals/ExportModal";

type DragPayload = { item: any; source: "library" | "timeline" };

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function formatMMYYYY(monthIndex0: number, year: number) {
    const mm = String(monthIndex0 + 1).padStart(2, "0");
    return `${mm}/${year}`;
}

export default function StudioApp() {
    const { push } = useToast();

    // --- Data ---
    const [library, setLibrary] = useState<Asset[]>([]);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [credits, setCredits] = useState<number>(0);

    const [musicPresets, setMusicPresets] = useState<MusicTrack[]>([]);
    const [audioTrack, setAudioTrack] = useState<MusicTrack | null>(null);

    // --- UI ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"all" | "video" | "image">("all");

    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // View transform (pan/zoom)
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });

    // --- Modals ---
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const [isMusicOpen, setIsMusicOpen] = useState(false);

    const [isAIOpen, setIsAIOpen] = useState(false);
    const [pendingAsset, setPendingAsset] = useState<Asset | null>(null);
    const [pendingIndex, setPendingIndex] = useState<number | null>(null);
    const [genDurationSec, setGenDurationSec] = useState(5);
    const [genPrompt, setGenPrompt] = useState("");

    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [purchasing, setPurchasing] = useState(false);

    const [isExportOpen, setIsExportOpen] = useState(false);
    const [renderStep, setRenderStep] = useState<"idle" | "rendering" | "done" | "error">("idle");
    const [renderProgress, setRenderProgress] = useState(0);
    const [exportUrl, setExportUrl] = useState<string | null>(null);

    // Delete library confirmation
    const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
    const [deleting, setDeleting] = useState(false);

    // --- Bootstrap ---
    useEffect(() => {
        // responsive init
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setIsSidebarOpen(false);
            setTransform((t) => ({ ...t, scale: 0.6 }));
        }
    }, []);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const data = await studioApi.bootstrap();
                if (!alive) return;

                setCredits(data.credits);
                setLibrary(data.library);
                setTimeline(data.timeline);
                setMusicPresets(data.musicPresets);
            } catch (e: any) {
                push({
                    title: "Erreur chargement",
                    message: e?.message || "Impossible de charger les données",
                    variant: "error",
                });
            }
        })();

        return () => {
            alive = false;
        };
    }, [push]);

    // --- Filtering ---
    const filteredLibrary = useMemo(() => {
        const s = searchTerm.trim().toLowerCase();
        return library.filter((item) => {
            const okSearch = !s || item.title.toLowerCase().includes(s);
            const okType = filterType === "all" || item.type === filterType;
            return okSearch && okType;
        });
    }, [library, searchTerm, filterType]);

    // --- Timeline helpers (with save) ---
    const saveTimeline = async (next: TimelineItem[]) => {
        try {
            await studioApi.saveTimeline(next);
        } catch (e: any) {
            push({
                title: "Sauvegarde échouée",
                message: e?.message || "Timeline non sauvegardée",
                variant: "error",
            });
        }
    };

    const insertTimelineItem = async (item: TimelineItem, index?: number) => {
        setTimeline((prev) => {
            const next = [...prev];
            if (typeof index === "number") next.splice(index, 0, item);
            else next.push(item);
            // fire & forget save with computed next
            void saveTimeline(next);
            return next;
        });
    };

    const addAssetToTimeline = async (asset: Asset, index?: number) => {
        const nextItem: TimelineItem = {
            ...asset,
            uniqueId: uid(),
            source: asset.isGenerated ? "generated" : "library",
            isGenerated: asset.isGenerated,
            context: asset.context,
        };

        await insertTimelineItem(nextItem, index);

        push({
            title: "Ajouté à la timeline",
            message: asset.title,
            variant: "success",
        });
    };

    const deleteTimelineItem = async (uniqueId: string) => {
        setTimeline((prev) => {
            const next = prev.filter((x) => x.uniqueId !== uniqueId);
            void saveTimeline(next);
            return next;
        });
        push({ title: "Supprimé de la timeline", variant: "success" });
    };

    const moveTimelineItem = async (uniqueId: string, direction: -1 | 1) => {
        setTimeline((prev) => {
            const idx = prev.findIndex((x) => x.uniqueId === uniqueId);
            if (idx < 0) return prev;
            const nextIdx = idx + direction;
            if (nextIdx < 0 || nextIdx >= prev.length) return prev;

            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            next.splice(nextIdx, 0, moved);
            void saveTimeline(next);
            return next;
        });
    };

    const reorderTimelineByDrop = async (uniqueId: string, targetIndex: number) => {
        setTimeline((prev) => {
            const next = [...prev];
            const oldIndex = next.findIndex((x) => x.uniqueId === uniqueId);
            if (oldIndex < 0) return prev;

            const [moved] = next.splice(oldIndex, 1);
            let idx = clamp(targetIndex, 0, next.length);
            if (oldIndex < idx) idx -= 1;
            next.splice(idx, 0, moved);

            void saveTimeline(next);
            return next;
        });
    };

    // --- Drag & drop payload writer ---
    const handleDragStart = (e: React.DragEvent, item: any, source: "library" | "timeline") => {
        e.dataTransfer.setData("application/json", JSON.stringify({ item, source }));
        e.dataTransfer.effectAllowed = "move";
    };

    // --- Drop placement from TimelineCanvas ---
    const handleDropPlacement = async (payload: DragPayload, index: number) => {
        if (payload.source === "timeline") {
            const u = payload.item?.uniqueId as string | undefined;
            if (!u) return;
            await reorderTimelineByDrop(u, index);
            return;
        }

        // from library
        const asset = payload.item as Asset;
        if (!asset?.id) return;

        if (asset.type === "video") {
            // direct
            await addAssetToTimeline(asset, index);
        } else {
            // image => open AI modal
            setPendingAsset(asset);
            setPendingIndex(index);
            setGenDurationSec(5);
            setGenPrompt("");
            setIsAIOpen(true);
        }
    };

    // --- Click add (smart add) ---
    const handleSmartAdd = async (asset: Asset) => {
        if (typeof window !== "undefined" && window.innerWidth < 768) setIsSidebarOpen(false);

        if (asset.type === "video") {
            await addAssetToTimeline(asset);
        } else {
            setPendingAsset(asset);
            setPendingIndex(timeline.length);
            setGenDurationSec(5);
            setGenPrompt("");
            setIsAIOpen(true);
        }
    };

    // --- Library delete ---
    const confirmDeleteAsset = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await studioApi.deleteAsset(deleteTarget.id);
            setLibrary((prev) => prev.filter((x) => x.id !== deleteTarget.id));

            // Optionnel: enlever de timeline les items qui utilisent cet asset
            setTimeline((prev) => {
                const next = prev.filter((t) => t.id !== deleteTarget.id);
                void saveTimeline(next);
                return next;
            });

            push({ title: "Supprimé", message: deleteTarget.title, variant: "success" });
            setDeleteTarget(null);
        } catch (e: any) {
            push({
                title: "Suppression échouée",
                message: e?.message || "Impossible de supprimer",
                variant: "error",
            });
        } finally {
            setDeleting(false);
        }
    };

    // --- Upload submit ---
    const handleUploadSubmit = async (draft: UploadDraft) => {
        try {
            const date = formatMMYYYY(draft.month, draft.year);

            // Dev only: thumbnail temporaire depuis le file local (à remplacer par un upload réel)
            const thumb =
                draft.file && draft.type === "image"
                    ? URL.createObjectURL(draft.file)
                    : draft.thumbnailUrl;

            const asset = await studioApi.createAsset({
                title: draft.title,
                type: draft.type,
                date,
                duration: draft.type === "video" ? draft.duration : undefined,
                thumbnailUrl: thumb,
            });

            setLibrary((prev) => [asset, ...prev]);
            setIsUploadOpen(false);

            push({ title: "Ajouté", message: asset.title, variant: "success" });
        } catch (e: any) {
            push({
                title: "Upload échoué",
                message: e?.message || "Impossible d’ajouter le média",
                variant: "error",
            });
        }
    };

    // --- AI generate ---
    const handleGenerateAI = async () => {
        if (!pendingAsset) return;

        if (credits <= 0) {
            setIsAIOpen(false);
            setIsCreditModalOpen(true);
            push({ title: "Crédits insuffisants", message: "Recharge pour générer.", variant: "error" });
            return;
        }

        try {
            push({ title: "Génération IA", message: "Demande envoyée…", variant: "info" });

            const gen = await studioApi.generateVideoFromImage({
                sourceAssetId: pendingAsset.id,
                durationSec: genDurationSec,
                prompt: genPrompt,
            });

            // Maj crédits localement (le stub serveur décrémente aussi)
            setCredits((c) => Math.max(0, c - 1));

            const generatedAsset: Asset = {
                id: gen.id,
                type: "video",
                title: gen.title,
                date: gen.date ?? pendingAsset.date,
                duration: gen.duration ?? `${genDurationSec}s`,
                thumbnailUrl: gen.thumbnailUrl ?? pendingAsset.thumbnailUrl,
                isGenerated: true,
                context: gen.context ?? genPrompt,
            };

            // 1) add to timeline
            await addAssetToTimeline(generatedAsset, pendingIndex ?? undefined);

            // 2) add to library
            setLibrary((prev) => [generatedAsset, ...prev]);

            setIsAIOpen(false);
            setPendingAsset(null);
            setPendingIndex(null);

            push({ title: "Vidéo IA créée", message: generatedAsset.title, variant: "success" });
        } catch (e: any) {
            push({
                title: "Génération échouée",
                message: e?.message || "Impossible de générer",
                variant: "error",
            });
        }
    };

    // --- Credits purchase (back) ---
    const handlePurchase = async (amount: number) => {
        setPurchasing(true);
        try {
            const res = await studioApi.purchaseCredits(amount);
            setCredits(res.credits);
            push({ title: "Crédits ajoutés", message: `+${amount}`, variant: "success" });
            setIsCreditModalOpen(false);
        } catch (e: any) {
            push({
                title: "Achat échoué",
                message: e?.message || "Impossible d’acheter",
                variant: "error",
            });
        } finally {
            setPurchasing(false);
        }
    };

    // --- Music ---
    const openMusic = async () => {
        try {
            // refresh depuis serveur (optionnel)
            const list = await studioApi.listMusicPresets();
            setMusicPresets(list);
            setIsMusicOpen(true);
        } catch (e: any) {
            push({
                title: "Musique indisponible",
                message: e?.message || "Impossible de charger la liste",
                variant: "error",
            });
        }
    };

    // --- Export ---
    const startExport = async () => {
        if (timeline.length === 0) return;

        setIsExportOpen(true);
        setRenderStep("rendering");
        setRenderProgress(0);
        setExportUrl(null);

        try {
            const { jobId } = await studioApi.startExport({
                timeline,
                musicId: audioTrack?.id ?? null,
            });

            let done = false;
            while (!done) {
                const s = await studioApi.exportStatus(jobId);

                setRenderProgress(clamp(s.progress ?? 0, 0, 100));

                if (s.status === "done") {
                    done = true;
                    setRenderStep("done");
                    setExportUrl(s.url ?? null);
                    push({ title: "Export prêt", variant: "success" });
                } else if (s.status === "error") {
                    done = true;
                    setRenderStep("error");
                    push({ title: "Export échoué", variant: "error" });
                } else {
                    await new Promise((r) => setTimeout(r, 800));
                }
            }
        } catch (e: any) {
            setRenderStep("error");
            push({
                title: "Export impossible",
                message: e?.message || "Erreur de rendu",
                variant: "error",
            });
        }
    };

    const handleDownload = () => {
        if (!exportUrl) {
            push({ title: "Aucun fichier", message: "URL de téléchargement manquante.", variant: "error" });
            return;
        }
        window.open(exportUrl, "_blank", "noopener,noreferrer");
    };

    const handleShare = async () => {
        if (!exportUrl) return;

        try {
            // @ts-expect-error - navigator.share exists on mobile
            if (navigator.share) {
                // @ts-expect-error
                await navigator.share({ title: "Mon film", url: exportUrl });
            } else {
                await navigator.clipboard.writeText(exportUrl);
                push({ title: "Lien copié", message: "Coller pour partager.", variant: "success" });
            }
        } catch {
            // ignore
        }
    };

    // --- Toolbar zoom controls ---
    const zoomIn = () => setTransform((t) => ({ ...t, scale: clamp(t.scale + 0.1, 0.2, 2) }));
    const zoomOut = () => setTransform((t) => ({ ...t, scale: clamp(t.scale - 0.1, 0.2, 2) }));
    const resetView = () => setTransform({ x: 0, y: 0, scale: 0.8 });

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden text-slate-800 select-none relative">
            <Sidebar
                open={isSidebarOpen}
                searchTerm={searchTerm}
                filterType={filterType}
                filteredItems={filteredLibrary}
                onChangeSearch={setSearchTerm}
                onChangeFilter={setFilterType}
                onOpenUpload={() => setIsUploadOpen(true)}
                onClose={() => setIsSidebarOpen(false)}
                onAdd={handleSmartAdd}
                onDragStart={(e, asset) => handleDragStart(e, asset, "library")}
                onRequestDelete={(asset) => setDeleteTarget(asset)}
            />

            <div className="flex-1 relative bg-slate-100 overflow-hidden flex flex-col transition-all duration-300 w-full">
                <Toolbar
                    isSidebarOpen={isSidebarOpen}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    credits={credits}
                    onOpenCredits={() => setIsCreditModalOpen(true)}
                    hasAudio={!!audioTrack}
                    onOpenMusic={openMusic}
                    onExport={startExport}
                    exportDisabled={timeline.length === 0}
                    showZoomControls
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onResetView={resetView}
                />

                <TimelineCanvas
                    timeline={timeline}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                    transform={transform}
                    onTransformChange={setTransform}
                    onDragStartTimeline={(e, item) => handleDragStart(e, item, "timeline")}
                    onDropPlacement={handleDropPlacement}
                    onDeleteItem={deleteTimelineItem}
                    onMoveItem={moveTimelineItem}
                />
            </div>

            {/* --- Modals --- */}
            <UploadModal
                open={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onSubmit={handleUploadSubmit}
            />

            <MusicModal
                open={isMusicOpen}
                tracks={musicPresets}
                selectedId={audioTrack?.id ?? null}
                onSelect={(t) => {
                    setAudioTrack(t);
                    push({
                        title: "Musique",
                        message: t ? `Sélectionnée: ${t.title}` : "Sans musique",
                        variant: "success",
                    });
                }}
                onClose={() => setIsMusicOpen(false)}
            />

            <AIGenModal
                open={isAIOpen}
                source={pendingAsset}
                credits={credits}
                durationSec={genDurationSec}
                onChangeDurationSec={setGenDurationSec}
                prompt={genPrompt}
                onChangePrompt={setGenPrompt}
                onGenerate={handleGenerateAI}
                onClose={() => {
                    setIsAIOpen(false);
                    setPendingAsset(null);
                    setPendingIndex(null);
                }}
            />

            <CreditModal
                open={isCreditModalOpen}
                credits={credits}
                purchasing={purchasing}
                onClose={() => setIsCreditModalOpen(false)}
                onPurchase={handlePurchase}
            />

            <ExportModal
                open={isExportOpen}
                step={renderStep}
                progress={renderProgress}
                audioTrack={audioTrack}
                onClose={() => {
                    setIsExportOpen(false);
                    setRenderStep("idle");
                    setRenderProgress(0);
                    setExportUrl(null);
                }}
                onDownload={handleDownload}
                onShare={handleShare}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Supprimer définitivement ?"
                description={
                    deleteTarget ? `Cet élément sera supprimé de la bibliothèque : “${deleteTarget.title}”.` : undefined
                }
                confirmText="Supprimer"
                danger
                loading={deleting}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDeleteAsset}
            />
        </div>
    );
}
