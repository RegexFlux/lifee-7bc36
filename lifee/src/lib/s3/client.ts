import {S3Client} from "@aws-sdk/client-s3";

function mustEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export const S3_BUCKET_NAME = mustEnv("S3_BUCKET_NAME");
const region = process.env.S3_REGION || "us-east-1";
const endpoint = process.env.S3_ENDPOINT; // ex: http://localhost:9000 (minio/localstack)
export const signExpires = Number(process.env.S3_SIGN_EXPIRES || "900"); // seconds

export const s3Client = new S3Client({
    region,
    endpoint,
    forcePathStyle: !!endpoint, // nécessaire pour minio/localstack
    credentials: {
        accessKeyId: mustEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: mustEnv("S3_SECRET_ACCESS_KEY"),
    },
});