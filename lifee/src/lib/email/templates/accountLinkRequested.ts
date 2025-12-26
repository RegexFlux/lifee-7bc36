// File: src/lib/email/templates/accountLinkRequested.ts
import {renderEmailLayout} from "@/lib/email/layout";
import type {EmailTemplate} from "@/lib/email/types";

export const accountLinkRequestedEmail: EmailTemplate<{
    targetEmail: string;
    guestEmail: string;
}> = ({targetEmail, guestEmail}) => {
    const subject = "Lifee — Demande d’association de compte";
    const html = renderEmailLayout({
        title: "Association de compte",
        preheader: "Une demande d’association a été initiée",
        contentHtml: `
      <div style="font-size:14px;opacity:.9;line-height:1.6;">
        Une demande d’association a été initiée pour lier un compte invité
        (<b>${guestEmail}</b>) au compte <b>${targetEmail}</b>.
        <br/><br/>
        Si ce n’est pas vous, vous pouvez ignorer cet email.
      </div>
    `,
        footerText: "Lifee",
    });
    const text = `Demande d’association de compte\n\nGuest: ${guestEmail}\nTarget: ${targetEmail}\n\nSi ce n’est pas vous, ignorez cet email.`;
    return {subject, html, text};
};
