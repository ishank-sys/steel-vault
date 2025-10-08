export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let { to, subject, text, html, clientName, projectName, submittalName, storagePath } = body || {};

    // Determine absolute origin to embed a stable download link (redirects to a fresh signed URL)
    const reqUrl = new URL(req.url);
    const origin = `${reqUrl.protocol}//${reqUrl.host}`;

    const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
    const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
    const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

    if (!SMTP_USER || !SMTP_PASS) {
      return NextResponse.json({ error: 'SMTP credentials not configured (SMTP_USER/SMTP_PASS)' }, { status: 500 });
    }

    // Normalize recipients
    let recipients = Array.isArray(to)
      ? to
      : String(to || '')
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean);

    if (!recipients.length) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    // Fallback subject/body
    const finalSubject = subject || `New submittal${projectName ? ` for ${projectName}` : ''}`;
    const downloadLink = storagePath ? `${origin}/api/download-link?path=${encodeURIComponent(storagePath)}` : '';
    const defaultText = `Dear recipient,

This is to notify you of a new submittal${submittalName ? `: ${submittalName}` : ''}${projectName ? ` for project: ${projectName}` : ''}${clientName ? ` (client: ${clientName})` : ''}.
${downloadLink ? `
Download: ${downloadLink}
` : ''}
This is an automated notification.`;
    const finalText = text
      ? `${text}${downloadLink ? `\n\nDownload: ${downloadLink}` : ''}`
      : defaultText;
    const defaultHtml = `<p>Dear recipient,</p>
       <p>This is to notify you of a new submittal${submittalName ? `: <b>${submittalName}</b>` : ''}${projectName ? ` for project: <b>${projectName}</b>` : ''}${clientName ? ` (client: <b>${clientName}</b>)` : ''}.</p>
       ${downloadLink ? `<p><a href="${downloadLink}" target="_blank" rel="noopener noreferrer">Download file</a></p>` : ''}
       <p>This is an automated notification.</p>`;
    const finalHtml = html
      ? `${html}${downloadLink ? `<p><a href="${downloadLink}" target="_blank" rel="noopener noreferrer">Download file</a></p>` : ''}`
      : defaultHtml;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: recipients,
      subject: finalSubject,
      text: finalText,
      html: finalHtml,
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];

    return NextResponse.json({ sent: true, to: accepted.length, accepted, rejected });
  } catch (e) {
    console.error('send-email error', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Failed to send email' }, { status: 500 });
  }
}
