export type DemoState = "idle" | "analyzing" | "generating" | "success" | "failed";

export type LifeeJobStatus = "uploading" | "queued" | "starting" | "processing" | "succeeded" | "failed";

export type JobStatusResponse = {
    id: string;
    shareUrl: string;
    status: LifeeJobStatus;
    progress: number;
    message: string | null;
    error: string | null;

    videoUrl: string | null;
    thumbnailUrl: string | null;
    videoSource: "s3" | "replicate" | null;

    createdAt: string | Date;
    events: { at: string | Date; type: string; message: string }[];
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
