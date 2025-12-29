// src/lib/aws/enqueueExportJob.ts
import {SendMessageCommand} from "@aws-sdk/client-sqs";
import {sqsClient} from "@/lib/aws/sqs/client";


export async function enqueueExportJob(exportJobId: string) {
    const queueUrl = process.env.LIFEE_EXPORT_QUEUE_URL;
    if (!queueUrl) throw new Error("Missing LIFEE_EXPORT_QUEUE_URL");
    console.log('sending', exportJobId);

    await sqsClient.send(
        new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({exportJobId}),
        })
    );
}
