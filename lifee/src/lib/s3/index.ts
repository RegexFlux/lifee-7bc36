// src/lib/s3/index.ts
import {S3Client, GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

function mustEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export const S3_BUCKET = mustEnv("S3_BUCKET_NAME");
const region = process.env.S3_REGION || "us-east-1";
const endpoint = process.env.S3_ENDPOINT; // ex: http://localhost:9000 (minio/localstack)
const signExpires = Number(process.env.S3_SIGN_EXPIRES || "900"); // seconds

export const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: !!endpoint, // nécessaire pour minio/localstack
    credentials: {
        accessKeyId: mustEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: mustEnv("S3_SECRET_ACCESS_KEY"),
    },
});

export async function presignPutObject(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
}) {
    const cmd = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: params.key,
        ContentType: params.contentType,
    });
    return getSignedUrl(s3, cmd, {expiresIn: params.expiresIn ?? signExpires});
}

export async function presignGetObject(params: { key: string; expiresIn?: number }) {
    const cmd = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: params.key,
    });
    return getSignedUrl(s3, cmd, {expiresIn: params.expiresIn ?? signExpires});
}
