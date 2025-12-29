// src/lib/s3/copyObject.ts
import {CopyObjectCommand} from "@aws-sdk/client-s3";
import {s3Client, S3_BUCKET_NAME} from "@/lib/aws/s3/client";

export async function copyS3Object(params: { fromKey: string; toKey: string; contentType?: string }) {
    await s3Client.send(
        new CopyObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: params.toKey,
            CopySource: `${S3_BUCKET_NAME}/${params.fromKey}`,
            ContentType: params.contentType,
            MetadataDirective: params.contentType ? "REPLACE" : "COPY",
        })
    );
}
