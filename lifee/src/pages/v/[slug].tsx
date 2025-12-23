// pages/v/[slug].tsx
import React from "react";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { eq } from "drizzle-orm";
import { Sparkles, User } from "lucide-react";

import { db } from "@/lib/db";
import { lifeeJobs } from "@/lib/db/schema";
import {useLifeeJobStatus} from "@/components/useLifeeJobStatus";
import {PlayerCard} from "@/components/PlayerCard";
import {ConversionCard} from "@/components/ConversionCard";
import AuthModal from "@/components/landing/AuthModal";
import Bonus from "@/components/landing/Bonus";

function getAppUrlFromReq(req: any) {
    const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    return `${proto}://${host}`;
}

type PageProps = {
    slug: string;
    jobId: string;
    shareUrl: string;
    title: string;
    createdLabel: string;
    createdBy: string;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
    const slug = String(ctx.params?.slug || "").trim();
    if (!slug) return { notFound: true };

    const row = await db
        .select({
            id: lifeeJobs.id,
            shareSlug: lifeeJobs.shareSlug,
            createdAt: lifeeJobs.createdAt,
            email: lifeeJobs.email,
        })
        .from(lifeeJobs)
        .where(eq(lifeeJobs.shareSlug, slug))
        .limit(1)
        .then((r) => r[0]);

    if (!row) return { notFound: true };

    const base = getAppUrlFromReq(ctx.req);
    const createdAt = row.createdAt ? new Date(row.createdAt as any) : null;

    const createdLabel = createdAt
        ? `Créé le ${createdAt.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })}`
        : "Créé récemment";

    return {
        props: {
            slug,
            jobId: row.id,
            shareUrl: `${base}/v/${row.shareSlug}`,
            title: "Souvenirs",
            createdLabel,
            createdBy: row.email ? row.email.split("@")[0] : "un proche",
        },
    };
};

export default function SharedMemorySlugPage({
                                                 jobId,
                                                 shareUrl,
                                                 title,
                                                 createdLabel,
                                                 createdBy,
                                             }: InferGetServerSidePropsType<typeof getServerSideProps>) {

    const router = useRouter();

    React.useEffect(() => {
        if (!router.isReady) return;

        // évite de réécrire si déjà présent
        if (router.query.jobId === jobId) return;

        // ✅ replace = pas d’empilement dans l’historique
        router.replace(
            { pathname: router.pathname, query: { ...router.query, jobId } },
            undefined,
            { shallow: true }
        );
    }, [router.isReady, router.query, router.pathname, jobId, router]);

    const showAuthModal = () => router.push({ query: { ...router.query, auth: "1" } }, undefined, { shallow: true });

    const { videoUrl, thumbnailUrl, statusLine, progress, shareUrl: shareUrlFromApi, createdAt } = useLifeeJobStatus(jobId);
    const finalShareUrl = shareUrlFromApi || shareUrl;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">
            <AuthModal />
            <Head>
                <title>Lifee — Revisionnage</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            {/* Background blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Navbar simplified */}
            <nav className="relative z-10 px-6 py-6 flex justify-between items-center w-full max-w-7xl mx-auto">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Sparkles size={18} className="text-white fill-white" />
                    </div>
                    Lifee.
                </div>
                <button
                    onClick={showAuthModal}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-full hover:bg-white/5"
                >
                    Connexion
                </button>
            </nav>

            {/* Main */}
            <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-6 gap-12 items-center justify-center relative z-10">
                <PlayerCard
                    videoUrl={videoUrl}
                    title={title}
                    createdLabel={createdLabel}
                    createdBy={createdBy}
                    progress={progress}
                    statusText={statusLine}
                />

                <div className="w-full lg:w-1/3">
                    <ConversionCard
                        canReplay={Boolean(videoUrl)}
                        statusLine={statusLine}
                        progress={progress}
                        shareUrl={finalShareUrl}
                        onUnlock={showAuthModal}
                        createdAt={createdAt}
                    />

                    {/* Social Proof Mini (tu peux remplacer/retirer si tu veux) */}
                    <div className="border-t border-white/5 pt-6 flex items-center justify-between mt-8">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-950 flex items-center justify-center text-[8px] text-slate-400"
                                >
                                    <User size={12} />
                                </div>
                            ))}
                            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold">
                                +10k
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400">Déjà utilisé par</div>
                            <div className="text-sm font-bold text-white">10,000+ familles</div>
                        </div>
                    </div>
                </div>
            </div>
            <Bonus
                onLoginClick={() => showAuthModal()}
                chance={0.4}
                minDelayMs={1500}
                maxDelayMs={8000}
                persist="session"
            />
        </div>
    );
}
