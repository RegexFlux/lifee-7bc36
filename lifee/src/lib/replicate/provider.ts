import {replicate, getDemoModel, getKlingInput, getWanInput, getKlingModel} from "@/lib/replicate"; // ton wrapper live existant
import { defaultLifeeDemoPrompt } from "@/lib/replicate";
import type { NextApiRequest } from "next";
import * as process from "node:process";
const localtunnel = require("localtunnel");
import {match} from 'ts-pattern';


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
    const rel = process.env.MOCK_VIDEO_URL || "/examples/showcase/result.mp4";
    // si APP_URL est défini, parfait; sinon fallback request host
    if (appUrl) return `${appUrl}${rel}`;
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}${rel}`;
}

export async function createPredictionLive(jobId: string, params: {
    startImageUrl: string;
    prompt?: string;
    negativePrompt?: string;
    aspectRatio?: string;
    version: 'demo' | 'standard' | 'pro';
}) {
    guardNoLiveInDev();

    // const base = process.env.APP_URL;

    const tunnelWeb = await localtunnel({port: 3000});
    tunnelWeb.on('close', () => console.log("closed", tunnelWeb.url));

    const processDuration = process.env["IA-DURATION"];
    const duration = (!processDuration || +processDuration > 5) ? 5 : +processDuration;
    const webhookUrl = `${tunnelWeb.url}/api/webhooks/replicate?jobId=${encodeURIComponent(jobId)}`;
    const {model, input} = match(params.version)
        .with('demo', () => ({
            model: getDemoModel(),
            input: getWanInput(
                params.prompt ?? null,
                params.startImageUrl,
                duration,
                params.aspectRatio,
                params.negativePrompt
            )
        }))
        .otherwise(() => ({
            model: getKlingModel(),
            input: getKlingInput(
                params.prompt ?? null,
                params.startImageUrl,
                duration,
                params.aspectRatio,
                params.negativePrompt,
                params.version as 'pro' | 'standard'
            )
        }))

    console.log('model', await model, input)

    return replicate.predictions.create({
        version: await model,
        input,
        webhook: webhookUrl,
        webhook_events_filter: ["start", "logs", "completed"],
    });
}
