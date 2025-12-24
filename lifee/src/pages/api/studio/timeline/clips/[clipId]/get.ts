import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";

import {db} from "@/lib/db/index";
import {requireUserId} from "../../../_auth";
import {studioAssets, timelineClips} from "@/lib/db/schema.studio";
import {presignGet} from "@/lib/s3";
import {lifeeJobEvents, lifeeJobs} from "@/lib/db/schema";

function isHttpUrl(v: string) {
    return v.startsWith("http://") || v.startsWith("https://");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const assetId = String(req.query.clipId || "");
    if (!assetId) return res.status(400).send("Missing clipId");

    if (req.method !== "GET") return res.status(405).send("Method not allowed");

    const rows = await db
        .select({
            clipId: timelineClips.id,
            assetId: studioAssets.id,
            assetType: studioAssets.type,
            fileKey: studioAssets.fileKey,
        })
        .from(timelineClips)
        .innerJoin(studioAssets, eq(timelineClips.assetId, studioAssets.id))
        .where(and(eq(timelineClips.id, assetId), eq(studioAssets.userId, userId)));

    const row = rows[0];
    if (!row) return res.status(404).send("Clip not found");
    if (!row.fileKey) return res.status(400).send("Asset has no fileUrl");

    const fileUrl = row.fileKey ? await presignGet(row.fileKey) : undefined;
    console.log("fileUrl", fileUrl);

    const lastJobStatus = await db.query.lifeeJobs.findFirst({
        where: eq(lifeeJobs.videoKey, row.fileKey)
    });


    return res.status(200).json({
        clipId: row.clipId,
        assetId: row.assetId,
        type: row.assetType,
        url: fileUrl,
        lastJobStatus: lastJobStatus?.status,
        progress: lastJobStatus?.progress
    });
}