import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Ogiltig förfrågan' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const namn = data.get('namn')?.toString().trim() ?? '';
  const telefon = data.get('telefon')?.toString().trim() ?? '';
  const epost = data.get('epost')?.toString().trim() ?? '';
  const ort = data.get('ort')?.toString().trim() ?? '';
  const tjanst = data.get('tjanst')?.toString().trim() ?? '';
  const golvyta = data.get('golvyta')?.toString().trim() ?? '';
  const golvtyp = data.get('golvtyp')?.toString().trim() ?? '';
  const fastighetstyp = data.get('fastighetstyp')?.toString().trim() ?? '';
  const startdatum = data.get('startdatum')?.toString().trim() ?? '';
  const meddelande = data.get('meddelande')?.toString().trim() ?? '';

  // Validering
  if (!namn || !telefon || !epost || !ort || !tjanst || !meddelande) {
    return new Response(JSON.stringify({ error: 'Namn, telefon, e-post, ort, tjänst och meddelande är obligatoriska.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Enkel e-postvalidering
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(epost)) {
    return new Response(JSON.stringify({ error: 'Ogiltig e-postadress.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Telefonnummervalidering (om angivet)
  if (telefon && !/^[\d\s\-\+\(\)]{7,20}$/.test(telefon)) {
    return new Response(JSON.stringify({ error: 'Ogiltigt telefonnummer.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Bygg e-postinnehåll
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #C98A3D; border-bottom: 2px solid #C98A3D; padding-bottom: 10px;">
        Ny offertförfrågan via bellums.se
      </h2>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background: #f5f5f5;">
          <td style="padding: 10px; font-weight: bold; width: 40%;">Namn</td>
          <td style="padding: 10px;">${escapeHtml(namn)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Telefon</td>
          <td style="padding: 10px;">${escapeHtml(telefon) || '–'}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 10px; font-weight: bold;">E-post</td>
          <td style="padding: 10px;"><a href="mailto:${escapeHtml(epost)}">${escapeHtml(epost)}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Ort</td>
          <td style="padding: 10px;">${escapeHtml(ort) || '–'}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 10px; font-weight: bold;">Tjänst</td>
          <td style="padding: 10px;">${escapeHtml(tjanst) || '–'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Golvyta</td>
          <td style="padding: 10px;">${golvyta ? escapeHtml(golvyta) + ' m²' : '–'}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 10px; font-weight: bold;">Golvtyp</td>
          <td style="padding: 10px;">${escapeHtml(golvtyp) || '–'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Fastighetstyp</td>
          <td style="padding: 10px;">${escapeHtml(fastighetstyp) || '–'}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 10px; font-weight: bold;">Önskat startdatum</td>
          <td style="padding: 10px;">${escapeHtml(startdatum) || '–'}</td>
        </tr>
      </table>

      <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #C98A3D; border-radius: 4px;">
        <strong>Meddelande:</strong><br>
        <p style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(meddelande)}</p>
      </div>

      <p style="margin-top: 20px; font-size: 12px; color: #888;">
        Skickat från bellums.se kontaktformulär
      </p>
    </div>
  `;

  const textBody = `
Ny offertförfrågan via bellums.se

Namn: ${namn}
Telefon: ${telefon || '–'}
E-post: ${epost}
Ort: ${ort || '–'}
Tjänst: ${tjanst || '–'}
Golvyta: ${golvyta ? golvyta + ' m²' : '–'}
Golvtyp: ${golvtyp || '–'}
Fastighetstyp: ${fastighetstyp || '–'}
Önskat startdatum: ${startdatum || '–'}

Meddelande:
${meddelande}
  `.trim();

  try {
    await resend.emails.send({
      from: 'Bellums Kontaktformulär <noreply@bellums.se>',
      to: ['hampus@bellums.se', 'Leads@effektivmedia.nu'],
      replyTo: epost,
      subject: `Ny offertförfrågan från ${namn} – Bellums Volym Två AB`,
      html: htmlBody,
      text: textBody,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Resend error:', err);
    return new Response(JSON.stringify({ error: 'E-post kunde inte skickas. Försök igen eller kontakta oss direkt.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
