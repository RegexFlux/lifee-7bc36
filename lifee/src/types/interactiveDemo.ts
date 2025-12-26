export type DemoState = "idle" | "analyzing" | "generating" | "success" | "failed";

export type LifeeJobStatus = "uploading" | "queued" | "starting" | "processing" | "succeeded" | "failed";

export type JobStatusResponse = {
    ok: boolean,
    job: Job,
    signed: {
        "resultUrl": string | null;
        "thumbnailUrl": string | null;
        "expiresInSec": number
    }
}

export type Job = {
    userId: "69576f7a-b026-493a-9744-fdd4f60c7964",
    albumItemId: string | null,
    createdByAssetId: string,
    resultAssetId: string | null,
    "progressMessage": null,
    month: number,
    year: number,
    id: string;
    shareUrl: string;
    status: LifeeJobStatus;
    progress: number;
    error: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
};


export type CreateJobResponse = {
    jobId: string;
    shareUrl: string;
    statusUrl: string;
};

export type LatestDemoResponse = {
    jobId: string | null;
};

export type SendEmailResponse = {
    ok: true;
};
