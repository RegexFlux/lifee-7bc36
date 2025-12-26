// pages/studio/albums/[id]/help/finalize.tsx
import React, {useEffect, useState} from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import {useRouter} from "next/router";
import {ArrowLeft, Crown, Download, Loader2} from "lucide-react";

import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import type {AlbumItemDTO} from "@/types/studioHelp";
import {StudioHelpShell} from "@/components/studio/help/StudioHelpShell";
import {cx, glassCard, pillBase} from "@/components/studio/help/ui";
import {useT} from "@/lib/i18n/useT";
import {TourStep} from "@/components/tutorial/TutorialOverlay";
import {useAlbumExportLatest} from "@/hooks/useAlbumExportLatest";


export const studioHelpFinalizeSteps: TourStep[] = [
    {
        id: "recap",
        target: '[data-tour="recap"]',
        title: "Récapitulatif",
        body: "Vérifiez rapidement que vos souvenirs sont dans le bon ordre avant de finaliser.",
        placement: "bottom",
    },
    {
        id: "export",
        target: '[data-tour="export"]',
        title: "Exporter l’album",
        body: "Lance l’export complet. Vous obtiendrez un lien public (privé) pour partager le résultat.",
        placement: "bottom",
    },
    {
        id: "go-pro",
        target: '[data-tour="go-pro"]',
        title: "Mode Pro (affichage)",
        body: "Passe l’album en mode Pro : même logique, mais interface et options avancées plus visibles.",
        placement: "left",
    },
];

export const getServerSideProps: GetServerSideProps<{ albumId: string }> = async (ctx) => {
    const id = String(ctx.params?.id || "");
    if (!id) return {notFound: true};
    return {props: {albumId: id}};
};

type ExportCreateResp = { job: { id: string; status: string; progress: number } };
type ExportShareResp = { share: { id: string }; publicPath: string };

export default function HelpFinalizePage({albumId}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const {t} = useT();
    const router = useRouter();

    const [items, setItems] = useState<AlbumItemDTO[]>([]);
    const [busyPro, setBusyPro] = useState(false);
    const [busy, setBusy] = useState(false);

    const [busyExport, setBusyExport] = useState(false);
    const [exportErr, setExportErr] = useState<string | null>(null);

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
        setBusyPro(true);
        try {
            await fetchJson(`/api/albums/${encodeURIComponent(albumId)}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({mode: "studio_pro"}),
            });
            await router.push(`/studio/albums/${encodeURIComponent(albumId)}/pro`);
        } finally {
            setBusyPro(false);
        }
    };

    const exportAlbum = async () => {
        setExportErr(null);
        setBusyExport(true);
        try {
            // 1) create export job
            const created = await fetchJson<ExportCreateResp>("/api/exports", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({albumId}),
            });

            const exportJobId = created?.job?.id;
            if (!exportJobId) throw new Error(t("studio.finalize.export_failed"));

            // 2) create/activate share for this export job
            const shared = await fetchJson<ExportShareResp>(`/api/exports/${encodeURIComponent(exportJobId)}/share`, {
                method: "POST",
            });

            const publicPath = shared?.publicPath;
            if (!publicPath) throw new Error(t("studio.finalize.export_failed"));

            // 3) go to public share page (progress + final download there)
            await router.push(publicPath);
        } catch (e: any) {
            setExportErr(e?.message || t("studio.finalize.export_failed"));
        } finally {
            setBusyExport(false);
        }
    };

    const disabledActions = items.length === 0;

    const exportState = useAlbumExportLatest(albumId);

    const startExport = async () => {
        setBusy(true);
        try {
            const r = await fetchJson<{ exportJob: any }>(`/api/albums/${encodeURIComponent(albumId)}/exports`, {
                method: "POST",
            });
            // refresh to show immediately
            await exportState.refresh();
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
                <div className="flex items-center gap-2">
                    {!exportState.job && (<button
                        type="button"
                        onClick={exportAlbum}
                        disabled={busyExport || disabledActions}
                        className={cx(
                            "rounded-2xl px-4 py-2 text-sm font-black transition inline-flex items-center gap-2",
                            busyExport || disabledActions
                                ? "bg-stone-200 text-stone-500"
                                : "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99]"
                        )}
                        data-tour="export"
                    >
                        <Download size={16}/>
                        {busyExport ? t("studio.finalize.exporting") : t("studio.finalize.export")}
                    </button>)}

                    <button
                        type="button"
                        onClick={goPro}
                        disabled={busyPro || disabledActions}
                        className={cx(
                            "rounded-2xl px-4 py-2 text-sm font-black transition inline-flex items-center gap-2",
                            busyPro || disabledActions
                                ? "bg-stone-200 text-stone-500"
                                : "bg-gradient-to-r from-rose-600 to-amber-500 text-white hover:opacity-[0.98] active:scale-[0.99]"
                        )}
                        data-tour="go-pro"
                    >
                        <Crown size={16}/>
                        {busyPro ? t("studio.finalize.activating") : t("studio.finalize.activate_pro")}
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {!exportState.job ? (<div className="lg:col-span-8">
                    <div className={cx(glassCard(), "p-6")} data-tour="recap">
                        <div className={pillBase()}>
                            <Crown size={14} className="text-rose-600"/>
                            {t("studio.finalize.recap_pill")}
                        </div>

                        <div className="mt-2 text-sm font-black text-stone-900">{t("studio.finalize.recap_title")}</div>
                        <div
                            className="mt-1 text-sm text-stone-600">{t("studio.finalize.recap_count", {n: String(items.length)})}</div>

                        {exportErr ? (
                            <div
                                className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800">
                                {exportErr}
                            </div>
                        ) : null}

                        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                            {items.slice(0, 12).map((it) => (
                                <div key={it.id}
                                     className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                                    {it.thumbnailUrl ? (
                                        <img src={it.thumbnailUrl} className="h-20 w-full object-cover" alt=""/>
                                    ) : (
                                        <div className="h-20 w-full bg-stone-100 animate-pulse"/>
                                    )}
                                </div>
                            ))}
                        </div>
                        {items.length > 12 ? (
                            <div
                                className="mt-2 text-[11px] text-stone-500">+{items.length - 12} {t("studio.finalize.more")}</div>
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
                </div>) : (<></>)}

                <div className="lg:col-span-8">
                    <div className={cx(glassCard(), "p-6")}>
                        <div className="text-sm font-black text-stone-900">{t("studio.finalize.export.title")}</div>
                        <div className="mt-1 text-xs text-stone-600">{t("studio.finalize.export.sub")}</div>

                        {exportState.job ? (
                            <div className="mt-4 rounded-2xl border border-stone-200 bg-white/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs font-bold text-stone-800">
                                        {t(`studio.export.status.${exportState.job.status}`)}
                                    </div>
                                    <div className="text-[11px] font-mono text-stone-500">{exportState.job.progress}%
                                    </div>
                                </div>

                                <div className="mt-2 h-2 rounded-full bg-stone-200 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-rose-600 to-amber-500"
                                         style={{width: `${exportState.job.progress}%`}}/>
                                </div>

                                {exportState.job.status === "error" ? (
                                    <div className="mt-2 text-[11px] font-semibold text-rose-600">
                                        {exportState.job.errorMessage || t("studio.export.error_generic")}
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="mt-3 text-[11px] text-stone-500">
                                {t("studio.finalize.export.none")}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={startExport}
                            disabled={busy || exportState.isRunning || items.length === 0}
                            className={cx(
                                "mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black transition inline-flex items-center justify-center gap-2",
                                busy || exportState.isRunning || items.length === 0
                                    ? "bg-stone-200 text-stone-500"
                                    : "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99]"
                            )}
                        >
                            {exportState.isRunning ? <Loader2 size={16} className="animate-spin"/> :
                                <Download size={16}/>}
                            {exportState.isRunning ? t("studio.finalize.export.running") : t("studio.finalize.export.cta")}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className={cx(glassCard(), "p-6")}>
                        <div className="text-sm font-black text-stone-900">{t("studio.finalize.pro_unlock_title")}</div>
                        <div className="mt-2 text-xs text-stone-600 space-y-2">
                            <div>{t("studio.finalize.pro_b1")}</div>
                            <div>{t("studio.finalize.pro_b2")}</div>
                            <div>{t("studio.finalize.pro_b3")}</div>
                        </div>
                        <div className="mt-4 text-[11px] text-stone-500">{t("studio.finalize.pro_album_scoped")}</div>
                    </div>
                </div>
            </div>
        </StudioHelpShell>
    );
}
