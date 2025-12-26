// File: src/components/landing/interactiveDemo/utils.ts
export class HttpError extends Error {
    status: number;
    data?: unknown;

    constructor(status: number, message: string, data?: unknown) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.data = data;
    }
}

export function safeFirstString(v: unknown): string | null {
    if (typeof v === "string") return v;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    return null;
}

export function isBlobUrl(url: string): boolean {
    return typeof url === "string" && url.startsWith("blob:");
}

export function isValidEmail(email: string): boolean {
    const s = String(email || "").trim();
    if (!s) return false;
    // Simple & robuste pour UI (la validation “vraie” reste côté serveur)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function guessErrorMessage(payload: any): string | null {
    if (!payload) return null;
    if (typeof payload === "string") return payload;
    if (typeof payload?.error === "string") return payload.error;
    if (typeof payload?.message === "string") return payload.message;
    return null;
}

async function readBodySafe(res: Response): Promise<{ json?: any; text?: string }> {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        try {
            return {json: await res.json()};
        } catch {
            return {};
        }
    }
    try {
        return {text: await res.text()};
    } catch {
        return {};
    }
}

/**
 * fetchJson<T> :
 * - envoie les cookies (credentials: "include") => utile avec lifee_session httpOnly
 * - gère JSON et non-JSON
 * - normalise les erreurs (HttpError)
 */
export async function fetchJson<T>(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<T> {
    const res = await fetch(input, {
        ...init,
        credentials: init?.credentials ?? "include",
    });

    const body = await readBodySafe(res);
    const payload = body.json ?? body.text;

    if (!res.ok) {
        const msg =
            guessErrorMessage(payload) ||
            `HTTP ${res.status}${res.statusText ? `: ${res.statusText}` : ""}`;
        throw new HttpError(res.status, msg, payload);
    }

    return payload as T;
}
