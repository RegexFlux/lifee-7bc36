// File: src/components/landing/interactiveDemo/utils.ts
"use client";

import {toast} from "@/components/toast/ToastProvider";

export class HttpError extends Error {
    status: number;
    payload: any;

    constructor(status: number, message: string, payload?: any) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.payload = payload;
    }
}

export async function fetchJson<T>(url: string, init?: RequestInit, displayError = false): Promise<T> {
    const r = await fetch(url, init);

    const text = await r.text().catch(() => "");
    const data = text ? safeJsonParse(text) : null;

    if (!r.ok) {
        const msg =
            (data && typeof data === "object" && (data as any).error) ||
            (data && typeof data === "object" && (data as any).message) ||
            r.statusText ||
            "Request failed";
        if (displayError) {
            toast.error(msg);
        }
        throw new Error(msg);
    }

    return (data as T) ?? ({} as T);
}

function safeJsonParse(s: string) {
    try {
        return JSON.parse(s);
    } catch {
        return {raw: s};
    }
}

export function safeFirstString(v: unknown): string | null {
    if (!v) return null;
    if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : null;
    return typeof v === "string" ? v : null;
}

export function isBlobUrl(v: string) {
    return v.startsWith("blob:");
}

export function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
