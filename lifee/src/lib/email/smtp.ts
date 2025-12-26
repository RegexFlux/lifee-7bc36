// File: src/lib/email/smtp.ts
import nodemailer from "nodemailer";

function required(name: string, v?: string) {
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export function getSmtpTransport() {
    const host = required("SMTP_HOST", process.env.SMTP_HOST);
    const port = Number(required("SMTP_PORT", process.env.SMTP_PORT));
    const user = required("SMTP_USER", process.env.SMTP_USER);
    const pass = required("SMTP_PASS", process.env.SMTP_PASS);

    return nodemailer.createTransport({
        host,
        port,
        secure: false, // 587 => STARTTLS
        auth: {user, pass},
    });
}
