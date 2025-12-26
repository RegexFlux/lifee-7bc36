// src/lib/replicate/jobEvents.ts
import crypto from "crypto";
import {replicateGenerationJobEvents} from "@/lib/db/schema";

type Insertable = {
    insert: (table: any) => { values: (v: any) => Promise<any> };
};

// db et tx Drizzle ont tous deux .insert().values()
export type DbOrTx = Insertable;

export type JobEventLevel = "info" | "warn" | "error" | "success";
export type JobEventSource = "server" | "replicate";

export async function logReplicateJobEvent(
    dbOrTx: DbOrTx,
    params: { generationId: string; status: JobEventLevel; source: JobEventSource; message: string }
) {
    await dbOrTx.insert(replicateGenerationJobEvents).values({
        id: crypto.randomUUID(),
        replicateGenerationJobId: params.generationId,
        status: params.status,
        source: params.source,
        message: params.message,
    });
}
