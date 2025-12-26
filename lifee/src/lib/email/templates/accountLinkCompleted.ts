// File: src/lib/email/templates/accountLinkCompleted.ts
import {renderEmailLayout} from "@/lib/email/layout";
import type {EmailTemplate} from "@/lib/email/types";

export const accountLinkCompletedEmail: EmailTemplate<{
    email: string;
}> = ({email}) => {
    const subject = "Lifee — Compte associé";
    const html = renderEmailLayout({
        title: "Compte associé",
        preheader: "Votre compte est maintenant associé",
        contentHtml: `
      <div style="font-size:14px;opacity:.9;line-height:1.6;">
        Votre compte <b>${email}</b> est maintenant associé.
      </div>
    `,
    });
    const text = `Compte associé\n\nVotre compte ${email} est maintenant associé.`;
    return {subject, html, text};
};
