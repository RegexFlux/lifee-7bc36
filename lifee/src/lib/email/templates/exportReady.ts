// File: src/lib/email/templates/exportReady.ts
import {renderEmailLayout} from "@/lib/email/layout";
import type {EmailTemplate} from "@/lib/email/types";

export const exportReadyEmail: EmailTemplate<{
    albumTitle: string;
    exportId: string;
    appUrl: string;
}> = ({albumTitle, exportId, appUrl}) => {
    const subject = "Lifee — Export terminé";
    const link = `${appUrl.replace(/\/$/, "")}/exports/${exportId}`;
    const html = renderEmailLayout({
        title: "Export terminé",
        preheader: "Votre export est prêt",
        contentHtml: `
      <div style="font-size:14px;opacity:.9;line-height:1.6;">
        Votre export pour <b>${albumTitle}</b> est prêt.
      </div>
      <div style="margin-top:14px;">
        <a href="${link}" style="display:inline-block;background:#fff;color:#000;padding:10px 14px;border-radius:12px;text-decoration:none;font-weight:700;">
          Voir l’export
        </a>
      </div>
      <div style="margin-top:14px;font-size:12px;opacity:.65;">
        Lien: ${link}
      </div>
    `,
    });
    const text = `Export terminé\nAlbum: ${albumTitle}\nVoir: ${link}`;
    return {subject, html, text};
};
