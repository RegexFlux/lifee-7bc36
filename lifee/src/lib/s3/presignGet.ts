export async function presignGetObject(params: { key: string; expiresIn?: number }) {
    const [{GetObjectCommand}, {getSignedUrl}, {s3Client, S3_BUCKET_NAME, getSignExpires}] =
        await Promise.all([
            import("@aws-sdk/client-s3"),
            import("@aws-sdk/s3-request-presigner"),
            import("./client"),
        ]);

    const cmd = new GetObjectCommand({Bucket: S3_BUCKET_NAME, Key: params.key});
    const expiresIn = params.expiresIn ?? getSignExpires();
    return getSignedUrl(s3Client, cmd, {expiresIn});
}
