// src/lib/replicate/jobEvents.ts
import crypto from "crypto";
import {db} from "@/lib/db";
import {replicateGenerationJobEvents} from "@/lib/db/schema";

export type DbTx = typeof db;

export type JobEventLevel = "info" | "warn" | "error";
export type JobEventSource = "server" | "replicate";

export async function logReplicateJobEvent(
    tx: DbTx,
    params: { jobId: string; status: JobEventLevel; source: JobEventSource; message: string }
) {
    await tx.insert(replicateGenerationJobEvents).values({
        id: crypto.randomUUID(),
        replicateGenerationJobId: params.jobId,
        status: params.status,
        source: params.source,
        message: params.message,
    });
}
