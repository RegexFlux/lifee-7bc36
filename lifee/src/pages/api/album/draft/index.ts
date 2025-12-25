import type {NextApiRequest, NextApiResponse} from "next";
import {and, asc, desc, eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {albumDraftItems, albumDrafts} from "@/lib/db/schema.album";
import {studioAssets} from "@/lib/db/schema.studio";
import {presignGet} from "@/lib/s3";
import {recommendPacks} from "@/lib/album/packs.server";
import {importJobToLibrary} from "@/lib/studio/importJobToLibrary";
import {lifeeJobs} from "@/lib/db/schema";

type DraftStatus = 'draft' | 'paid' | 'archived';

type DraftItemDTO = {
    assetId: string;
    title: string;
    position: number;
    thumbnailUrl?: string;
    video?: string;
    type: 'video' | 'image';
};

type DraftDTO = {
    draftId: string;
    status: DraftStatus;
    items: DraftItemDTO[];
    requiredCredits: number;
    quote: ReturnType<typeof recommendPacks>;
};

async function presignMany(keys: string[]) {
    const uniq = Array.from(new Set(keys.filter(Boolean)));
    const map = new Map<string, string>();
    await Promise.all(uniq.map(async (k) => map.set(k, await presignGet(k))));
    return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DraftDTO | { error: string }>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});

    // draft actif = plus récent
    let [draft] = await db
        .select()
        .from(albumDrafts)
        .where(eq(albumDrafts.userId, userId))
        .orderBy(desc(albumDrafts.updatedAt))
        .limit(1);

    if (draft?.status !== "draft") {
        const [created] = await db.insert(albumDrafts).values({userId, status: "draft"}).returning();
        draft = created;
    }

    const jobId = req.query.jobId as string;
    console.log('req jobId', req.query.jobId, jobId);
    if (jobId) {
        const [existing] = await db
            .select({
                assetId: studioAssets.id,
            })
            .from(studioAssets)
            .leftJoin(
                lifeeJobs,
                eq(studioAssets.fileKey, lifeeJobs.videoKey)
            )
            .where(and(eq(lifeeJobs.id, jobId), eq(studioAssets.userId, userId))); // Use the variable directly
        console.log('existing', existing);
        if (!existing) {
            await importJobToLibrary(userId, jobId);
            const [asset] = await db
                .select({
                    assetId: studioAssets.id,
                })
                .from(studioAssets)
                .innerJoin(lifeeJobs, eq(studioAssets.fileKey, lifeeJobs.videoKey))
                .where(eq(lifeeJobs.id, jobId));

            await db.insert(albumDraftItems).values({
                draftId: draft.id,
                assetId: asset.assetId,
                position: 1,
            });
        }
    }

    const rows = await db
        .select({
            assetId: albumDraftItems.assetId,
            position: albumDraftItems.position,
            title: studioAssets.title,
            thumbnailKey: studioAssets.thumbnailKey,
            videoKey: studioAssets.fileKey,
            type: studioAssets.type,
        })
        .from(albumDraftItems)
        .innerJoin(studioAssets, and(eq(studioAssets.id, albumDraftItems.assetId)))
        .where(eq(albumDraftItems.draftId, draft.id))
        .orderBy(asc(albumDraftItems.position));

    const thumbKeys = rows.map((r) => r.thumbnailKey).filter(Boolean) as string[];
    const thumbMap = await presignMany(thumbKeys);

    const videoKeys = rows.filter(x => x.type === 'video').map((r) => r.videoKey).filter(Boolean) as string[];
    const videoMap = await presignMany(videoKeys);

    const items: DraftItemDTO[] = rows.map((r) => ({
        assetId: r.assetId,
        title: r.title,
        position: r.position,
        thumbnailUrl: r.thumbnailKey ? thumbMap.get(r.thumbnailKey) : undefined,
        videoUrl: r.type === 'video' ? videoMap.get(r.videoKey) : undefined,
        type: r.type as 'video' | 'image',
    }));

    const requiredCredits = items.filter(x => x.type === 'image').length; // 1 photo -> 1 vidéo IA (dans ce flow)
    const quote = recommendPacks(requiredCredits);

    return res.status(200).json({
        draftId: draft.id,
        status: draft.status as DraftStatus,
        items,
        requiredCredits,
        quote,
    });
}
