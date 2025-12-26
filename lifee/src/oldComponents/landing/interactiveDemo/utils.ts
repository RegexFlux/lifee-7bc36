export function safeFirstString(v: unknown): string | null {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : null;
    return null;
}

export class HttpError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const r = await fetch(input, init);
    const text = await r.text();
    const body = text ? safeJsonParse(text) : null;

    if (!r.ok) {
        const msg =
            (body && typeof body === "object" && body && "error" in body && typeof (body as any).error === "string"
                ? (body as any).error
                : r.statusText) || "Request failed";
        throw new HttpError(msg, r.status, body);
    }

    return body as T;
}

function safeJsonParse(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export function isBlobUrl(url: string | null): boolean {
    return !!url && url.startsWith("blob:");
}

export function isValidEmail(email: string): boolean {
    // simple & safe
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
