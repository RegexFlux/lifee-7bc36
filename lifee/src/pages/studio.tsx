import React, {useEffect, useMemo, useRef, useState} from "react";
import Head from "next/head";
import {useRouter} from "next/router";

import {fetchJson, HttpError} from "@/components/landing/interactiveDemo/utils";
import {StudioOpening} from "@/oldComponents/effects/StudioOpening";

type AlbumMode = "studio_help" | "studio_pro";

type Album = {
    id: string;
    title: string;
    mode: AlbumMode;
    createdAt: string;
    updatedAt: string;
};

type AlbumsResponse = { albums: Album[] };

// Choix “actif” :
// - si albumId présent dans l’URL => prendre celui-là si existe
// - sinon => le plus récent (déjà trié par API), donc [0]
function pickActiveAlbum(albums: Album[], albumId?: string | string[] | null) {
    const id = Array.isArray(albumId) ? albumId[0] : albumId;
    if (id) {
        const found = albums.find((a) => a.id === id);
        if (found) return found;
    }
    return albums[0] ?? null;
}

function routeForAlbum(a: Album) {
    // routes cibles : adapte si tu as choisi d’autres paths
    if (a.mode === "studio_pro") return `/studio/pro?albumId=${encodeURIComponent(a.id)}`;
    return `/studio/welcome?albumId=${encodeURIComponent(a.id)}`;
}

export default function StudioIndexPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const redirectedRef = useRef(false);

    const qsAlbumId = useMemo(() => {
        if (!router.isReady) return null;
        const v = router.query.albumId;
        return Array.isArray(v) ? v[0] : v || null;
    }, [router.isReady, router.query.albumId]);

    useEffect(() => {
        if (!router.isReady) return;
        if (redirectedRef.current) return;

        (async () => {
            setLoading(true);
            setErr(null);

            try {
                const data = await fetchJson<AlbumsResponse>("/api/albums?limit=25", {method: "GET"});

                const active = pickActiveAlbum(data.albums || [], qsAlbumId);
                if (!active) {
                    // Si aucun album => on crée généralement un album automatiquement côté /welcome.
                    // Ici on redirige simple vers welcome (qui pourra créer un album si besoin).
                    redirectedRef.current = true;
                    await router.replace("/studio/welcome");
                    return;
                }

                const to = routeForAlbum(active);
                redirectedRef.current = true;
                await router.replace(to);
            } catch (e: any) {
                if (e instanceof HttpError && (e.status === 401 || e.status === 403)) {
                    // Normal si session pas créée? Mais ton requireViewer crée un guest normalement.
                    // On retente une fois après un petit tick (sans spam).
                    setErr("Auth required.");
                } else {
                    setErr(e?.message || "Failed to load studio.");
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [router.isReady, router, qsAlbumId]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50">
            <Head>
                <title>Lifee — Studio</title>
                <meta name="robots" content="noindex,nofollow"/>
            </Head>

            <StudioOpening
                forceOpen={true}
                onDone={() => {
                    window.dispatchEvent(new Event("lifee:sidebar-settled"));
                }}
            />
        </div>
    );
}
