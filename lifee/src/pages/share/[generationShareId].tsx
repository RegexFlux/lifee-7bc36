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

const FXBackdrop = dynamic(() => import("@/components/animations/fx/FXBackdrop"), {ssr: false});

/**
 * Public page (no viewer required).
 * Access is controlled by generation_shares: isActive=true & revokedAt=null.
 */
export const getServerSideProps: GetServerSideProps<{
    generationShareId: string;
}> = async (ctx) => {
    const generationShareId = String(ctx.params?.generationShareId || "").trim();
    if (!generationShareId) return {notFound: true};
    return {
        props: {
            generationShareId,
        },
    };
};


export default function SharedMemorySlugPage({
                                                 generationShareId
                                             }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();

    const openAuth = React.useCallback(() => {
        router.push(
            {pathname: router.pathname, query: {...router.query, auth: "1"}},
            undefined,
            {shallow: true}
        );
    }, [router]);

    const showAuthModal = React.useCallback(() => {
        router.push({query: {...router.query, auth: "1"}}, undefined, {shallow: true});
    }, [router]);

    const publicShare = usePublicShare({
        generationShareId
    });

    const {t} = useT();

    return (
        <div
            className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50 text-stone-900 relative overflow-hidden">
            <FXBackdrop/>
            <StarDustRain/>

            <Head>
                <title>Lifee — Visionnage</title>
                <meta name="robots" content="noindex,nofollow"/>
                <meta name="theme-color" content="#fafaf9"/>
            </Head>

            {/* Auth (pour “Sauvegarder / Export / Studio”) */}
            <AuthModal/>

            {/* Décor de fond */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl"/>
                <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl"/>
                {/* ⚠️ évite les URLs externes en prod si tu veux zéro dépendance */}
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
                                title={publicShare.data.title ?? ''}
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
                                shareUrl={publicShare.data.shareUrl}
                                onUnlock={openAuth} // CTA: “Sauvegarder / Export / Share”
                                createdAt={null}
                                variant="light"
                            />
                        </Tilt3D>

                        <div
                            className="mt-8 rounded-2xl border border-stone-200 bg-white/70 shadow-sm backdrop-blur p-5">
                            <div className="text-sm font-semibold text-stone-900">Un lien simple. Une émotion intacte.
                            </div>
                            <div className="mt-1 text-xs text-stone-500">
                                Pour sauvegarder, exporter en HD, et créer un album : passez au Studio.
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-[11px] font-mono text-stone-500">privé • stable • HD</div>
                                <button
                                    onClick={openAuth}
                                    className="text-xs font-bold text-stone-900 underline underline-offset-2 hover:text-stone-700"
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
