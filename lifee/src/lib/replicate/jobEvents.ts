// src/lib/replicate/jobEvents.ts
import crypto from "node:crypto";
import {db} from "@/lib/db";
import {replicateGenerationJobEvents} from "@/lib/db/schema";
import {PgTransaction} from "drizzle-orm/pg-core";


export type JobEventLevel = "info" | "warn" | "error";
export type JobEventSource = "server" | "replicate";

export async function logReplicateJobEvent(
    tx: PgTransaction<any, any, any>,
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
