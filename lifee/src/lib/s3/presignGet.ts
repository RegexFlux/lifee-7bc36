// src/lib/s3/index.ts
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {S3_BUCKET_NAME, s3Client, signExpires} from "@/lib/s3/client";

export async function presignGetObject(params: { key: string; expiresIn?: number }) {
    const cmd = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: params.key,
    });
    return getSignedUrl(s3Client, cmd, {expiresIn: params.expiresIn ?? signExpires});
}
