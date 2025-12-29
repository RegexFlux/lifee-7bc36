import {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    ChangeMessageVisibilityCommand
} from "@aws-sdk/client-sqs";
import {sql, eq} from "drizzle-orm";
import {db} from "@/lib/db/index";
import {exportJobs} from "@/lib/db/schema";
import {renderAlbumExport} from "@/lib/exports/renderAlbumExport";

const region = process.env.LIFEE_AWS_REGIONS;
const queueUrl = process.env.LIFEE_EXPORT_QUEUE_URL;

if (!region) throw new Error("Missing LIFEE_AWS_REGIONS");
if (!queueUrl) throw new Error("Missing LIFEE_EXPORT_QUEUE_URL");

const sqs = new SQSClient({region});

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? "1");
const HEARTBEAT_SEC = Number(process.env.EXPORT_VISIBILITY_HEARTBEAT_SEC ?? "30");

async function claimJob(exportJobId: string) {
    const r = await db.execute(sql`
        UPDATE "export_jobs"
        SET "status"     = 'rendering',
            "progress"   = 1,
            "updated_at" = now()
        WHERE "id" = ${exportJobId}
          AND "status" = 'queued' RETURNING "id"
    `);

    // drizzle driver dependent
    const rows = (r as any)?.rows ?? r;
    return rows?.[0]?.id ? exportJobId : null;
}

async function markError(exportJobId: string, e: any) {
    await db.update(exportJobs).set({
        status: "error",
        errorMessage: e?.message || "Export failed",
        updatedAt: new Date(),
    }).where(eq(exportJobs.id, exportJobId));
}

async function processOneMessage(msg: { Body?: string; ReceiptHandle?: string }) {
    const receipt = msg.ReceiptHandle;
    if (!receipt) return;

    const body = JSON.parse(msg.Body || "{}");
    const exportJobId = (body.exportJobId as string | undefined)?.trim();
    if (!exportJobId) {
        // message invalide => on delete pour ne pas boucler
        await sqs.send(new DeleteMessageCommand({QueueUrl: queueUrl!, ReceiptHandle: receipt}));
        return;
    }

    // heartbeat visibility (évite reprocessing si job long)
    let hb: NodeJS.Timeout | null = null;
    hb = setInterval(async () => {
        try {
            await sqs.send(new ChangeMessageVisibilityCommand({
                QueueUrl: queueUrl!,
                ReceiptHandle: receipt,
                VisibilityTimeout: Math.max(60, HEARTBEAT_SEC * 3),
            }));
        } catch { /* ignore */
        }
    }, HEARTBEAT_SEC * 1000);

    try {
        const claimed = await claimJob(exportJobId);
        if (!claimed) {
            // pas queued (déjà pris / done / error) => delete le message
            await sqs.send(new DeleteMessageCommand({QueueUrl: queueUrl!, ReceiptHandle: receipt}));
            return;
        }

        await renderAlbumExport({exportJobId: claimed});

        // succès => delete message
        await sqs.send(new DeleteMessageCommand({QueueUrl: queueUrl!, ReceiptHandle: receipt}));
    } catch (e: any) {
        await markError(exportJobId, e);
        // on NE delete PAS : SQS retry puis DLQ
        throw e;
    } finally {
        if (hb) clearInterval(hb);
    }
}

async function loop() {
    while (true) {
        const r = await sqs.send(new ReceiveMessageCommand({
            QueueUrl: queueUrl!,
            MaxNumberOfMessages: Math.min(10, CONCURRENCY),
            WaitTimeSeconds: 20, // long polling
            VisibilityTimeout: 60 * 10, // base: 10 min (heartbeat prolonge)
        }));

        const messages = r.Messages ?? [];
        if (!messages.length) continue;

        // petite concurrence contrôlée
        const batch = messages.slice(0, CONCURRENCY).map((m) => processOneMessage(m));
        await Promise.allSettled(batch);
    }
}

loop().catch((e) => {
    console.error("Worker crashed:", e);
    process.exit(1);
});
