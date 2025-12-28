// OrganizeAssetImportModal.tsx
"use client";

import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import {Asset} from "@/lib/db/types";
import React, {useEffect, useMemo, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {cx, pillBase} from "@/components/studio/help/ui";
import {Check, Loader2, Pencil, PlusCircle, Save, Upload, X} from "lucide-react";
import {AssetThumb} from "@/components/asset/AssetThumb";
import {UploadWithPreview} from "@/components/studio/UploadWithPreview";

export default function OrganizeAssetImportModal(props: Readonly<{
    alreadyImported?: string[];
    open: boolean;
    onClose: () => void;
    onSave: (assets: Asset[]) => Promise<void>;

    // NEW (optionnel) : permet d’activer l’onglet "Importer"
    onUploadFiles?: (files: File[]) => Promise<void>;
}>) {
    const [assets, setAssets] = useState<Asset[]>();
    const [assetsToAdd, setAssetsToAdd] = useState<Asset[]>([]);
    const [saving, setSaving] = useState(false);

    const hasUpload = !!props.onUploadFiles;
    const [tab, setTab] = useState<"library" | "upload">("library");

    const alreadyImportedSet = useMemo(
        () => new Set(props.alreadyImported || []),
        [props.alreadyImported]
    );

    const loadAssets = async () => {
        const result = await fetchJson<{ assets: Asset[] }>("/api/assets");
        const filtered = result.assets.filter((a) => !alreadyImportedSet.has(a.id));
        setAssets(filtered);
        if (!filtered.length) {
            setTab("upload")
        }
        return filtered;
    };

    useEffect(() => {
        if (!props.open) return;
        (async () => {
            await loadAssets();
            // reset tab selection if upload is not available
            if (!hasUpload) setTab("library");
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.open, props.alreadyImported, hasUpload]);

    const add = (asset: Asset) => {
        setAssetsToAdd((prev) => [...(prev ?? []), asset]);
    };

    const remove = (index: number) => {
        setAssetsToAdd((prev) => {
            if (!prev) return [];
            const copy = [...prev];
            copy.splice(index, 1);
            return copy;
        });
    };

    const getOverlay = (asset: Asset) => {
        const index = assetsToAdd?.findIndex((a) => a.id === asset.id) ?? -1;
        return index >= 0 ? (
            <div
                onClick={() => remove(index)}
                className="w-full h-full absolute top-0 left-0 cursor-pointer bg-white/80 flex items-center justify-center text-amber-600"
            >
                <Check size={24}/>
            </div>
        ) : (
            <div
                onClick={() => add(asset)}
                className="w-full h-full absolute top-0 left-0 cursor-pointer bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-600"
            >
                <PlusCircle size={24}/>
            </div>
        );
    };

    const save = async () => {
        setSaving(true);
        await props.onSave(assetsToAdd);
        setSaving(false);
    };

    const refreshAndAutoSelectNew = async (beforeIds: Set<string>) => {
        const after = await loadAssets();
        const newOnes = after.filter((a) => !beforeIds.has(a.id));
        if (newOnes.length) {
            setAssetsToAdd((prev) => {
                const existing = new Set((prev || []).map((x) => x.id));
                const merged = [...(prev || [])];
                for (const a of newOnes) if (!existing.has(a.id)) merged.push(a);
                return merged;
            });
        }
    };

    return (
        <AnimatePresence>
            {props.open && assets ? (
                <div className="fixed inset-0 z-[120]">
                    <motion.button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={props.onClose}
                        aria-label="Fermer"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    />

                    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        {tab === "library" || !hasUpload ? (
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                className={cx(
                                    "w-full sm:max-w-3xl bg-white border border-stone-200 shadow-2xl overflow-hidden",
                                    "rounded-t-3xl sm:rounded-3xl max-h-[88vh]"
                                )}
                                initial={{y: 18, opacity: 0, scale: 0.99}}
                                animate={{y: 0, opacity: 1, scale: 1}}
                                exit={{y: 18, opacity: 0, scale: 0.99}}
                                transition={{type: "spring", stiffness: 420, damping: 34}}
                            >
                                {/* Header */}
                                <div className="p-4 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className={pillBase()}>
                                                <Pencil size={14} className="text-amber-600"/>
                                                Éditer le souvenir
                                            </div>
                                            <div className="mt-2 text-sm font-black text-stone-900 truncate">
                                                Votre bibliothèque
                                            </div>
                                            <div className="mt-1 text-xs text-stone-500">
                                                Ajoutez à votre album des éléments déjà importés/générés (ou importez-en
                                                de
                                                nouveaux).
                                            </div>
                                        </div>

                                        <button
                                            onClick={props.onClose}
                                            className="p-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200"
                                            aria-label="Fermer"
                                        >
                                            <X size={18} className="text-stone-600"/>
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="max-h-[62dvh] overflow-y-auto pr-1">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                            {assets.map((asset) => (
                                                <div key={asset.id} className="group relative">
                                                    <AssetThumb
                                                        assetId={asset.id}
                                                        type={asset.type}
                                                        overlay={getOverlay(asset)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                {assetsToAdd.length > 0 && (<div className="border-t border-stone-100 bg-white p-3">
                                    <button
                                        type="button"
                                        onClick={async () => await save()}
                                        disabled={saving}
                                        className={cx(
                                            "h-12 w-full px-4 rounded-2xl text-sm font-black transition inline-flex items-center justify-center gap-2",
                                            saving
                                                ? "bg-stone-200 text-stone-500"
                                                : "bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:opacity-[0.98] active:scale-[0.99]"
                                        )}
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                        Enregistrer
                                    </button>
                                </div>)}
                            </motion.div>) : (
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                className={cx(
                                    "w-full sm:max-w-3xl bg-white border border-stone-200 shadow-2xl overflow-hidden",
                                    "rounded-t-3xl sm:rounded-3xl max-h-[88vh]"
                                )}
                                initial={{y: 18, opacity: 0, scale: 0.99}}
                                animate={{y: 0, opacity: 1, scale: 1}}
                                exit={{y: 18, opacity: 0, scale: 0.99}}
                                transition={{type: "spring", stiffness: 420, damping: 34}}
                            >
                                <div className="max-h-[62dvh] overflow-y-auto pr-1">
                                    <div className="rounded-3xl border border-stone-200 bg-white p-4">
                                        <div className="mb-3">
                                            <div className={pillBase()}>
                                                <Upload size={14} className="text-rose-600"/>
                                                Importer des fichiers
                                            </div>
                                            <div className="mt-2 text-xs text-stone-500">
                                                Après import, les nouveaux éléments seront auto-sélectionnés.
                                            </div>
                                        </div>

                                        <UploadWithPreview
                                            tourDropzone="organize-upload"
                                            tip={null}
                                            onUpload={async (files) => {
                                                if (!props.onUploadFiles) return;

                                                const before = new Set((assets || []).map((a) => a.id));
                                                await props.onUploadFiles(files);
                                                await refreshAndAutoSelectNew(before);
                                                props.onClose();
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
