import {S3_BUCKET_NAME, s3Client} from "@/lib/s3/client";
import {HeadObjectCommand} from "@aws-sdk/client-s3";

export async function getS3SizeBytes(key: string) {
    const r = await s3Client.send(new HeadObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
    }));
    return Number(r.ContentLength ?? 0);
}