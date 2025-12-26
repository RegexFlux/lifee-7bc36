// File: src/lib/email/templates/generationReady.ts
import {renderEmailLayout} from "@/lib/email/layout";
import type {EmailTemplate} from "@/lib/email/types";

export const generationReadyEmail: EmailTemplate<{
    generationId: string;
    appUrl: string;
}> = ({generationId, appUrl}) => {
    const subject = "Lifee — Votre vidéo est prête";
    const link = `${appUrl.replace(/\/$/, "")}/slug/${generationId}`;
    const html = renderEmailLayout({
        title: "Vidéo prête",
        preheader: "Votre génération est terminée",
        contentHtml: `
      <div style="font-size:14px;opacity:.9;line-height:1.6;">
        Votre vidéo est prête.
      </div>
      <div style="margin-top:14px;">
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:10px 14px;border-radius:12px;text-decoration:none;font-weight:700;">
          Ouvrir la vidéo
        </a>
      </div>
      <div style="margin-top:14px;font-size:12px;opacity:.65;">
        Lien: ${link}
      </div>
    `,
    });
    const text = `Votre vidéo est prête\n\nOuvrir: ${link}`;
    return {subject, html, text};
};
