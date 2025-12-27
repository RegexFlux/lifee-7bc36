// components/share/StoryTimeline.tsx
"use client";

import React, {useMemo} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {
    Image as ImageIcon,
    Video as VideoIcon,
    Calendar,
    MapPin,
    Sparkles,
} from "lucide-react";
import {AlbumItem} from "@/lib/db/types";
import {AlbumDto, AlbumItemDto} from "@/types/studioHelp";
import {VideoPlayer} from "@/components/video/VideoPlayer";
import {AssetThumb} from "@/components/asset/AssetThumb";

export type StoryAssetType = "photo" | "video";


function cx(...a: Array<string | false | null | undefined>) {
    return a.filter(Boolean).join(" ");
}

function clampText(s?: string, max = 140) {
    if (!s) return "";
    const t = s.trim();
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + "…";
}

function memoryLabel(m: AlbumItemDto, index: number) {
    const idx = (m.position ?? index) + 1;
    const kind = m.asset.type === "video" ? "Vidéo" : "Photo";
    return `${kind} #${idx}`;
}

export function StoryTimeline(props: {
    album: AlbumDto
}) {
    const reduce = useReducedMotion();

    const items = useMemo(() => {
        // 1) tri par position si dispo, sinon ordre reçu
        const arr = [...(props.album.items || [])];
        arr.sort((a, b) => {
            const pa = a.position ?? Number.MAX_SAFE_INTEGER;
            const pb = b.position ?? Number.MAX_SAFE_INTEGER;
            if (pa !== pb) return pa - pb;
            return 0;
        });
        return arr;
    }, [props.album.items]);

    const grouped = useMemo(() => {
        // Group par chapter si présent, sinon un seul groupe
        const hasChapters = items.some((m) => !!m.asset.year);
        if (!hasChapters) return [{key: "all", title: null as string | null, items}];

        const map = new Map<number, AlbumItemDto[]>();
        for (const m of items) {
            const k = m.asset.year;
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(m);
        }
        return Array.from(map.entries()).map(([k, v]) => ({key: k, title: k, items: v}));
    }, [items]);

    return (
        <section className="relative">
            <div className="mb-6">
                <div className="flex items-center gap-2 text-stone-900">
                    <Sparkles className="h-4 w-4"/>
                    <h2 className="text-xl md:text-2xl font-serif"> {props.album.title || "L’histoire, scène par scène"} </h2>
                </div>
                <p className="text-stone-500 mt-1">
                    Les souvenirs utilisés pour construire le film, dans l’ordre de narration.
                </p>
            </div>

            <div className="relative">
                {/* rail vertical */}
                <div
                    aria-hidden
                    className="absolute left-[17px] top-0 bottom-0 w-px bg-gradient-to-b from-stone-200 via-stone-300 to-transparent"
                />

                <div className="space-y-10">
                    {grouped.map((g) => (
                        <div key={g.key} className="space-y-32">
                            {g.title ? (
                                <div className="sticky top-0 z-10 -mx-2 px-2 py-2">
                                    <div
                                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 backdrop-blur px-3 py-1 shadow-sm">
                                        <span className="h-1.5 w-1.5 rounded-full bg-stone-900"/>
                                        <span className="text-xs font-extrabold tracking-wide text-stone-800">
                      {g.title}
                    </span>
                                    </div>
                                </div>
                            ) : null}

                            <AnimatePresence initial={false}>
                                {g.items.map((m, i) => (
                                    <TimelineRow
                                        key={m.id}
                                        albumItem={m}
                                        index={i}
                                        reduceMotion={reduce ?? true}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TimelineRow({
                         albumItem,
                         index,
                         reduceMotion,
                     }: {
    albumItem: AlbumItemDto;
    index: number;
    reduceMotion: boolean;
}) {
    const icon =
        albumItem.asset.type === "video" ? (
            <VideoIcon className="h-4 w-4"/>
        ) : (
            <ImageIcon className="h-4 w-4"/>
        );

    const hasThumb = !!albumItem.thumbnailUrl;
    const mediaLabel = memoryLabel(albumItem, index);
    const dateLabel = `${albumItem.asset.month}/${albumItem.asset.year}`


    return (
        <motion.article
            initial={reduceMotion ? false : {opacity: 0, y: 10}}
            animate={reduceMotion ? undefined : {opacity: 1, y: 0}}
            exit={reduceMotion ? undefined : {opacity: 0, y: 10}}
            transition={{duration: 0.35, ease: "easeOut"}}
            className="relative pl-12"
        >
            {/* node */}
            <div className="absolute left-0 top-4">
                <div className="relative">
                    <div
                        className="h-9 w-9 rounded-full bg-white border border-stone-200 shadow-sm grid place-items-center">
                        <span
                            className="inline-flex absolute -top-8 transform scale-75 -translate-x-1 h-max items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-700 shadow-4xl">
                    <Calendar className="h-3.5 w-3.5"/>
                            {dateLabel}
                  </span>
                        <div className="h-6 w-6 rounded-full bg-stone-900 text-white grid place-items-center">
                            {icon}
                        </div>
                    </div>
                </div>
            </div>

            {/* card */}
            <div
                className={cx(
                    "group w-full md:w-96 transform -translate-y-1/3 md:-translate-y-1/3 rounded-2xl backdrop-blur",
                    "shadow-sm hover:shadow-md transition-shadow",
                )}
            >
                <div className="grid grid-cols-1">
                    {/* media */}
                    <div className="relative bg-stone-100">
                        <div
                            className="absolute inset-0 pointer-events-none opacity-[0.45] bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.10),transparent_55%)]"/>
                        <AssetThumb assetId={albumItem.asset.id} type={albumItem.asset.type}/>
                        {hasThumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <div
                                className="h-24 absolute -top-[20%] right-4 w-max rounded-xl">

                                <img
                                    src={albumItem.thumbnailUrl}
                                    alt={albumItem.asset.title ? `Aperçu: ${albumItem.asset.title}` : "Aperçu du souvenir"}
                                    className="h-full w-auto object-contain rounded-xl shadow-2xl"
                                    loading="lazy"
                                />
                            </div>
                        ) : (
                            <div className="h-44 md:h-full w-full grid place-items-center">
                                <div className="text-stone-400 flex items-center gap-2">
                                    {icon}
                                    <span className="text-xs font-bold">{mediaLabel}</span>
                                </div>
                            </div>
                        )}

                        {/* pill type */}
                        <div className="absolute left-3 top-3">
                            <div
                                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/85 backdrop-blur px-3 py-1 shadow-sm">
                                <span className="text-[11px] font-extrabold text-stone-800">{mediaLabel}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* hover sheen */}
                <div
                    aria-hidden
                    className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-stone-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                />
            </div>
        </motion.article>
    );
}
