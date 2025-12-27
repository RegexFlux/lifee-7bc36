import React, {useEffect, useRef, useState} from "react";
import Head from "next/head";
import {useRouter} from "next/router";
import {Loader2} from "lucide-react";
import {fetchJson} from "@/components/landing/interactiveDemo/utils";
import type {AlbumDto} from "@/types/studioHelp";

type AlbumsResp = { albums: AlbumDto[] };
type CreateAlbumResp = { album: AlbumDto };

function routeForAlbum(a: AlbumDto) {
    if (a.mode === "studio_pro") return `/studio/albums/${encodeURIComponent(a.id)}/pro`;
    return `/studio/albums/${encodeURIComponent(a.id)}/help/welcome`;
}

export default function StudioIndex() {
    const router = useRouter();
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const redirected = useRef(false);

    useEffect(() => {
        if (!router.isReady) return;
        if (redirected.current) return;

        (async () => {
            setLoading(true);
            setErr(null);

            try {
                const data = await fetchJson<AlbumsResp>("/api/albums?limit=25", {method: "GET"});
                let album = data.albums?.[0] ?? null;

                if (!album) {
                    const created = await fetchJson<CreateAlbumResp>("/api/albums", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({title: "Untitled"}),
                    });
                    album = created.album;
                }

                redirected.current = true;
                await router.replace(routeForAlbum(album));
            } catch (e: any) {
                setErr(e?.message || "Failed to open studio");
            } finally {
                setLoading(false);
            }
        })();
    }, [router.isReady, router]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50">
            <Head>
                <title>Lifee — Studio</title>
                <meta name="robots" content="noindex,nofollow"/>
            </Head>

            <div className="mx-auto max-w-3xl px-6 py-16">
                <div className="rounded-3xl border border-stone-200 bg-white/80 backdrop-blur shadow-sm p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl border border-stone-200 bg-white grid place-items-center">
                            <Loader2 className={loading ? "animate-spin" : ""} size={18}/>
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-black text-stone-900">Ouverture du Studio…</div>
                            <div
                                className="mt-0.5 text-xs text-stone-500">{loading ? "Chargement" : err ? "Erreur" : "OK"}</div>
                        </div>
                    </div>
                    {err ? (
                        <div
                            className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                            {err}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
