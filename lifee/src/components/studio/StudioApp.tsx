// src/components/studio/StudioApp.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Download, Music, PanelLeftOpen, RotateCcw, Sparkles, ZoomIn, ZoomOut
} from "lucide-react";

import type { Asset, TimelineItem, MusicTrack } from "@/types/studio";
import { studioApi } from "@/lib/studioApi";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Sidebar } from "./Sidebar";

// TODO: remets ton TimelineCanvas / modals existantes en composants séparés
// Ici on garde la logique côté container, et on appelle des composants.

const ITEM_SLOT_WIDTH = 200;
const PADDING_LEFT = 160;

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function StudioApp() {
    const { push } = useToast();

    // Data
    const [library, setLibrary] = useState<Asset[]>([]);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [credits, setCredits] = useState<number>(0);
    const [musicPresets, setMusicPresets] = useState<MusicTrack[]>([]);
    const [audioTrack, setAudioTrack] = useState<MusicTrack | null>(null);

    // UI
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"all" | "video" | "image">("all");

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Drag/drop canvas states
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Pan/zoom minimal (tu peux extraire en hook + réutiliser ton code)
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });

    useEffect(() => {
        // Responsive init
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setIsSidebarOpen(false);
            setTransform((t) => ({ ...t, scale: 0.6 }));
        }
    }, []);

    useEffect(() => {
        // Bootstrap depuis le back (library + timeline + credits + musique)
        (async () => {
            try {
                const data = await studioApi.bootstrap();
                setLibrary(data.library);
                setTimeline(data.timeline);
                setCredits(data.credits);
                setMusicPresets(data.musicPresets);
            } catch (e: any) {
                push({ title: "Erreur chargement", message: e?.message || "Bootstrap failed", variant: "error" });
            }
        })();
    }, [push]);

    const filteredLibrary = useMemo(() => {
        return library.filter((item) => {
            const okSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
            const okType = filterType === "all" || item.type === filterType;
            return okSearch && okType;
        });
    }, [library, searchTerm, filterType]);

    // --- DnD handlers ---
    const handleDragStart = (e: React.DragEvent, item: any, source: "library" | "timeline") => {
        e.dataTransfer.setData("application/json", JSON.stringify({ item, source }));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOverCanvas = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDraggingOver(true);

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const xInsideCanvas = (e.clientX - rect.left - transform.x) / transform.scale;
            const relativeX = xInsideCanvas - PADDING_LEFT;
            let index = Math.round(relativeX / ITEM_SLOT_WIDTH);
            index = Math.max(0, Math.min(index, timeline.length));
            setPreviewIndex(index);
        }
    };

    const handleDragLeaveCanvas = () => {
        setIsDraggingOver(false);
        setPreviewIndex(null);
    };

    const addToTimeline = async (asset: Asset, index?: number) => {
        const newItem: TimelineItem = {
            ...asset,
            uniqueId: uid(),
            source: "library",
        };

        setTimeline((prev) => {
            const next = [...prev];
            if (typeof index === "number") next.splice(index, 0, newItem);
            else next.push(newItem);
            return next;
        });

        push({ title: "Ajouté à la timeline", message: asset.title, variant: "success" });

        // persist
        try {
            const nextTimeline = (() => {
                const copy = [...timeline];
                if (typeof index === "number") copy.splice(index, 0, newItem);
                else copy.push(newItem);
                return copy;
            })();
            await studioApi.saveTimeline(nextTimeline);
        } catch {
            // on ne rollback pas ici (sinon UX pénible), mais tu peux le faire si tu veux
            push({ title: "Sauvegarde timeline échouée", variant: "error" });
        }
    };

    const reorderTimeline = async (uniqueId: string, targetIndex: number) => {
        setTimeline((prev) => {
            const copy = [...prev];
            const oldIndex = copy.findIndex((x) => x.uniqueId === uniqueId);
            if (oldIndex < 0) return prev;
            const [moved] = copy.splice(oldIndex, 1);
            let idx = targetIndex;
            if (oldIndex < targetIndex) idx -= 1;
            copy.splice(idx, 0, moved);
            return copy;
        });

        try {
            // save latest (use functional update snapshot approach in real life)
            await studioApi.saveTimeline(timeline);
        } catch {
            push({ title: "Réorganisation non sauvegardée", variant: "error" });
        }
    };

    const handleDropOnCanvas = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);

        const idx = previewIndex ?? timeline.length;
        setPreviewIndex(null);

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json")) as { item: any; source: "library" | "timeline" };

            if (data.source === "timeline") {
                await reorderTimeline(data.item.uniqueId as string, idx);
                return;
            }

            const asset = data.item as Asset;

            if (asset.type === "video") {
                await addToTimeline(asset, idx);
            } else {
                // Image => ouvrir ta modale IA (déportée) ; ici je fais une version back directe (ex: auto prompt)
                // À remplacer par ton AIGenModal.
                if (credits <= 0) {
                    push({ title: "Crédits insuffisants", message: "Recharge pour générer une vidéo IA.", variant: "error" });
                    return;
                }

                setCredits((c) => c - 1);
                push({ title: "Génération IA", message: "Demande envoyée…", variant: "info" });

                const gen = await studioApi.generateVideoFromImage({
                    sourceAssetId: asset.id,
                    durationSec: 5,
                    prompt: "Auto prompt",
                });

                const generatedAsset: Asset = {
                    id: gen.id,
                    type: "video",
                    title: gen.title,
                    date: asset.date,
                    duration: `${5}s`,
                    thumbnailUrl: gen.thumbnailUrl,
                };

                // 1) add timeline
                await addToTimeline(generatedAsset, idx);

                // 2) add library
                setLibrary((prev) => [generatedAsset, ...prev]);

                push({ title: "Vidéo IA créée", message: generatedAsset.title, variant: "success" });
            }
        } catch (err: any) {
            push({ title: "Drop échoué", message: err?.message || "Invalid drop", variant: "error" });
        }
    };

    // --- Delete asset library ---
    const confirmDeleteAsset = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await studioApi.deleteAsset(deleteTarget.id);
            setLibrary((prev) => prev.filter((x) => x.id !== deleteTarget.id));
            push({ title: "Supprimé", message: deleteTarget.title, variant: "success" });
            setDeleteTarget(null);
        } catch (e: any) {
            push({ title: "Suppression échouée", message: e?.message || "Delete failed", variant: "error" });
        } finally {
            setDeleting(false);
        }
    };

    // --- Export ---
    const startExport = async () => {
        try {
            push({ title: "Export", message: "Rendu lancé…", variant: "info" });
            const { jobId } = await studioApi.startExport({ timeline, musicId: audioTrack?.id ?? null });

            // polling simple
            let done = false;
            while (!done) {
                // eslint-disable-next-line no-await-in-loop
                const s = await studioApi.exportStatus(jobId);
                if (s.status === "done") {
                    done = true;
                    push({ title: "Export prêt", message: "Ton film est disponible.", variant: "success" });
                    // s.url => lien final (à brancher sur ta modale export)
                } else if (s.status === "error") {
                    done = true;
                    push({ title: "Export échoué", message: "Erreur de rendu.", variant: "error" });
                } else {
                    // queued/rendering
                    // (tu peux setState progress ici)
                    await new Promise((r) => setTimeout(r, 800));
                }
            }
        } catch (e: any) {
            push({ title: "Export impossible", message: e?.message || "Export failed", variant: "error" });
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden text-slate-800 select-none relative">
            <Sidebar
                open={isSidebarOpen}
                searchTerm={searchTerm}
                filterType={filterType}
                filteredItems={filteredLibrary}
                onChangeSearch={setSearchTerm}
                onChangeFilter={setFilterType}
                onOpenUpload={() => push({ title: "Upload", message: "Branche ta UploadModal ici.", variant: "info" })}
                onClose={() => setIsSidebarOpen(false)}
                onAdd={(asset) => addToTimeline(asset)}
                onDragStart={(e, asset) => handleDragStart(e, asset, "library")}
                onRequestDelete={(asset) => setDeleteTarget(asset)}
            />

            {/* MAIN */}
            <div className="flex-1 relative bg-slate-100 overflow-hidden flex flex-col transition-all duration-300 w-full">
                {/* TOOLBAR */}
                <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none">
                    <div className="flex gap-2 pointer-events-auto">
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 active:bg-gray-100"
                            >
                                <PanelLeftOpen size={20} />
                            </button>
                        )}
                        <div className="hidden md:flex gap-1 bg-white p-1 rounded-lg shadow-md border border-gray-200">
                            <button onClick={() => setTransform((t) => ({ ...t, scale: t.scale + 0.1 }))} className="p-1.5 hover:bg-gray-100 rounded">
                                <ZoomIn size={18} />
                            </button>
                            <button
                                onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.2, t.scale - 0.1) }))}
                                className="p-1.5 hover:bg-gray-100 rounded"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <button onClick={() => setTransform({ x: 0, y: 0, scale: 0.8 })} className="p-1.5 hover:bg-gray-100 rounded">
                                <RotateCcw size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end pointer-events-auto">
                        <button
                            onClick={() => push({ title: "Crédits", message: "Branche ta CreditModal ici.", variant: "info" })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur border border-amber-200 text-amber-600 rounded-full shadow-sm text-xs font-bold"
                        >
                            <Sparkles size={14} className="fill-amber-400 text-amber-500" /> {credits}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    // refresh musique depuis serveur si besoin
                                    try {
                                        const list = await studioApi.listMusicPresets();
                                        setMusicPresets(list);
                                        push({ title: "Musique", message: "Liste rafraîchie (serveur).", variant: "success" });
                                        // ici ouvre ta MusicModal et setAudioTrack()
                                    } catch (e: any) {
                                        push({ title: "Musique", message: e?.message || "Erreur serveur", variant: "error" });
                                    }
                                }}
                                className={`p-2 rounded-lg shadow-md border transition-colors ${
                                    audioTrack ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-600"
                                }`}
                                title="Musique"
                            >
                                <Music size={20} />
                            </button>

                            <button
                                onClick={startExport}
                                disabled={timeline.length === 0}
                                className="p-2 bg-slate-900 text-white rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                title="Exporter"
                            >
                                <Download size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CANVAS (placeholder minimal, remplace par ton TimelineCanvas component) */}
                <div
                    className="flex-1 overflow-hidden relative touch-none"
                    onDragOver={handleDragOverCanvas}
                    onDrop={handleDropOnCanvas}
                    onDragLeave={handleDragLeaveCanvas}
                >
                    <div
                        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`,
                            backgroundPosition: `${transform.x}px ${transform.y}px`,
                            backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
                        }}
                    />

                    <div
                        ref={containerRef}
                        className="absolute origin-top-left flex items-center h-full min-w-max"
                        style={{
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                            paddingLeft: `${PADDING_LEFT}px`,
                            paddingRight: `${PADDING_LEFT}px`,
                        }}
                    >
                        {timeline.length > 0 && <div className="absolute left-0 right-0 top-1/2 h-1.5 -z-10 rounded-full bg-gray-300" />}

                        {previewIndex !== null && (
                            <div
                                className="absolute z-0 flex items-center justify-center pointer-events-none opacity-50"
                                style={{
                                    left: `${previewIndex * ITEM_SLOT_WIDTH}px`,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    width: "140px",
                                    height: "200px",
                                }}
                            >
                                <div className="w-1 h-full border-l-2 border-dashed border-indigo-500" />
                                <div className="absolute top-0 bg-indigo-500 text-white text-[10px] px-2 rounded-full transform -translate-y-1/2">
                                    Insérer
                                </div>
                            </div>
                        )}

                        {/* À remplacer par le composant TimelineCanvas complet */}
                        <div className="flex gap-6">
                            {timeline.map((t) => (
                                <div
                                    key={t.uniqueId}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, t, "timeline")}
                                    className="w-40 bg-white rounded-xl shadow-md border border-slate-200 p-3 text-xs"
                                >
                                    <div className="font-bold truncate">{t.title}</div>
                                    <div className="text-[10px] text-slate-500 mt-1">{t.date}</div>
                                </div>
                            ))}
                        </div>

                        {timeline.length === 0 && !isDraggingOver && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-10 text-center">
                                <div className="bg-white/80 p-6 rounded-2xl border-2 border-dashed border-gray-300 backdrop-blur-sm">
                                    <div className="text-gray-500 text-sm">Timeline vide</div>
                                    <div className="text-xs text-gray-400 mt-1">Glissez des médias ou cliquez</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
