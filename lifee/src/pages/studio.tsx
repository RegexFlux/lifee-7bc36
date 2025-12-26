// File: pages/studio/index.tsx
import React from "react";
import {useViewer} from "@/lib/auth/useViewer";
import Head from "next/head";
import {StudioOpening} from "@/oldComponents/effects/StudioOpening";

export default function StudioPage() {
    const {viewer, loading, error, refresh} = useViewer();

    if (loading) return <div style={{padding: 24}}>Loading viewer…</div>;

    if (error || !viewer) {
        return (
            <div style={{padding: 24}}>
                <div style={{marginBottom: 12}}>Viewer error.</div>
                <button onClick={refresh}>Retry</button>
            </div>
        );
    }

    const isGuest = viewer.user.type === "guest";

    return (
        <>
            <Head>
                <title>Lifee — Générateur de Vidéo IA Cinématique</title>
                <meta
                    name="description"
                    content="Transformez vos images fixes en vidéos animées de qualité studio. Idéal pour le e-commerce, le luxe et les créatifs."
                />
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
            </Head>
            <StudioOpening
                forceOpen={true}
                onDone={() => {
                    window.dispatchEvent(new Event("lifee:sidebar-settled"));
                }}
            />
            <StudioApp/>
        </>
    );
}
