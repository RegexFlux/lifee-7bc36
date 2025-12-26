// File: src/lib/email/layout.ts
function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderEmailLayout(params: {
    title: string;
    preheader?: string;
    contentHtml: string;
    footerText?: string;
}) {
    const pre = params.preheader ? escapeHtml(params.preheader) : "";
    const footer = params.footerText ? escapeHtml(params.footerText) : "Lifee";
    const title = escapeHtml(params.title);

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;background:#0b0b0c;color:#eaeaec;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0c;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:92vw;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03);">
          <tr>
            <td style="padding:22px 22px 10px 22px;">
              <div style="font-weight:700;letter-spacing:.2px;font-size:16px;">Lifee</div>
              <div style="opacity:.65;font-size:12px;margin-top:4px;">${title}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 22px 22px 22px;">
              ${params.contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 22px;border-top:1px solid rgba(255,255,255,.08);opacity:.6;font-size:12px;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
