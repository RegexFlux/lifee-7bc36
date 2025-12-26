// pages/share/exports/[id].tsx
import React, {useEffect, useState} from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import Head from "next/head";
import {useRouter} from "next/router";
import {Download, Film, AlertTriangle} from "lucide-react";

import {db} from "@/lib/db";
import {exportJobs, exportShares, albums} from "@/lib/db/schema";
import {and, eq} from "drizzle-orm";
import {presignGetObject} from "@/lib/s3/presignGet";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";

function getAppUrlFromReq(req: any) {
    const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const xfHost = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    const host = String(xfHost).split(",")[0].trim();
    return `${proto}://${host}`;
}

type SSRProps = {
    shareId: string;
    exportJobId: string;
    albumTitle: string;
    status: string;
    progress: number;
    videoUrl: string | null;
    shareUrl: string;
};

export const getServerSideProps: GetServerSideProps<SSRProps> = async (ctx) => {
    const shareId = String(ctx.params?.id || "").trim();
    if (!shareId) return {notFound: true};

    const row = (
        await db
            .select({
                shareId: exportShares.id,
                isActive: exportShares.isActive,

                exportJobId: exportJobs.id,
                status: exportJobs.status,
                progress: exportJobs.progress,
                videoKey: exportJobs.videoKey,

                albumTitle: albums.title,
            })
            .from(exportShares)
            .innerJoin(exportJobs, eq(exportJobs.id, exportShares.exportJobId))
            .innerJoin(albums, eq(albums.id, exportJobs.albumId))
            .where(and(eq(exportShares.id, shareId), eq(exportShares.isActive, true)))
            .limit(1)
    )[0];

    if (!row) return {notFound: true};

    ctx.res.setHeader("Cache-Control", "private, no-store, max-age=0");

    const base = getAppUrlFromReq(ctx.req);
    const shareUrl = `${base}/share/exports/${row.shareId}`;

    let videoUrl: string | null = null;
    if (row.videoKey) {
        videoUrl = await presignGetObject({key: row.videoKey, expiresIn: 60 * 15});
    }

    return {
        props: {
            shareId: row.shareId,
            exportJobId: row.exportJobId,
            albumTitle: row.albumTitle,
            status: row.status,
            progress: row.progress,
            videoUrl,
            shareUrl,
        },
    };
};

type PublicResp = {
    status: string;
    progress: number;
    videoUrl: string | null;
    errorMessage: string | null;
    albumTitle: string;
};

export default function ExportSharePage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const [status, setStatus] = useState(props.status);
    const [progress, setProgress] = useState(props.progress);
    const [videoUrl, setVideoUrl] = useState<string | null>(props.videoUrl);
    const [err, setErr] = useState<string | null>(null);

    // poll public endpoint (refresh url TTL + wait completion)
    useEffect(() => {
        let alive = true;
        let timer: any = null;

        const tick = async () => {
            try {
                const data = await fetchJson<PublicResp>(`/api/share/exports/${encodeURIComponent(props.shareId)}`, {
                    method: "GET",
                });

                if (!alive) return;
                setStatus(data.status);
                setProgress(data.progress);
                setVideoUrl(data.videoUrl);
                setErr(data.errorMessage);

                const done = data.status === "done" || data.status === "error";
                if (!done) timer = setTimeout(tick, 1500);
            } catch {
                // soft fail: retry
                if (!alive) return;
                timer = setTimeout(tick, 2500);
            }
        };

        const shouldPoll = status !== "done" && status !== "error";
        if (shouldPoll) timer = setTimeout(tick, 1000);

        return () => {
            alive = false;
            if (timer) clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.shareId]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50 text-stone-900">
            <Head>
                <title>Lifee — Export</title>
                <meta name="robots" content="noindex,nofollow"/>
                <meta name="theme-color" content="#fafaf9"/>
            </Head>

            <main className="mx-auto max-w-4xl px-6 py-10">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div
                            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                            <Film size={14} className="text-rose-600"/>
                            Export d’album
                        </div>
                        <div className="mt-3 text-2xl font-black text-stone-900">{props.albumTitle}</div>
                        <div className="mt-1 text-sm text-stone-600">Lien privé : {props.shareUrl}</div>
                    </div>

                    <button
                        onClick={() => router.push("/")}
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-black hover:bg-stone-50 transition"
                    >
                        Créer le mien
                    </button>
                </div>

                <div className="mt-8 rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-stone-100 bg-stone-50">
                        <div className="text-sm font-black text-stone-900">
                            {status === "done" ? "Export prêt" : status === "error" ? "Erreur d’export" : "Export en cours…"}
                        </div>

                        {status !== "done" ? (
                            <div className="mt-3">
                                <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                                    <div className="h-full bg-stone-900"
                                         style={{width: `${Math.max(2, Math.min(100, progress || 0))}%`}}/>
                                </div>
                                <div className="mt-1 text-[11px] text-stone-500">{progress}%</div>
                            </div>
                        ) : null}

                        {err ? (
                            <div
                                className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800 inline-flex items-center gap-2">
                                <AlertTriangle size={14}/>
                                {err}
                            </div>
                        ) : null}
                    </div>

                    <div className="p-4">
                        {videoUrl ? (
                            <>
                                <div className="rounded-2xl overflow-hidden border border-stone-200 bg-black">
                                    <video src={videoUrl} controls playsInline
                                           className="w-full h-[55vh] object-contain bg-black"/>
                                </div>

                                <a
                                    href={videoUrl}
                                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-stone-900 text-white px-4 py-3 text-sm font-black hover:bg-stone-800 transition"
                                >
                                    <Download size={18}/>
                                    Télécharger
                                </a>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
                                La vidéo n’est pas encore disponible. Cette page se mettra à jour automatiquement.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
