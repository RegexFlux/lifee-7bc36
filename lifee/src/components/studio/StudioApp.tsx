"use client";

import React, {useEffect, useMemo, useState} from "react";
import type {Asset, MusicTrack, TimelineItem} from "@/types/studio";
import {studioApi} from "@/lib/studioApi";
import {useToast} from "@/components/ui/ToastProvider";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";

import {Sidebar} from "./Sidebar";
import {Toolbar} from "./Toolbar";
import {TimelineCanvas} from "./TimelineCanvas";
import {UploadDraft, UploadModal} from "@/components/studio/modals/UploadModal";
import {CustomTrack, MusicModal} from "@/components/studio/modals/MusicModal";
import {AIGenModal} from "@/components/studio/aigen/AIGenModal";
import {CreditModal} from "@/components/studio/modals/CreditModal";
import {ExportModal} from "@/components/studio/modals/ExportModal";


type DragPayload = { item: any; source: "library" | "timeline" };

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function formatMMYYYY(monthIndex0: number, year: number) {
    const mm = String(monthIndex0 + 1).padStart(2, "0");
    return `${mm}/${year}`;
}

export default function StudioApp() {
    const {push} = useToast();

    const [library, setLibrary] = useState<Asset[]>([]);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [credits, setCredits] = useState(0);

    const [musicPresets, setMusicPresets] = useState<MusicTrack[]>([]);
    const [audioTrack, setAudioTrack] = useState<MusicTrack | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"all" | "video" | "image">("all");

    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [transform, setTransform] = useState({x: 0, y: 0, scale: 0.8});

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

    const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
    const [deleting, setDeleting] = useState(false);

    const refresh = async () => {
        const data = await studioApi.bootstrap();
        setCredits(data.credits);
        setLibrary(data.library);
        setTimeline(data.timeline);
        setMusicPresets(data.musicPresets);
    };

    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setIsSidebarOpen(false);
            setTransform((t) => ({...t, scale: 0.6}));
        }
    }, []);

    useEffect(() => {
        refresh().catch((e: any) => {
            push({title: "Erreur chargement", message: e?.message || "Bootstrap failed", variant: "error"});
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredLibrary = useMemo(() => {
        const s = searchTerm.trim().toLowerCase();
        return library.filter((item) => {
            const okSearch = !s || item.title.toLowerCase().includes(s);
            const okType = filterType === "all" || item.type === filterType;
            return okSearch && okType;
        });
    }, [library, searchTerm, filterType]);

    // Drag writer
    const handleDragStart = (e: React.DragEvent, item: any, source: "library" | "timeline") => {
        e.dataTransfer.setData("application/json", JSON.stringify({item, source}));
        e.dataTransfer.effectAllowed = "move";
    };

    // Timeline actions (DB)
    const addAssetToTimeline = async (asset: Asset, index?: number) => {
        const position = typeof index === "number" ? index : null;
        const clip = await studioApi.createClip({assetId: asset.id, position});
        setTimeline((prev) => {
            const next = [...prev];
            if (typeof index === "number") next.splice(index, 0, clip);
            else next.push(clip);
            return next;
        });
        push({title: "Ajouté à la timeline", message: asset.title, variant: "success"});
    };

    const deleteTimelineItem = async (clipId: string) => {
        // optimistic
        const prev = timeline;
        setTimeline((t) => t.filter((x) => x.id !== clipId));
        try {
            await studioApi.deleteClip(clipId);
            push({title: "Supprimé de la timeline", variant: "success"});
        } catch (e: any) {
            setTimeline(prev);
            push({title: "Suppression échouée", message: e?.message || "", variant: "error"});
        }
    };

    const moveTimelineItem = async (clipId: string, direction: -1 | 1) => {
        const idx = timeline.findIndex((t) => t.id === clipId);
        if (idx < 0) return;
        const nextIdx = idx + direction;
        if (nextIdx < 0 || nextIdx >= timeline.length) return;

        const next = [...timeline];
        const [moved] = next.splice(idx, 1);
        next.splice(nextIdx, 0, moved);
        setTimeline(next);

        try {
        } catch (e: any) {
            push({title: "Réorganisation échouée", message: e?.message || "", variant: "error"});
            await refresh();
        }
    };

    const reorderByDrop = async (clipId: string, targetIndex: number) => {
        const next = [...timeline];
        const from = next.findIndex((x) => x.id === clipId);
        if (from < 0) return;

        const [moved] = next.splice(from, 1);
        let idx = clamp(targetIndex, 0, next.length);
        if (from < idx) idx -= 1;
        next.splice(idx, 0, moved);

        setTimeline(next);

        try {
        } catch (e: any) {
            push({title: "Réorganisation échouée", message: e?.message || "", variant: "error"});
            await refresh();
        }
    };

    const handleDropPlacement = async (payload: DragPayload, index: number) => {
        if (payload.source === "timeline") {
            const clipId = payload.item?.id as string | undefined;
            if (!clipId) return;
            await reorderByDrop(clipId, index);
            return;
        }

        const asset = payload.item as Asset;
        if (!asset?.id) return;

        if (asset.type === "video") {
            await addAssetToTimeline(asset, index);
        } else {
            setPendingAsset(asset);
            setPendingIndex(index);
            setGenDurationSec(5);
            setGenPrompt("");
            setIsAIOpen(true);
        }
    };

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

    // Library delete
    const confirmDeleteAsset = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await studioApi.deleteAsset(deleteTarget.id);
            setLibrary((prev) => prev.filter((x) => x.id !== deleteTarget.id));
            push({title: "Supprimé", message: deleteTarget.title, variant: "success"});
            setDeleteTarget(null);
            await refresh(); // pour nettoyer la timeline si besoin
        } catch (e: any) {
            push({title: "Suppression échouée", message: e?.message || "", variant: "error"});
        } finally {
            setDeleting(false);
        }
    };
    // Upload create asset (metadata only)
    const handleUploadSubmit = async (draft: UploadDraft) => {
        push({title: "Enregistrement dans la bibliothèque..", message: "", variant: "info"});
        try {
            if (!draft.file) throw new Error("Fichier manquant");

            const {fileUrl, thumbnailUrl, fileKey, thumbnailKey} = await studioApi.uploadMedia({
                file: draft.file,
                thumbnail: draft.thumbnailFile ?? null,
            });

            const date = `${String(draft.month + 1).padStart(2, "0")}/${draft.year}`;

            const asset = await studioApi.createAsset({
                title: draft.title,
                type: draft.type,
                date,
                duration: draft.type === "video" ? draft.duration : undefined,
                fileKey,
                thumbnailKey,
            });

            setLibrary((prev) => [asset, ...prev]);
            push({title: "Ajouté à la bibliothèque", message: asset.title, variant: "success"});
            setIsUploadOpen(false);
        } catch (e: any) {
            push({title: "Upload échoué", message: e?.message || "", variant: "error"});
        }
    };

    // AI generate -> returns Asset, then create clip
    const handleGenerateAI = async () => {
        if (!pendingAsset) return;
        if (credits <= 0) {
            setIsAIOpen(false);
            setIsCreditModalOpen(true);
            return;
        }
        try {
            push({title: "Génération IA", message: "Demande envoyée…", variant: "info"});
            const gen = await studioApi.generateVideoFromImage({
                sourceAssetId: pendingAsset.id,
                durationSec: genDurationSec,
                prompt: genPrompt,
            });

            // refresh credits from server (simple et safe)
            await refresh();

            // add generated asset to library UI immediately (optionnel si refresh l’a déjà)
            setLibrary((prev) => [gen, ...prev]);

            // add to timeline at index
            await addAssetToTimeline(gen, pendingIndex ?? undefined);

            setIsAIOpen(false);
            setPendingAsset(null);
            setPendingIndex(null);

            push({title: "Vidéo générée et ajoutée", message: gen.title, variant: "success"});
        } catch (e: any) {
            push({title: "Génération échouée", message: e?.message || "", variant: "error"});
        }
    };

    // Credits purchase
    const handlePurchase = async (amount: number) => {
        setPurchasing(true);
        try {
            const r = await studioApi.purchaseCredits(amount);
            setCredits(r.credits);
            push({title: "Crédits ajoutés", message: `+${amount}`, variant: "success"});
            setIsCreditModalOpen(false);
        } catch (e: any) {
            push({title: "Achat échoué", message: e?.message || "", variant: "error"});
        } finally {
            setPurchasing(false);
        }
    };

    // Music
    const openMusic = async () => {
        try {
            const list = await studioApi.listMusicPresets();
            setMusicPresets(list);
            setIsMusicOpen(true);
        } catch (e: any) {
            push({title: "Musique indisponible", message: e?.message || "", variant: "error"});
        }
    };

    // Export
    const startExport = async () => {
        if (timeline.length === 0) return;

        setIsExportOpen(true);
        setRenderStep("rendering");
        setRenderProgress(0);
        setExportUrl(null);

        try {
            const {jobId} = await studioApi.startExport({
                timelineClipIds: timeline.map((t) => t.id),
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
                    push({title: "Export prêt", variant: "success"});
                } else if (s.status === "error") {
                    done = true;
                    setRenderStep("error");
                    push({title: "Export échoué", variant: "error"});
                } else {
                    await new Promise((r) => setTimeout(r, 800));
                }
            }
        } catch (e: any) {
            setRenderStep("error");
            push({title: "Export impossible", message: e?.message || "", variant: "error"});
        }
    };

    const handleDownload = () => {
        if (!exportUrl) return;
        window.open(exportUrl, "_blank", "noopener,noreferrer");
    };

    const handleShare = async () => {
        if (!exportUrl) return;
        try {
            // @ts-expect-error
            if (navigator.share) {
                // @ts-expect-error
                await navigator.share({title: "Mon film", url: exportUrl});
            } else {
                await navigator.clipboard.writeText(exportUrl);
                push({title: "Lien copié", message: "Coller pour partager.", variant: "success"});
            }
        } catch {
        }
    };

    const zoomIn = () => setTransform((t) => ({...t, scale: clamp(t.scale + 0.1, 0.2, 2)}));
    const zoomOut = () => setTransform((t) => ({...t, scale: clamp(t.scale - 0.1, 0.2, 2)}));
    const resetView = () => setTransform({x: 0, y: 0, scale: 0.8});

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

            <div
                className="flex-1 relative bg-slate-100 overflow-hidden flex flex-col transition-all duration-300 w-full">
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

            {/* Modals */}
            <UploadModal open={isUploadOpen} onClose={() => setIsUploadOpen(false)} onSubmit={handleUploadSubmit}/>

            <MusicModal
                open={isMusicOpen}
                tracks={musicPresets}
                selectedId={audioTrack?.id ?? null}
                onUploadCustom={async (file: File) => {return {
                    id: '1',
                    title: 'yes'
                } as CustomTrack}}
                onSelectCustom={(track) => {}}
                onSelect={(t) => {
                    setAudioTrack(t);
                    push({
                        title: "Musique",
                        message: t ? `Sélectionnée: ${t.title}` : "Sans musique",
                        variant: "success"
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
                description={deleteTarget ? `Cet élément sera supprimé de la bibliothèque : “${deleteTarget.title}”.` : undefined}
                confirmText="Supprimer"
                danger
                loading={deleting}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDeleteAsset}
            />
        </div>
    );
}
