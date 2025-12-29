// src/lib/aws/enqueueExportJob.ts
import {SQSClient, SendMessageCommand} from "@aws-sdk/client-sqs";

const region = process.env.LIFEE_AWS_REGIONS;
if (!region) throw new Error("Missing LIFEE_AWS_REGIONS");
const sqs = new SQSClient({region});


export async function enqueueExportJob(exportJobId: string) {
    const queueUrl = process.env.LIFEE_EXPORT_QUEUE_URL;
    if (!queueUrl) throw new Error("Missing LIFEE_EXPORT_QUEUE_URL");

    await sqs.send(
        new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({exportJobId}),
        })
    );
}
