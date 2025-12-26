import {PutObjectCommand} from "@aws-sdk/client-s3";
import {S3_BUCKET_NAME, s3Client} from "@/lib/s3/client";

export async function putObject(params: { key: string; body: Buffer; contentType: string }) {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType,
            ACL: "private",
        })
    );
}