// src/lib/aws/enqueueExportJob.ts
import {SQSClient, SendMessageCommand} from "@aws-sdk/client-sqs";

const sqs = new SQSClient({region: process.env.AWS_REGION});

export async function enqueueExportJob(exportJobId: string) {
    const queueUrl = process.env.EXPORT_QUEUE_URL;
    if (!queueUrl) throw new Error("Missing EXPORT_QUEUE_URL");

    await sqs.send(
        new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({exportJobId}),
        })
    );
}
