// src/lib/api/handler.ts
import type {NextApiHandler, NextApiRequest, NextApiResponse} from "next";
import {fail} from "./response";

export function apiHandler(methods: Partial<Record<string, NextApiHandler>>) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const fn = methods[req.method || ""];
        if (!fn) return fail(res, 405, "Method not allowed");
        try {
            return await fn(req, res);
        } catch (e: any) {
            const status = typeof e?.status === "number" ? e.status : 500;
            console.error("[API]", req.method, req.url, e);
            return fail(res, status, e?.message || "Server error");
        }
    };
}

