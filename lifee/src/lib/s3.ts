// lib/s3.ts
import {S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import fs from "node:fs";
import {Upload} from "@aws-sdk/lib-storage";

export const loadS3Env = async () => {
    const client = new S3Client({
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
        },
        endpoint: process.env.S3_ENDPOINT as string,
        forcePathStyle: true,
        region: process.env.S3_REGION as string,
    });

    return {
        bucket: process.env.S3_BUCKET_NAME as string,
        client,
        expiresIn: Number(process.env.S3_SIGN_EXPIRES || "600"),
    };
};

export async function putBufferToS3(params: { key: string; buffer: Buffer; contentType: string }) {
    const { client, bucket } = await loadS3Env();
    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: params.key,
            Body: params.buffer,
            ContentType: params.contentType,
        })
    );
}

/** ✅ NEW: upload depuis un fichier (stream) → évite de charger les vidéos en mémoire */
export async function putFileToS3(params: { key: string; filePath: string; contentType: string }) {
    try {if (!params.filePath) throw new Error("putFileToS3: filePath is empty");
    const { client, bucket } = await loadS3Env();
    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: params.key,
            Body: fs.createReadStream(params.filePath),
            ContentType: params.contentType,
        })
    ); }
    catch (error) {
        console.error('s3 upload', error.message);
    }
}

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
    const { client, bucket } = await loadS3Env();

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
        await client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: bodyStream,
                ContentType: ct,
                ...(hasValidCL ? { ContentLength: contentLength } : {}),
            })
        );
        return;
    }

    // Multipart robuste (recommandé pour vidéos)
    const upload = new Upload({
        client,
        params: {
            Bucket: bucket,
            Key: key,
            Body: bodyStream,
            ContentType: ct,
            ...(hasValidCL ? { ContentLength: contentLength } : {}),
        },
        queueSize: 4,
        partSize: 10 * 1024 * 1024, // 10MB (>= 5MB obligatoire pour multipart)
        leavePartsOnError: false,
    });

    await upload.done();
}

export async function presignGet(key: string, expiresIn: number = 60 * 60) {
    const { client, bucket, expiresIn: envExp } = await loadS3Env();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: expiresIn ?? envExp,
    });
}

export async function s3Exists(key: string): Promise<boolean> {
    try {
        const { client, bucket } = await loadS3Env();
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    } catch (e: any) {
        // AWS v3: NotFound/NoSuchKey selon config
        const name = e?.name || "";
        const code = e?.$metadata?.httpStatusCode;
        if (name === "NotFound" || name === "NoSuchKey" || code === 404) return false;
        throw e;
    }
}
