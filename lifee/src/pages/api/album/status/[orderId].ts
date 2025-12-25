import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {requireUserId} from "@/pages/api/studio/_auth";
import {albumOrderItems, albumOrders} from "@/lib/db/schema.album";
import {exportJobs} from "@/lib/db/schema.studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});

    const orderId = String(req.query.orderId || "");
    if (!orderId) return res.status(400).json({error: "Missing orderId"});

    const [order] = await db.select().from(albumOrders).where(and(eq(albumOrders.id, orderId), eq(albumOrders.userId, userId)));
    if (!order) return res.status(404).json({error: "Not found"});

    const items = await db.select({status: albumOrderItems.status}).from(albumOrderItems).where(eq(albumOrderItems.orderId, orderId));
    const total = items.length;
    const done = items.filter((x) => x.status === "succeeded").length;
    const failed = items.filter((x) => x.status === "failed").length;

    let exportState: any = null;
    if (order.exportJobId) {
        const [job] = await db
            .select({status: exportJobs.status, progress: exportJobs.progress, url: exportJobs.url})
            .from(exportJobs)
            .where(and(eq(exportJobs.id, order.exportJobId), eq(exportJobs.userId, userId)));
        exportState = job ?? null;
    }

    return res.status(200).json({
        orderId: order.id,
        status: order.status,
        requiredCredits: order.requiredCredits,
        finalUrl: order.finalUrl ?? null,
        videos: {total, done, failed},
        export: exportState,
        error: order.error ?? null,
    });
}
