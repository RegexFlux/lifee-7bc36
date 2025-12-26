// File: pages/api/share/[generationShareId].ts
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, isNull, sql} from "drizzle-orm";
import {match} from "ts-pattern";

import {apiHandler} from "@/lib/api/handler";
import {ok, fail} from "@/lib/api/response";
import {db} from "@/lib/db/index";
import {assets, generationShares, replicateGenerationJobs} from "@/lib/db/schema";
import {presignGetObject} from "@/lib/s3/presignGet";

/**
 * i18n: on ne renvoie PLUS de strings FR "hardcodées".
 * On renvoie des keys + un fallback "safe".
 */
type JobStatusKey =
    | "starting"
    | "uploading"
    | "queued"
    | "processing"
    | "canceled"
    | "failed"
    | "succeeded";

type StatusLineKey =
    | "share.status.starting"
    | "share.status.uploading"
    | "share.status.queued"
    | "share.status.processing"
    | "share.status.canceled"
    | "share.status.failed"
    | "share.status.succeeded";

function getLocale(req: NextApiRequest) {
    // simple: header custom > accept-language > default
    const h = (req.headers["x-lifee-locale"] || req.headers["x-locale"]) as string | undefined;
    if (h?.startsWith("fr")) return "fr-FR";
    if (h?.startsWith("en")) return "en-US";

    const al = req.headers["accept-language"];
    if (typeof al === "string") {
        if (al.toLowerCase().includes("fr")) return "fr-FR";
        if (al.toLowerCase().includes("en")) return "en-US";
    }
    return "fr-FR";
}

function formatCreatedLabel(params: {
    month?: number | null;
    year?: number | null;
    createdAt?: Date | null;
    locale: string
}) {
    const {month, year, createdAt, locale} = params;

    if (month && year) {
        // month/year = date du souvenir (info produit)
        const mm = String(month).padStart(2, "0");
        return locale.startsWith("fr") ? `Souvenir • ${mm}/${year}` : `Memory • ${mm}/${year}`;
    }

    if (createdAt) {
        const label = new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(createdAt);
        return locale.startsWith("fr") ? `Créé le ${label}` : `Created on ${label}`;
    }

    return locale.startsWith("fr") ? "Créé récemment" : "Created recently";
}

export type PublicShareGetResponse = {
    status: JobStatusKey;
    progress: number;
    statusLineKey: StatusLineKey;
    title: string | null;
    createdLabel: string;
    createdBy: string;

    thumbnailUrl: string;
    resultUrl?: string;

    shareUrl: string;
};

export default apiHandler({
    GET: async (req: NextApiRequest, res: NextApiResponse) => {
        const locale = getLocale(req);

        const generationShareId = Array.isArray(req.query.generationShareId)
            ? req.query.generationShareId[0]
            : req.query.generationShareId;

        if (!generationShareId) return fail(res, 400, "Missing generationShareId");

        const share = (
            await db
                .select()
                .from(generationShares)
                .where(and(eq(generationShares.id, generationShareId), eq(generationShares.isActive, true)))
                .limit(1)
        )[0];

        if (!share) return fail(res, 404, "Not found");

        const job = (
            await db
                .select()
                .from(replicateGenerationJobs)
                .where(eq(replicateGenerationJobs.id, share.generationJobId))
                .limit(1)
        )[0];

        if (!job) return fail(res, 404, "Not found");

        const source = (
            await db
                .select()
                .from(assets)
                .where(and(eq(assets.id, job.createdByAssetId), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!source) return fail(res, 404, "Not found");

        const status = job.status as JobStatusKey;

        const {preResponse, statusLineKey} = match(status)
            .with("starting", () => ({preResponse: true, statusLineKey: "share.status.starting" as const}))
            .with("uploading", () => ({preResponse: true, statusLineKey: "share.status.uploading" as const}))
            .with("queued", () => ({preResponse: true, statusLineKey: "share.status.queued" as const}))
            .with("processing", () => ({preResponse: true, statusLineKey: "share.status.processing" as const}))
            .with("canceled", () => ({preResponse: true, statusLineKey: "share.status.canceled" as const}))
            .with("failed", () => ({preResponse: true, statusLineKey: "share.status.failed" as const}))
            .with("succeeded", () => ({preResponse: false, statusLineKey: "share.status.succeeded" as const}))
            .exhaustive();

        const createdLabel = formatCreatedLabel({
            month: job.month,
            year: job.year,
            createdAt: job.createdAt ? new Date(job.createdAt) : null,
            locale,
        });

        const expiresInSec = 60 * 15;
        const thumbnailUrl = await presignGetObject({key: source.fileKey, expiresIn: expiresInSec});

        const base: PublicShareGetResponse = {
            status,
            progress: status === 'succeeded' ? 1 : Number(job.progress ?? 0),
            statusLineKey,
            title: source.title ?? locale.startsWith("fr") ? "Un souvenir presque oublié" : "A forgotten memory",
            createdLabel,
            createdBy: locale.startsWith("fr") ? "un proche" : "a loved one",
            thumbnailUrl,
            shareUrl: `/share/${share.id}`,
        };

        if (preResponse) {
            return ok(res, base);
        }

        const result = (
            await db
                .select()
                .from(assets)
                .where(and(eq(assets.id, job.resultAssetId), isNull(assets.deletedAt)))
                .limit(1)
        )[0];

        if (!result) return fail(res, 404, "Not found");

        const resultUrl = await presignGetObject({key: result.fileKey, expiresIn: expiresInSec});

        // stats (best-effort)
        await db.execute(sql`
            UPDATE "generation_shares"
            SET "access_count"     = "access_count" + 1,
                "last_accessed_at" = now()
            WHERE "id" = ${generationShareId}
        `);

        return ok(res, {...base, resultUrl});
    },
});
