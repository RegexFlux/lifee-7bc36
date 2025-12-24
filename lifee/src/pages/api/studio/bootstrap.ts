// pages/api/studio/bootstrap.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {asc, desc, eq, inArray, and} from "drizzle-orm";

import {db} from "@/lib/db";
import {requireUserId} from "./_auth";
import {musicTracks, studioAssets, timelineClips} from "@/lib/db/schema.studio";
import {appUsers} from "@/lib/db/schema.auth";
import {presignGet} from "@/lib/s3";
import {lifeeJobs} from "@/lib/db/schema";
import {Asset} from "@/types/studio";

type BootstrapOk = {
    credits: number;
    library: Array<Asset>;
    timeline: Array<Asset & {
        source: "library" | "generated";
    }>;
    musicPresets: Array<{
        id: string;
        title: string;
        duration: string;
        genre: string;
        previewUrl?: string | null;
    }>;
};

function toMMYYYY(month: number, year: number) {
    // tes assets stockent month=1..12
    return `${String(month).padStart(2, "0")}/${year}`;
}

async function presignMany(keys: Array<string | null | undefined>, expiresSec?: number) {
    const uniq = Array.from(new Set(keys.filter(Boolean) as string[]));
    const map = new Map<string, string>();

    // simple parallel (si tu veux limiter, je te mets un p-limit maison)
    await Promise.all(
        uniq.map(async (k) => {
            map.set(k, await presignGet(k, expiresSec));
        })
    );

    return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BootstrapOk | { error: string }>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    try {
        // ✅ credits
        const [user] = await db.select({credits: appUsers.credits}).from(appUsers).where(eq(appUsers.id, userId));
        const credits = user?.credits ?? 0;

        // ✅ library + timeline rows
        const [libraryRows, clipRows, musicPresets] = await Promise.all([
            db.select().from(studioAssets).where(eq(studioAssets.userId, userId)).orderBy(desc(studioAssets.createdAt)),
            db.select().from(timelineClips).where(eq(timelineClips.userId, userId)).orderBy(asc(timelineClips.position)),
            db.select().from(musicTracks).where(eq(musicTracks.isActive, true)),
        ]);

        // ✅ timeline assets batch par IDs utilisés
        const assetIds = clipRows.map((c) => c.assetId);
        const assetsForTimeline =
            assetIds.length === 0
                ? []
                : await db
                    .select()
                    .from(studioAssets)
                    .where(and(eq(studioAssets.userId, userId), inArray(studioAssets.id, assetIds)));

        const assetsMap = new Map(assetsForTimeline.map((a) => [a.id, a]));

        // ✅ presign batch (thumb + file)
        const allThumbKeys: (string | null | undefined)[] = [];
        const allFileKeys: (string | null | undefined)[] = [];

        for (const a of libraryRows) {
            allThumbKeys.push(a.thumbnailKey ?? null);
            allFileKeys.push(a.fileKey ?? null);
        }
        for (const a of assetsForTimeline) {
            allThumbKeys.push(a.thumbnailKey ?? null);
            allFileKeys.push(a.fileKey ?? null);
        }

        const [thumbUrlMap, videoUrlMap] = await Promise.all([presignMany(allThumbKeys), presignMany(allFileKeys)]);

        // ✅ last job status en batch (pour les vidéos seulement)
        const videoKeys = libraryRows.filter((a) => a.type === "video").map((a) => a.fileKey).filter(Boolean) as string[];

        const jobRows =
            videoKeys.length === 0
                ? []
                : await db
                    .select({
                        videoKey: lifeeJobs.videoKey,
                        status: lifeeJobs.status,
                        progress: lifeeJobs.progress,
                        updatedAt: lifeeJobs.updatedAt,
                    })
                    .from(lifeeJobs)
                    .where(inArray(lifeeJobs.videoKey, videoKeys))
                    .orderBy(desc(lifeeJobs.updatedAt));

        // map latest per videoKey
        const latestJobByVideoKey = new Map<string, { status: string; progress: number | null }>();
        for (const j of jobRows) {
            const key = j.videoKey ?? "";
            if (!key) continue;
            if (!latestJobByVideoKey.has(key)) {
                latestJobByVideoKey.set(key, {status: j.status, progress: j.progress ?? null});
            }
        }

        // ✅ build timeline
        const timeline: BootstrapOk["timeline"] = clipRows
            .map((c) => {
                const a = assetsMap.get(c.assetId);
                if (!a) return null;

                const thumbnailUrl = a.thumbnailKey ? thumbUrlMap.get(a.thumbnailKey) : undefined;
                const videoUrl = a.fileKey ? videoUrlMap.get(a.fileKey) : undefined;

                return {
                    id: c.id,
                    assetId: a.id,
                    type: a.type as "image" | "video",
                    title: a.title,
                    date: toMMYYYY(a.month, a.year),
                    duration: a.durationSec ? `${a.durationSec}s` : undefined,
                    thumbnailUrl,
                    videoUrl,
                    isGenerated: a.isGenerated ?? false,
                    context: (c.context ?? a.context) ?? undefined,
                    source: (c.source as "library" | "generated") ?? "library",
                };
            })
            .filter(Boolean) as BootstrapOk["timeline"];

        // ✅ build library
        const library: BootstrapOk["library"] = libraryRows.map((a) => {
            const thumbnailUrl = a.thumbnailKey ? thumbUrlMap.get(a.thumbnailKey) : undefined;
            const videoUrl = a.fileKey ? videoUrlMap.get(a.fileKey) : undefined;

            const job = a.type === "video" && a.fileKey ? latestJobByVideoKey.get(a.fileKey) : undefined;

            return {
                id: a.id,
                type: a.type as "image" | "video",
                title: a.title,
                date: toMMYYYY(a.month, a.year),
                duration: a.durationSec ? `${a.durationSec}s` : undefined,
                thumbnailUrl,
                videoUrl,
                isGenerated: a.isGenerated ?? false,
                context: a.context ?? undefined,
                lastJobStatus: job?.status,
                progress: job?.progress ?? undefined,
            };
        });

        return res.status(200).json({
            credits,
            library,
            timeline,
            musicPresets: musicPresets.map((m) => ({
                id: m.id,
                title: m.title,
                duration: m.duration,
                genre: m.genre,
                previewUrl: m.previewUrl ?? null,
            })),
        });
    } catch (e: any) {
        return res.status(500).json({error: e?.message || "Bootstrap failed"});
    }
}
