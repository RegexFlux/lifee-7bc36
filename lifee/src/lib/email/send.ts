export async function sendEmail(input: { to: string; subject: string; html: string }) {
    // TODO: plug Resend / Nodemailer
    // eslint-disable-next-line no-console
    console.log("[EMAIL]", input.to, input.subject);
}

export async function sendLoginCodeEmail(to: string, code: string) {
    await sendEmail({
        to,
        subject: "Votre code de connexion",
        html: `<p>Votre code est : <b style="font-size:20px;letter-spacing:2px">${code}</b></p>
           <p>Il expire dans 10 minutes.</p>`,
    });
}

export async function sendWelcomeEmail(to: string) {
    await sendEmail({
        to,
        subject: "Bienvenue — votre studio est prêt",
        html: `<p>Votre compte a été créé.</p><p>Vous pouvez accéder au studio immédiatement.</p>`,
    });
}
