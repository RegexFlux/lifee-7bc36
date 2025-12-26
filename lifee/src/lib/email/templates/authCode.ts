// File: src/lib/email/templates/authCode.ts
import {renderEmailLayout} from "@/lib/email/layout";
import type {EmailTemplate} from "@/lib/email/types";
import type {AuthEmailCodePurpose} from "@/lib/shared/types";

export const authCodeEmail: EmailTemplate<{
    code: string;
    minutes: number;
    purpose: AuthEmailCodePurpose;
}> = ({code, minutes, purpose}) => {
    const title =
        purpose === "login"
            ? "Votre code de connexion"
            : purpose === "change_email"
                ? "Votre code pour changer d’email"
                : purpose === "link_guest"
                    ? "Votre code pour associer votre compte invité"
                    : "Votre code pour fusionner vers un compte existant";

    const subject = `Lifee — ${title}`;

    const contentHtml = `
    <div style="font-size:14px;opacity:.9;line-height:1.5;margin-bottom:16px;">
      ${title}. Ce code expire dans <b>${minutes} min</b>.
    </div>
    <div style="font-size:28px;letter-spacing:6px;font-weight:800;background:rgba(255,255,255,.06);padding:14px 16px;border-radius:14px;display:inline-block;">
      ${code}
    </div>
    <div style="margin-top:16px;font-size:13px;opacity:.7;line-height:1.5;">
      Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.
    </div>
  `;

    const html = renderEmailLayout({
        title,
        preheader: `${code} — expire dans ${minutes} min`,
        contentHtml,
        footerText: "Sécurité : ne partagez jamais ce code.",
    });

    const text = `${title}\n\nCode: ${code}\nExpire dans: ${minutes} min\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez cet email.`;

    return {subject, html, text};
};
