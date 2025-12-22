import type { NextApiRequest, NextApiResponse } from "next";

import { db } from "@/lib/db";
import { requireUserId } from "../_auth";
import {studioAssets} from "@/lib/db/schema.studio";

function parseMMYYYY(date: string) {
    const [mm, yyyy] = date.split("/");
    const month = Number(mm);
    const year = Number(yyyy);
    if (!Number.isFinite(month) || month < 1 || month > 12) throw new Error("Invalid month");
    if (!Number.isFinite(year) || year < 1970 || year > 3000) throw new Error("Invalid year");
    return { month, year };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const body = req.body as {
        title: string;
        type: "image" | "video";
        date: string; // "MM/YYYY"
        duration?: string;
        thumbnailUrl?: string;
        fileUrl?: string;
    };

    if (!body?.title || !body?.type || !body?.date) return res.status(400).send("Missing fields");

    if (!body.fileUrl) return res.status(400).send("Missing fileUrl");

    const thumbnailUrl = body.thumbnailUrl ?? (body.type === "image" ? body.fileUrl : undefined);

    const { month, year } = parseMMYYYY(body.date);
    const durationSec = body.type === "video" && body.duration ? Number(body.duration.replace("s", "")) : null;

    const [created] = await db
        .insert(studioAssets)
        .values({
            userId,
            title: body.title,
            type: body.type,
            month,
            year,
            durationSec: durationSec && Number.isFinite(durationSec) ? durationSec : null,
            thumbnailUrl: thumbnailUrl,
            fileUrl: body.fileUrl ?? null,
            isGenerated: false,
        })
        .returning();

    res.status(200).json({
        id: created.id,
        type: created.type,
        title: created.title,
        date: body.date,
        duration: created.durationSec ? `${created.durationSec}s` : undefined,
        thumbnailUrl: created.thumbnailUrl ?? undefined,
        fileUrl: created.fileUrl ?? undefined, // ✅ important
        isGenerated: created.isGenerated ?? false,
    });

}
