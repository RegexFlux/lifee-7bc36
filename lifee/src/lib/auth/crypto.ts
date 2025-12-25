// src/lib/auth/crypto.ts
import crypto from "crypto";

export function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Base64Url(input: string) {
    return crypto.createHash("sha256").update(input).digest("base64url");
}

export function hmacSha256Base64Url(input: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

export function signValue(value: string, secret: string) {
    const sig = hmacSha256Base64Url(value, secret);
    return `${value}.${sig}`;
}

export function verifySignedValue(signed: string, secret: string) {
    const idx = signed.lastIndexOf(".");
    if (idx <= 0) return {ok: false as const, value: ""};
    const value = signed.slice(0, idx);
    const sig = signed.slice(idx + 1);
    const expected = hmacSha256Base64Url(value, secret);
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    return {ok, value};
}
