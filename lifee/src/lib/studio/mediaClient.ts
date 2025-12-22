export async function getVideoDurationSeconds(file: File): Promise<number> {
    const url = URL.createObjectURL(file);
    try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.src = url;

        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error("Video metadata error"));
        });

        const d = Number(video.duration);
        if (!Number.isFinite(d) || d <= 0) return 0;
        return d;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export async function captureVideoThumbnailFile(
    file: File,
    opts?: { atSeconds?: number; width?: number; quality?: number }
): Promise<File | null> {
    const atSeconds = opts?.atSeconds ?? 0.1;
    const width = opts?.width ?? 360;
    const quality = opts?.quality ?? 0.82;

    const url = URL.createObjectURL(file);
    try {
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.src = url;

        await new Promise<void>((resolve, reject) => {
            video.onloadeddata = () => resolve();
            video.onerror = () => reject(new Error("Video load error"));
        });

        const safeTime = Math.min(Math.max(0, atSeconds), Math.max(0, video.duration - 0.05));
        video.currentTime = safeTime;

        await new Promise<void>((resolve, reject) => {
            video.onseeked = () => resolve();
            video.onerror = () => reject(new Error("Video seek error"));
        });

        const ratio = video.videoWidth / Math.max(1, video.videoHeight);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = Math.max(1, Math.round(width / Math.max(0.1, ratio)));

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
        });

        if (!blob) return null;
        return new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function secondsToShortLabel(sec: number): string {
    if (!Number.isFinite(sec) || sec <= 0) return "";
    return `${Math.round(sec)}s`;
}
