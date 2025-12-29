import {S3Client} from "@aws-sdk/client-s3";

function mustEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export const S3_BUCKET_NAME = mustEnv("S3_BUCKET_NAME");
const region = process.env.S3_REGION;
const endpoint = process.env.S3_ENDPOINT;

export function getSignExpires() {
    // IMPORTANT: valeur lue à l'exécution serveur, pas exportée comme const
    return Number(process.env.S3_SIGN_EXPIRES ?? "600");
}

export const s3Client = new S3Client({
    region,
    endpoint,
    forcePathStyle: !!endpoint,
    credentials: {
        accessKeyId: mustEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: mustEnv("S3_SECRET_ACCESS_KEY"),
    },
});
