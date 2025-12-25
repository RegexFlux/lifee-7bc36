// src/lib/api/response.ts
import type {NextApiResponse} from "next";

export function ok(res: NextApiResponse, data: any = {}, status = 200) {
    return res.status(status).json({ok: true, ...data});
}

export function fail(res: NextApiResponse, status: number, error: string, details?: any) {
    return res.status(status).json({ok: false, error, ...(details ? {details} : {})});
}
