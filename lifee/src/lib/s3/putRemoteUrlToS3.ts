// src/lib/s3/putRemoteUrlToS3.ts
import {Readable} from "node:stream";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {s3Client, S3_BUCKET_NAME} from "@/lib/s3/client";

export async function putRemoteUrlToS3(params: {
    key: string;
    url: string;
    contentType?: string;
}) {
    const r = await fetch(params.url);
    if (!r.ok) throw new Error(`fetch remote failed: ${r.status}`);

    const ct = params.contentType || r.headers.get("content-type") || "application/octet-stream";
    const body = r.body ? Readable.fromWeb(r.body as any) : null;
    if (!body) throw new Error("missing body stream");

    await s3Client.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: params.key,
            Body: body,
            ContentType: ct,
        })
    );

    return {key: params.key, contentType: ct};
}
