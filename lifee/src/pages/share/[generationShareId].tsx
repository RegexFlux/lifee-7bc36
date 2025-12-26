// File: pages/share/[generationShareId].tsx
import React from "react";
import type {GetServerSideProps, InferGetServerSidePropsType} from "next";
import Head from "next/head";
import {useRouter} from "next/router";
import dynamic from "next/dynamic";

import {StarDustRain} from "@/components/animations/StarDustRain";
import AuthModal from "@/components/auth/AuthModal";
import NavBar from "@/components/landing/sections/NavBar";
import {Tilt3D} from "@/components/animations/fx/Tilt3D";
import {PlayerCard} from "@/components/share/PlayerCard";
import {ConversionCard} from "@/components/share/ConversionCard";
import {usePublicShare} from "@/lib/public/usePublicShare";
import {useT} from "@/lib/i18n/useT";
import {ShareActions} from "@/components/share/ShareActions";

const FXBackdrop = dynamic(() => import("@/components/animations/fx/FXBackdrop"), {ssr: false});

function getAppUrlFromReq(req: any) {
    const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");

    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const xfHost = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    const host = String(xfHost).split(",")[0].trim();
    return `${proto}://${host}`;
}

function ogLocale(locale?: string) {
    const l = (locale || "fr").toLowerCase();
    if (l.startsWith("fr")) return "fr_FR";
    return "en_US";
}

export const getServerSideProps: GetServerSideProps<{
    generationShareId: string;
    canonicalUrl: string;
    ogImageUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogLocale: string;
}> = async (ctx) => {
    const generationShareId = String(ctx.params?.generationShareId || "").trim();
    if (!generationShareId) return {notFound: true};

    const base = getAppUrlFromReq(ctx.req);
    const canonicalUrl = `${base}/share/${generationShareId}`;
    const ogImageUrl = `${base}/api/share/${generationShareId}/image`;

    const locale = ctx.locale || "fr";
    const isFr = locale.toLowerCase().startsWith("fr");

    return {
        props: {
            generationShareId,
            canonicalUrl,
            ogImageUrl,
            ogTitle: isFr ? "Lifee — Visionnage privé" : "Lifee — Private viewing",
            ogDescription: isFr
                ? "Regardez ce souvenir. Pour sauvegarder et exporter en HD, passez au Studio."
                : "Watch this memory. To save and export in HD, unlock Studio.",
            ogLocale: ogLocale(locale),
        },
    };
};

export default function SharePage({
                                      generationShareId,
                                      canonicalUrl,
                                      ogImageUrl,
                                      ogTitle,
                                      ogDescription,
                                      ogLocale,
                                  }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const {t} = useT();

    const openAuth = React.useCallback(() => {
        router.push({pathname: router.pathname, query: {...router.query, auth: "1"}}, undefined, {shallow: true});
    }, [router]);

    const showAuthModal = React.useCallback(() => {
        router.push({query: {...router.query, auth: "1"}}, undefined, {shallow: true});
    }, [router]);

    const publicShare = usePublicShare({generationShareId});

    return (
        <div
            className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50 text-stone-900 relative overflow-hidden">
            <FXBackdrop/>
            <StarDustRain/>

            <Head>
                <title>{ogTitle}</title>
                <link rel="canonical" href={canonicalUrl}/>
                <meta name="robots" content="noindex,nofollow"/>
                <meta name="theme-color" content="#fafaf9"/>

                {/* OpenGraph */}
                <meta property="og:type" content="website"/>
                <meta property="og:locale" content={ogLocale}/>
                <meta property="og:title" content={ogTitle}/>
                <meta property="og:description" content={ogDescription}/>
                <meta property="og:url" content={canonicalUrl}/>
                <meta property="og:image" content={ogImageUrl}/>

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image"/>
                <meta name="twitter:title" content={ogTitle}/>
                <meta name="twitter:description" content={ogDescription}/>
                <meta name="twitter:image" content={ogImageUrl}/>
            </Head>

            <AuthModal/>

            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl"/>
                <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"/>
                <div
                    className="absolute inset-0 opacity-[0.06] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"/>
            </div>

            <NavBar onLoginClick={showAuthModal}/>

            <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-6">
                <div className="mb-8">
                    <div
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs text-stone-600 shadow-sm backdrop-blur">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400"/>
                        Visionnage privé
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-8">
                        <Tilt3D className="rounded-3xl" intensity={6}>
                            <PlayerCard
                                videoUrl={publicShare.videoUrl}
                                thumbnailUrl={publicShare.thumbnailUrl}
                                title={publicShare.data.title ?? ""}
                                createdLabel={publicShare.data.createdLabel}
                                createdBy={publicShare.data.createdBy}
                                progress={publicShare.progress}
                                statusText={t(publicShare.data.statusLineKey)}
                            />
                        </Tilt3D>
                    </div>

                    <div className="lg:col-span-4">
                        <Tilt3D className="rounded-3xl" intensity={6}>
                            <ConversionCard
                                canReplay={Boolean(publicShare.videoUrl)}
                                statusLine={t(publicShare.data.statusLineKey)}
                                progress={publicShare.progress}
                                shareUrl={canonicalUrl}
                                onUnlock={openAuth}
                                createdAt={null}
                                variant="light"
                            />
                        </Tilt3D>

                        {/* ✅ Share actions: mobile share sheet + desktop multi */}
                        <div className="mt-4">
                            <ShareActions
                                url={canonicalUrl}
                                title={ogTitle}
                                text={ogDescription}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
