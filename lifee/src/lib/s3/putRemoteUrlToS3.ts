// src/lib/s3/putRemoteUrlToS3.ts
import {Readable} from "node:stream";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {s3Client, S3_BUCKET_NAME} from "@/lib/s3/client";
import {Upload} from "@aws-sdk/lib-storage";

type PutRemoteUrlToS3Params = {
    key: string;
    url: string;
    contentType?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
    // Optionnel si tu veux forcer PutObject simple (<= 5GB)
    forceSinglePut?: boolean;
};

export async function putRemoteUrlToS3({
                                           key,
                                           url,
                                           contentType,
                                           headers,
                                           timeoutMs = 120_000,
                                           forceSinglePut = false,
                                       }: PutRemoteUrlToS3Params) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
        res = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
            headers,
        });
    } finally {
        clearTimeout(t);
    }

    if (!res.ok || !res.body) {
        throw new Error(`Failed to fetch remote: ${res.status} ${res.statusText}`);
    }

    const ct = contentType || res.headers.get("content-type") || "application/octet-stream";
    const bodyStream = Readable.fromWeb(res.body as any);

    // Content-Length est souvent utile, mais peut être absent/incorrect avec certaines CDN
    const clHeader = res.headers.get("content-length");
    const contentLength = clHeader ? Number(clHeader) : undefined;
    const hasValidCL = Number.isFinite(contentLength) && (contentLength as number) > 0;

    // Si tu es sûr que c’est < 5GB, PutObject simple marche très bien.
    if (forceSinglePut) {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: key,
                Body: bodyStream,
                ContentType: ct,
                ...(hasValidCL ? {ContentLength: contentLength} : {}),
            })
        );
        return;
    }

    // Multipart robuste (recommandé pour vidéos)
    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: bodyStream,
            ContentType: ct,
            ...(hasValidCL ? {ContentLength: contentLength} : {}),
        },
        queueSize: 4,
        partSize: 10 * 1024 * 1024, // 10MB (>= 5MB obligatoire pour multipart)
        leavePartsOnError: false,
    });

    await upload.done();
}