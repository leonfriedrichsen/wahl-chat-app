import type { OutgoingMail } from '@/lib/email/brevo';

/** The double opt-in mail. It names no topic and no parliament: what the
 * reader picked stays on our side, and the text is the same for everyone. */
export function confirmBriefingMail(
  to: string,
  confirmUrl: string,
  siteUrl: string,
): OutgoingMail {
  const subject = 'Bitte bestätige dein Briefing von wahl.chat';
  const impressumUrl = `${siteUrl}/impressum`;

  const text = [
    'Hallo,',
    '',
    'du hast dich bei wahl.chat für das Briefing nach Sitzungswochen angemeldet.',
    'Bitte bestätige deine E-Mail-Adresse über diesen Link:',
    '',
    confirmUrl,
    '',
    'Der Link ist 48 Stunden gültig. Wenn du dich nicht angemeldet hast, ignoriere diese E-Mail einfach. Du bekommst dann keine weiteren Nachrichten.',
    '',
    'wahl.chat',
    `Impressum: ${impressumUrl}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0 0 16px;font-size:20px;font-weight:700;">wahl.chat</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Hallo,</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">du hast dich bei wahl.chat für das Briefing nach Sitzungswochen angemeldet. Bitte bestätige deine E-Mail-Adresse.</p>
          <p style="margin:0 0 24px;">
            <a href="${confirmUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Anmeldung bestätigen</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#52525b;">Der Link ist 48 Stunden gültig. Wenn du dich nicht angemeldet hast, ignoriere diese E-Mail einfach. Du bekommst dann keine weiteren Nachrichten.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 24px;font-size:12px;color:#71717a;">
          <a href="${impressumUrl}" style="color:#71717a;">Impressum</a>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to, subject, text, html };
}
