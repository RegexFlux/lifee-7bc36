import { NextResponse } from "next/server";
import { getJson, keys, presignVideoUrl } from "@/lib/s3";

export const runtime = "nodejs";

type JobRecord = {
    id: string;
    status: "queued" | "generating" | "ready" | "failed";
    createdAt: string;
    replicateId?: string;
    error?: string;
    shareUrl?: string;
    videoKey?: string;
};

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const job = await getJson<JobRecord>(keys.job(params.id));
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let playbackUrl: string | undefined;
    if (job.status === "ready") {
        playbackUrl = await presignVideoUrl(job.id);
    }

    return NextResponse.json({
        ...job,
        playbackUrl,
    });
}
