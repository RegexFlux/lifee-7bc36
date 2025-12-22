// lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import fs from "node:fs";

export const loadS3Env = () => {
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
    const { client, bucket } = loadS3Env();
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
    if (!params.filePath) throw new Error("putFileToS3: filePath is empty");
    const { client, bucket } = loadS3Env();
    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: params.key,
            Body: fs.createReadStream(params.filePath),
            ContentType: params.contentType,
        })
    );
}

export async function putRemoteUrlToS3(params: { key: string; url: string; contentType?: string }) {
    const { client, bucket } = loadS3Env();

    const res = await fetch(params.url);
    if (!res.ok || !res.body) throw new Error(`Failed to fetch remote: ${res.status}`);

    const ct = params.contentType || res.headers.get("content-type") || "application/octet-stream";
    const bodyStream = Readable.fromWeb(res.body as any);

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: params.key,
            Body: bodyStream,
            ContentType: ct,
        })
    );
}

export async function presignGet(key: string, expiresIn?: number) {
    const { client, bucket, expiresIn: envExp } = loadS3Env();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: expiresIn ?? envExp,
    });
}
