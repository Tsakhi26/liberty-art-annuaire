import { readFile } from 'node:fs/promises'
import path from 'node:path'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

function buildEmailHtml() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Votre invitation — Liberty Art Paris 2026</title>
</head>
<body style="margin:0;padding:0;background:#fafaf8;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafaf8;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e8e3da;">
          <tr>
            <td style="padding:48px 48px 24px 48px;border-bottom:1px solid #e8e3da;">
              <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7d1535;font-weight:600;">Édition 2026 — Paris</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.05;font-weight:600;letter-spacing:-0.01em;color:#0a0a0a;">
                Votre invitation<br/>
                <em style="color:#7d1535;font-style:italic;">au vernissage</em>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 48px;font-size:15px;line-height:1.7;color:#3a342d;">
              <p style="margin:0 0 16px 0;">Bonjour,</p>
              <p style="margin:0 0 16px 0;">Nous avons le plaisir de vous convier au <strong style="color:#0a0a0a;">vernissage Liberty Art Exposition Paris 2026</strong>, vendredi 19 juin à partir de 18h, à la Galerie Joseph.</p>
              <p style="margin:0 0 24px 0;">Votre invitation gratuite, valable pour <strong>2 personnes</strong>, est jointe à cet email au format PDF.</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e8e3da;border-bottom:1px solid #e8e3da;margin:8px 0 24px 0;">
                <tr>
                  <td style="padding:20px 0;border-right:1px solid #e8e3da;width:50%;vertical-align:top;">
                    <p style="margin:0 0 6px 0;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#9a9389;">Vernissage</p>
                    <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:#0a0a0a;">Vendredi 19 Juin 2026<br/>dès 18h</p>
                  </td>
                  <td style="padding:20px 0 20px 24px;width:50%;vertical-align:top;">
                    <p style="margin:0 0 6px 0;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#9a9389;">Lieu</p>
                    <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#0a0a0a;">Galerie Joseph<br/>17 Rue Chapon, 75003 Paris</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;color:#3a342d;">Au plaisir de vous y accueillir,</p>
              <p style="margin:0;color:#0a0a0a;font-weight:600;">L'équipe Liberty Art</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px;background:#f4eee5;border-top:1px solid #e8e3da;font-size:12px;color:#6b6357;text-align:center;">
              Liberty Art — École d'art contemporain · Paris<br/>
              Cet email vous est envoyé suite à votre inscription au vernissage.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function loadInvitationPdf() {
  try {
    const pdfPath = path.join(process.cwd(), 'public', 'vernissage', 'invitation.pdf')
    const buffer = await readFile(pdfPath)
    return buffer.toString('base64')
  } catch {
    return null
  }
}

export async function sendInvitation({ email }) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Liberty Art'

  if (!apiKey) throw new Error('BREVO_API_KEY manquante')
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL manquante')

  const pdfBase64 = await loadInvitationPdf()

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email }],
    subject: 'Votre invitation — Liberty Art Paris 2026',
    htmlContent: buildEmailHtml(),
  }

  if (pdfBase64) {
    payload.attachment = [
      { name: 'invitation-liberty-art-paris-2026.pdf', content: pdfBase64 },
    ]
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Brevo error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return {
    messageId: data.messageId || null,
    pdfAttached: Boolean(pdfBase64),
  }
}
