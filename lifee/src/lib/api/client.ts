// File: src/lib/api/client.ts
import {z} from "zod";

export class ApiError extends Error {
    status: number;
    details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}

const AnyJson = z.any();

function normalizeResponseJson(json: unknown) {
    // Supporte plusieurs formats possibles:
    // - { ok: true, data: ... }
    // - { ok: true, ... }
    // - { ... } direct
    const j = AnyJson.parse(json);

    if (j && typeof j === "object") {
        if (j.ok === false) {
            throw new ApiError(j.error || j.message || "Request failed", 400, j.details ?? j);
        }
        if (j.ok === true && "data" in j) return j.data;
    }
    return j;
}

export async function apiFetch<T>(
    url: string,
    opts?: {
        method?: "GET" | "POST" | "PATCH" | "DELETE";
        body?: unknown;
        schema?: z.ZodType<T>;
        headers?: Record<string, string>;
    }
): Promise<T> {
    const method = opts?.method ?? "GET";
    const headers: Record<string, string> = {...(opts?.headers ?? {})};

    let body: BodyInit | undefined = undefined;
    if (opts?.body !== undefined) {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        body = JSON.stringify(opts.body);
    }

    const r = await fetch(url, {
        method,
        headers,
        body,
        credentials: "include",
    });

    const raw = await r.text();
    let json: unknown = null;
    try {
        json = raw ? JSON.parse(raw) : null;
    } catch {
        // si la réponse n’est pas JSON
        if (!r.ok) throw new ApiError(raw || "Request failed", r.status);
        return raw as T;
    }

    const normalized = normalizeResponseJson(json);

    if (!r.ok) {
        const msg =
            (normalized)?.error ||
            (normalized)?.message ||
            `Request failed (${r.status})`;
        throw new ApiError(msg, r.status, normalized);
    }

    if (opts?.schema) return opts.schema.parse(normalized);
    return normalized as T;
}

export const apiGet = <T>(url: string, schema?: z.ZodType<T>) => apiFetch<T>(url, {method: "GET", schema});
export const apiPost = <T>(url: string, body?: unknown, schema?: z.ZodType<T>) =>
    apiFetch<T>(url, {method: "POST", body, schema});
