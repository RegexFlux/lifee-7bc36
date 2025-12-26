// File: src/lib/email/send.ts
import {getSmtpTransport} from "@/lib/email/smtp";
import type {SendEmailParams} from "@/lib/email/types";

export async function sendEmail(params: SendEmailParams) {
    const transport = getSmtpTransport();

    const from = process.env.MAIL_FROM || process.env.SMTP_USER!;
    const info = await transport.sendMail({
        from: `Lifee <${from}>`,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
    });

    return {messageId: info.messageId};
}
