import React, {useEffect, useState} from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import {useRouter} from "next/router";
import {Crown, ArrowLeft} from "lucide-react";

import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import type {AlbumItemDTO} from "@/types/studioHelp";
import {StudioHelpShell} from "@/components/studio/help/StudioHelpShell";
import {cx, glassCard, pillBase} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";

export const getServerSideProps: GetServerSideProps<{ albumId: string }> = async (ctx) => {
    const id = String(ctx.params?.id || "");
    if (!id) return {notFound: true};
    return {props: {albumId: id}};
};

export default function HelpFinalizePage({albumId}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const {t} = useT();
    const router = useRouter();
    const [items, setItems] = useState<AlbumItemDTO[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            const data = await fetchJson<{
                items: AlbumItemDTO[]
            }>(`/api/albums/${encodeURIComponent(albumId)}/items`, {
                method: "GET",
            });
            setItems(data.items);
        })();
    }, [albumId]);

    const goPro = async () => {
        setBusy(true);
        try {
            await fetchJson(`/api/albums/${encodeURIComponent(albumId)}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({mode: "studio_pro"}),
            });
            await router.push(`/studio/albums/${encodeURIComponent(albumId)}/pro`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <StudioHelpShell
            albumId={albumId}
            step="finalize"
            title={t("studio.finalize.title")}
            subtitle={t("studio.finalize.sub")}
            right={
                <button
                    type="button"
                    onClick={goPro}
                    disabled={busy || items.length === 0}
                    className={cx(
                        "rounded-2xl px-4 py-2 text-sm font-black transition inline-flex items-center gap-2",
                        busy || items.length === 0
                            ? "bg-stone-200 text-stone-500"
                            : "bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:opacity-[0.98] active:scale-[0.99]"
                    )}
                    data-tour="go-pro"
                >
                    <Crown size={16}/>
                    {busy ? t("studio.finalize.activating") : t("studio.finalize.activate_pro")}
                </button>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8">
                    <div className={cx(glassCard(), "p-6")} data-tour="recap">
                        <div className={pillBase()}>
                            <Crown size={14} className="text-rose-600"/>
                            Récapitulatif
                        </div>
                        <div className="mt-2 text-sm font-black text-stone-900">{t("studio.finalize.recap_title")}</div>
                        <div className="mt-1 text-sm text-stone-600">
                            {t("studio.finalize.recap_count", {n: String(items.length)})}
                        </div>

                        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                            {items.slice(0, 12).map((it) => (
                                <div key={it.id}
                                     className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                                    <img src={it.thumbnailUrl} className="h-20 w-full object-cover" alt=""/>
                                </div>
                            ))}
                        </div>
                        {items.length > 12 ? (
                            <div className="mt-2 text-[11px] text-stone-500">+{items.length - 12} autres…</div>
                        ) : null}

                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => router.push(`/studio/albums/${encodeURIComponent(albumId)}/help/organize`)}
                                className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-black hover:bg-stone-50 transition inline-flex items-center gap-2"
                            >
                                <ArrowLeft size={16}/>
                                {t("studio.finalize.back")}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className={cx(glassCard(), "p-6")}>
                        <div className="text-sm font-black text-stone-900">Ce que débloque le mode Pro</div>
                        <div className="mt-2 text-xs text-stone-600 space-y-2">
                            <div>• Génération vidéo + exports (avec crédits)</div>
                            <div>• Options avancées (rendu, stabilité, musique, etc.)</div>
                            <div>• Gestion plus “studio” de l’album</div>
                        </div>
                        <div className="mt-4 text-[11px] text-stone-500">
                            Le passage en Pro est lié à cet album uniquement.
                        </div>
                    </div>
                </div>
            </div>
        </StudioHelpShell>
    );
}
