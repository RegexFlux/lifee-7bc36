// components/lifee/types.ts
export type LifeeStatusResp = {
    id: string;
    shareUrl: string;
    status: string;
    progress?: number;
    message?: string;
    error?: string;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    videoSource?: "s3" | "replicate" | "mock" | null;
    createdAt: string;
};
