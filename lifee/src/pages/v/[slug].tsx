// pages/v/[slug].tsx
import React from "react";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { eq } from "drizzle-orm";
import { Sparkles } from "lucide-react";

import { db } from "@/lib/db";
import { lifeeJobs } from "@/lib/db/schema";
import { useLifeeJobStatus } from "@/components/useLifeeJobStatus";
import { PlayerCard } from "@/components/PlayerCard";
import { ConversionCard } from "@/components/ConversionCard";
import AuthModal from "@/components/landing/AuthModal";
import NavBar from "@/components/landing/NavBar";

// ✅ Bonus peut contenir du hasard/timers → éviter SSR pour prévenir les “hydration mismatch”
const Bonus = dynamic(() => import("@/components/landing/Bonus"), { ssr: false });


import { Tilt3D } from "@/components/fx/Tilt3D";
import {StarDustRain} from "@/components/effects/StarDustRain";

const FXBackdrop = dynamic(() => import("@/components/fx/FXBackdrop"), {
    ssr: false,
});

function getAppUrlFromReq(req: any) {
    const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");

    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const xfHost = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    const host = String(xfHost).split(",")[0].trim(); // ⚠️ parfois "a,b,c"
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

    // (optionnel) garde-fou anti slugs bizarres
    if (!/^[a-zA-Z0-9_-]{3,}$/i.test(slug)) return { notFound: true };

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

    // évite que les proxies cachent une page privée
    ctx.res.setHeader("Cache-Control", "private, no-store, max-age=0");

    const base = getAppUrlFromReq(ctx.req);

    const createdAt = row.createdAt ? new Date(row.createdAt as any) : null;
    const createdLabel = createdAt
        ? `Créé le ${new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(createdAt)}`
        : "Créé récemment";

    const createdBy = row.email
        ? row.email.split("@")[0].slice(0, 18) // un peu plus safe
        : "un proche";

    return {
        props: {
            slug,
            jobId: String(row.id),
            shareUrl: `${base}/v/${row.shareSlug}`,
            title: "Souvenirs",
            createdLabel,
            createdBy,
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

    const queryJobId = router.query.jobId;

    React.useEffect(() => {
        if (!router.isReady) return;

        // évite de réécrire si déjà présent
        if (queryJobId === jobId) return;

        router.replace(
            { pathname: router.pathname, query: { ...router.query, jobId } },
            undefined,
            { shallow: true }
        );
    }, [router.isReady, router.pathname, router.query, queryJobId, jobId, router]);

    const openAuth = React.useCallback(() => {
        router.push(
            { pathname: router.pathname, query: { ...router.query, jobId, auth: "1" } },
            undefined,
            { shallow: true }
        );
    }, [router, jobId]);

    const { videoUrl, thumbnailUrl, statusLine, progress, shareUrl: shareUrlFromApi, createdAt } =
        useLifeeJobStatus(jobId);

    const finalShareUrl = shareUrlFromApi || shareUrl;

    const showAuthModal = () => router.push({ query: { ...router.query, auth: "1" } }, undefined, { shallow: true });


    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50 text-stone-900 relative overflow-hidden">
            <FXBackdrop />
            <StarDustRain />

            <Head>
                <title>Lifee — Revisionnage</title>
                <meta name="robots" content="noindex,nofollow" />
                <meta name="theme-color" content="#fafaf9" />
            </Head>

            <AuthModal />

            {/* Décor de fond (style “grainy / stone”) */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <NavBar onLoginClick={() => showAuthModal()} />

            {/* Main */}
            <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-6">
                {/* petit header editorial */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
                        Visionnage privé
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-8">
                        <Tilt3D className="rounded-3xl" intensity={6}>

                        <PlayerCard
                            videoUrl={videoUrl}
                            thumbnailUrl={thumbnailUrl}
                            title={title}
                            createdLabel={createdLabel}
                            createdBy={createdBy}
                            progress={progress}
                            statusText={statusLine}
                        />
                        </Tilt3D>
                    </div>

                    <div className="lg:col-span-4">
                        <Tilt3D className="rounded-3xl" intensity={6}>

                        <ConversionCard
                            canReplay={Boolean(videoUrl)}
                            statusLine={statusLine}
                            progress={progress}
                            shareUrl={finalShareUrl}
                            onUnlock={openAuth}
                            createdAt={createdAt}
                            variant="light"
                        />
                        </Tilt3D>

                        {/* Social proof mini (version “stone”) */}
                        <div className="mt-8 rounded-2xl border border-stone-200 bg-white/70 shadow-sm backdrop-blur p-5">
                            <div className="text-sm font-semibold text-stone-900">Déjà utilisé par des milliers de familles</div>
                            <div className="mt-1 text-xs text-stone-500">
                                Un lien simple, une émotion intacte — sans friction.
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-[11px] font-mono text-stone-500">confiance • privé • HD</div>
                                <div className="text-sm font-semibold text-stone-900">10k+</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Bonus onLoginClick={openAuth} chance={0.4} minDelayMs={1500} maxDelayMs={8000} persist="session" />
        </div>
    );
}
