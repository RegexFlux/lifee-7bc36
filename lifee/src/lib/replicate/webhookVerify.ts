// src/lib/replicate/webhookVerify.ts
import crypto from "node:crypto";

function timingSafeEq(a: string, b: string) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

export function verifyReplicateWebhook(params: {
    rawBody: string;
    webhookId?: string;
    webhookTimestamp?: string;
    webhookSignature?: string;
    toleranceSec?: number;
}) {
    const {rawBody, webhookId, webhookTimestamp, webhookSignature} = params;
    const toleranceSec = params.toleranceSec ?? 300;

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
        return {ok: false as const, reason: "Missing webhook headers"};
    }

    const ts = Number(webhookTimestamp);
    if (!Number.isFinite(ts)) return {ok: false as const, reason: "Invalid timestamp"};

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > toleranceSec) {
        return {ok: false as const, reason: "Timestamp outside tolerance"};
    }

    const secret = process.env.REPLICATE_WEBHOOK_SIGNING_SECRET || "";
    if (!secret.startsWith("whsec_")) return {ok: false as const, reason: "Missing signing secret"};

    const keyB64 = secret.slice("whsec_".length);
    const key = Buffer.from(keyB64, "base64");

    const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`; // doc :contentReference[oaicite:3]{index=3}
    const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

    // header: "v1,.... v1,...."
    const parts = webhookSignature.split(" ").map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
        const [ver, sig] = p.split(",");
        if (!ver || !sig) continue;
        if (ver !== "v1") continue;
        if (timingSafeEq(sig, expected)) return {ok: true as const};
    }

    return {ok: false as const, reason: "Signature mismatch"};
}
