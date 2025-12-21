import { replicate, getKlingVersionId } from "@/lib/replicate"; // ton wrapper live existant
import { defaultLifeePrompt } from "@/lib/replicate";
import type { NextApiRequest } from "next";

export type ProviderMode = "live" | "mock";

export function getProviderMode(): ProviderMode {
    return (process.env.REPLICATE_MODE || "live") === "mock" ? "mock" : "live";
}

export function guardNoLiveInDev() {
    const allow = (process.env.REPLICATE_ALLOW_LIVE || "false").toLowerCase() === "true";
    if (!allow && process.env.NODE_ENV !== "production") {
        throw new Error("Live Replicate disabled (set REPLICATE_ALLOW_LIVE=true to enable).");
    }
}

export function mockVideoAbsoluteUrl(req: NextApiRequest) {
    const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
    const rel = process.env.MOCK_VIDEO_URL || "/examples/demo1/video.mp4";
    // si APP_URL est défini, parfait; sinon fallback request host
    if (appUrl) return `${appUrl}${rel}`;
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}${rel}`;
}

export async function createPredictionLive(params: {
    startImageBuffer: Buffer;
    prompt?: string;
    webhookUrl: string;
}) {
    guardNoLiveInDev();

    const version = await getKlingVersionId();
    const input: Record<string, unknown> = {
        prompt: params.prompt ?? defaultLifeePrompt(),
        start_image: params.startImageBuffer,
        duration: 3,
        aspect_ratio: "16:9",
    };

    return replicate.predictions.create({
        version,
        input,
        webhook: params.webhookUrl,
        webhook_events_filter: ["start", "logs", "completed"],
    });
}
