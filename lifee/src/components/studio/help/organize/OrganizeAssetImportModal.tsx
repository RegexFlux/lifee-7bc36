import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import {Asset} from "@/lib/db/types";
import React, {useEffect, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {cx, pillBase} from "@/components/studio/help/ui";
import {Check, Loader2, Pencil, PlusCircle, Save, X} from "lucide-react";
import {AssetThumb} from "@/components/asset/AssetThumb";

export default function OrganizeAssetImportModal(props: Readonly<{
    alreadyImported?: string[];
    open: boolean;
    onClose: () => void;
    onSave: (assets: Asset[]) => Promise<void>;
}>) {
    const [assets, setAssets] = React.useState<Asset[]>();
    const [assetsToAdd, setAssetsToAdd] = React.useState<Asset[]>([]);


    useEffect(() => {
        (async () => {
            const result = await fetchJson<{ assets: Asset[] }>("/api/assets");
            const assets = result.assets.filter(result => !props.alreadyImported?.includes(result.id));
            setAssets(assets);
        })();
    }, [props]);

    const add = (asset: Asset) => {
        setAssetsToAdd(prev => [...(prev ?? []), asset]);
    };

    const remove = (index: number) => {
        setAssetsToAdd(prev => {
            if (!prev) return [];
            const copy = [...prev];
            copy.splice(index, 1);
            return copy;
        });
    };

    const getOverlay = (asset: Asset) => {
        const index = assetsToAdd?.findIndex(a => a.id === asset.id) ?? -1;
        return index >= 0 ? (
            <div
                onClick={() => remove(index)}
                className="w-full h-full absolute top-0 left-0 cursor-pointer bg-white/80 flex items-center justify-center text-amber-600">
                <Check size={24}/>
            </div>
        ) : (<div
            onClick={() => add(asset)}
            className="w-full h-full absolute top-0 left-0 cursor-pointer bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-600">
            <PlusCircle size={24}/>
        </div>)
    }

    const save = async () => {
        setSaving(true);
        await props.onSave(assetsToAdd);
        setSaving(false);
    };

    const [saving, setSaving] = useState(false);

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

                    <div
                        className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className={cx(
                                "w-full sm:max-w-lg bg-white border border-stone-200 shadow-2xl overflow-hidden",
                                "rounded-t-3xl sm:rounded-3xl max-h-[88vh]"
                            )}
                            initial={{y: 18, opacity: 0, scale: 0.99}}
                            animate={{y: 0, opacity: 1, scale: 1}}
                            exit={{y: 18, opacity: 0, scale: 0.99}}
                            transition={{type: "spring", stiffness: 420, damping: 34}}
                        >
                            <div className="p-4 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className={pillBase()}>
                                            <Pencil size={14} className="text-amber-600"/>
                                            Éditer le souvenir
                                        </div>
                                        <div className="mt-2 text-sm font-black text-stone-900 truncate">
                                            Votre biliothèque
                                        </div>
                                        <div className="mt-1 text-xs text-stone-500">
                                            Ajoutez à votre album des éléments que vous avez déja importé/généré.
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
                                <div className="grid grid-cols-4 gap-4 py-4  overflow-scroll h-[70dvh]">

                                    {
                                        assets.map((asset) => (
                                            <div key={asset.id}>
                                                <AssetThumb assetId={asset.id} type={asset.type}
                                                            overlay={getOverlay(asset)}/>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={async () => await save()}
                                disabled={saving}
                                className={cx(
                                    "h-12 m-2 px-4 rounded-2xl text-sm font-black transition inline-flex items-center justify-center gap-2",
                                    saving
                                        ? "bg-stone-200 text-stone-500"
                                        : "bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:opacity-[0.98] active:scale-[0.99]"
                                )}
                            >
                                {saving ? (
                                    <Loader2 size={16} className="animate-spin"/>
                                ) : (
                                    <Save size={16}/>
                                )}
                                Enregistrer
                            </button>
                        </motion.div>
                    </div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}