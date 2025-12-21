import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION!;
const bucket = process.env.S3_BUCKET!;
const prefix = process.env.S3_PREFIX ?? "lifee";

export const s3 = new S3Client({
    region,
    // si tu es sur un environnement avec IAM role, tu peux enlever credentials
    credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
        : undefined,
});

export const keys = {
    job: (id: string) => `${prefix}/jobs/${id}.json`,
    video: (id: string) => `${prefix}/videos/${id}.mp4`,
    upload: (id: string) => `${prefix}/uploads/${id}`,
};

async function streamToString(body: any): Promise<string> {
    // Body est généralement un Readable (Node). On bufferise.
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf-8");
}

export async function putJson(key: string, value: unknown) {
    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: JSON.stringify(value),
            ContentType: "application/json",
            CacheControl: "no-store",
        })
    );
}

export async function getJson<T>(key: string): Promise<T | null> {
    try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const text = await streamToString(res.Body);
        return JSON.parse(text) as T;
    } catch (e: any) {
        // NoSuchKey / NotFound
        return null;
    }
}

export async function putBytes(params: {
    key: string;
    body: Buffer | Uint8Array | string | ReadableStream | any;
    contentType: string;
    cacheControl?: string;
}) {
    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType,
            CacheControl: params.cacheControl,
        })
    );
}

export async function presignVideoUrl(id: string, opts?: { download?: boolean }) {
    const cmd = new GetObjectCommand({
        Bucket: bucket,
        Key: keys.video(id),
        ResponseContentDisposition: opts?.download ? `attachment; filename="lifee-${id}.mp4"` : undefined,
    });
    return getSignedUrl(s3, cmd, { expiresIn: 60 * 30 }); // 30 min
}
