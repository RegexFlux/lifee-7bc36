import {SQSClient} from "@aws-sdk/client-sqs";

function mustEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

// Si tu veux réutiliser exactement les mêmes creds que S3 (user IAM lifee-backend)
export const sqsClient = new SQSClient({
    region: mustEnv("SQS_REGION"),
    credentials: {
        accessKeyId: mustEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: mustEnv("S3_SECRET_ACCESS_KEY"),
    },
});
