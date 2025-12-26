// src/lib/s3/index.ts
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {s3Client, S3_BUCKET_NAME, signExpires} from "@/lib/s3/client";


export async function presignPutObject(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
}) {
    const cmd = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: params.key,
        ContentType: params.contentType,
    });
    return getSignedUrl(s3Client, cmd, {expiresIn: params.expiresIn ?? signExpires});
}
