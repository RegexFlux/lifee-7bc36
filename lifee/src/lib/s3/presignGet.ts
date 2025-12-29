export async function presignGetObject(params: { key: string; expiresIn?: number }) {
    const [{GetObjectCommand}, {getSignedUrl}, {s3Client, S3_BUCKET_NAME, signExpires}] =
        await Promise.all([
            import("@aws-sdk/client-s3"),
            import("@aws-sdk/s3-request-presigner"),
            import("./client"),
        ]);

    const cmd = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: params.key,
    });

    return getSignedUrl(s3Client, cmd, {expiresIn: params.expiresIn ?? signExpires});
}
