/** One email as we render it ourselves. Brevo only relays it: no lists,
 * contact attributes or tags are ever created there, so the provider learns
 * an address and a text, never a reader's interests. */
export type OutgoingMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailSender = { email: string; name: string };

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

export function buildBrevoRequest(mail: OutgoingMail, sender: MailSender) {
  return {
    sender,
    to: [{ email: mail.to }],
    subject: mail.subject,
    textContent: mail.text,
    htmlContent: mail.html,
  };
}

export async function sendMailViaBrevo(mail: OutgoingMail): Promise<void> {
  const { BREVO_API_KEY, BRIEFING_SENDER_EMAIL, BRIEFING_SENDER_NAME } =
    process.env;

  if (!BREVO_API_KEY) {
    // Local development has no provider: the link is printed instead, so the
    // whole flow still works against the emulators. A deployment without a
    // key fails loudly rather than pretending a mail went out.
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[mail] BREVO_API_KEY unset, not sending to ${mail.to}:\n${mail.subject}\n\n${mail.text}`,
      );
      return;
    }
    throw new Error('BREVO_API_KEY is not set');
  }
  if (!BRIEFING_SENDER_EMAIL) {
    throw new Error('BRIEFING_SENDER_EMAIL is not set');
  }

  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(
      buildBrevoRequest(mail, {
        email: BRIEFING_SENDER_EMAIL,
        name: BRIEFING_SENDER_NAME || 'wahl.chat',
      }),
    ),
  });

  if (!response.ok) {
    throw new Error(
      `Brevo refused the mail: ${response.status} ${await response.text()}`,
    );
  }
}
