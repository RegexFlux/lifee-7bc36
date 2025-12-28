// src/components/studio/help/upload/WelcomeUploadCard.tsx
"use client";

import React, {useMemo} from "react";
import {Upload, ShieldCheck, Sparkles, Film} from "lucide-react";
import {cx, glassCard, pillBase} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";
import {UploadWithPreview} from "@/components/studio/UploadWithPreview";
import {uploadFilesToAssetsAndAttachToAlbum} from "@/components/studio/help/upload/uploadUtils";

export function WelcomeUploadCard(props: { albumId: string; onUploaded?: () => void }) {
    const {t} = useT();

    const dropLabel = useMemo(() => t("studio.upload.hint"), [t]);

    return (
        <div className={cx(glassCard(), "overflow-hidden")}>
            <div className="p-5 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className={pillBase()} data-tour="import">
                            <Sparkles size={14} className="text-rose-600"/>
                            {t("studio.welcome.upload.title")}
                        </div>
                        <div className="mt-2 text-sm font-black text-stone-900">{t("studio.upload.cta")}</div>
                        <div className="mt-1 text-xs text-stone-500">{dropLabel}</div>
                    </div>

                    <div
                        className="shrink-0 grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
                        <Upload size={18}/>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-emerald-600"/>
                            <div className="text-[12px] font-black text-stone-900">Privé</div>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500 leading-snug">
                            Vos fichiers restent dans votre espace (S3 privé).
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-rose-600"/>
                            <div className="text-[12px] font-black text-stone-900">Prévisualisation</div>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500 leading-snug">
                            Vous voyez les aperçus avant l’import et pouvez retirer un item.
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                            <Film size={16} className="text-amber-600"/>
                            <div className="text-[12px] font-black text-stone-900">Organisation</div>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500 leading-snug">
                            L’ordre se règle après, par glisser-déposer.
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <UploadWithPreview
                    tourDropzone="welcome-upload"
                    onUpload={async (files) => {
                        await uploadFilesToAssetsAndAttachToAlbum({albumId: props.albumId, files});
                    }
                    }
                    onUploaded={props.onUploaded}
                />
            </div>
        </div>
    );
}
