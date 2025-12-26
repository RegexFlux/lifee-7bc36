// File: src/lib/email/types.ts
export type EmailTemplate<T> = (props: T) => {
    subject: string;
    html: string;
    text: string;
};

export type SendEmailParams = {
    to: string;
    subject: string;
    html: string;
    text: string;
};
