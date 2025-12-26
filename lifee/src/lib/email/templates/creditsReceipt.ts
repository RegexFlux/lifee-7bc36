// File: src/lib/email/templates/creditsReceipt.ts
import {renderEmailLayout} from "@/lib/email/layout";
import type {EmailTemplate} from "@/lib/email/types";

export const creditsReceiptEmail: EmailTemplate<{
    packName: string;
    credits: number;
    priceEur: number;
    purchaseId: string;
}> = ({packName, credits, priceEur, purchaseId}) => {
    const subject = "Lifee — Reçu de paiement";
    const html = renderEmailLayout({
        title: "Reçu de paiement",
        preheader: `${credits} crédits ajoutés`,
        contentHtml: `
      <div style="font-size:14px;opacity:.9;line-height:1.6;">
        Merci ! <b>${credits}</b> crédits ont été ajoutés à votre compte.
      </div>
      <div style="margin-top:12px;font-size:13px;opacity:.8;line-height:1.6;">
        Pack : <b>${packName}</b><br/>
        Montant : <b>${(priceEur / 100).toFixed(2)}€</b><br/>
        Référence : <b>${purchaseId}</b>
      </div>
    `,
    });
    const text = `Reçu de paiement\n\nPack: ${packName}\nCrédits: ${credits}\nMontant: ${(priceEur / 100).toFixed(2)}€\nRef: ${purchaseId}`;
    return {subject, html, text};
};
