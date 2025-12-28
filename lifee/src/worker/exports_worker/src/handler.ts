// workers/exports-worker/src/handler.ts
import type {SQSHandler} from "aws-lambda";
import {and, eq} from "drizzle-orm";
import {db} from "@/lib/db";
import {exportJobs} from "@/lib/db/schema";
import {renderAlbumExport} from "@/lib/exports/renderAlbumExport";

export const handler: SQSHandler = async (event) => {
    for (const record of event.Records) {
        const {exportJobId} = JSON.parse(record.body) as { exportJobId: string };

        // Claim idempotent (SQS peut livrer 2x)
        const [claimed] = await db
            .update(exportJobs)
            .set({status: "rendering", progress: 1, updatedAt: new Date()})
            .where(and(eq(exportJobs.id, exportJobId), eq(exportJobs.status, "queued")))
            .returning({id: exportJobs.id});

        if (!claimed) continue;

        try {
            await renderAlbumExport({exportJobId});
        } catch (e: any) {
            // Option retry contrôlé = attempts + requeue.
            // Version simple : error terminal
            await db.update(exportJobs).set({
                status: "error",
                errorMessage: e?.message || "Export failed",
                updatedAt: new Date(),
            }).where(eq(exportJobs.id, exportJobId));
            // Ne throw pas si tu veux que le message soit ack (sinon SQS retry en boucle)
        }
    }
};
