export async function sendLoginCodeEmail(params: { email: string; code: string }) {
    // TODO: branche ton provider (Resend / Postmark / Mailgun / SES / etc.)
    // Exemple Resend (si tu l'utilises) :
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: process.env.EMAIL_FROM!,
    //   to: params.email,
    //   subject: "Votre code Lifee",
    //   text: `Votre code: ${params.code}`,
    // });

    console.log("[DEV] Login code for", params.email, "=>", params.code);
}
