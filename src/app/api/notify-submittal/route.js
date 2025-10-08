import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, clientName, projectName, submittalName, subject } = body || {};

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'SENDGRID_API_KEY is not configured on the server' }, { status: 500 });
    }
    sgMail.setApiKey(apiKey);

    const fromEmail = process.env.SENDGRID_FROM || 'no-reply@yourdomain.com';
    // Accept comma/semicolon separated string or array
    let recipients = Array.isArray(to) ? to : String(to || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);
    if (!recipients.length) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    const safeClient = clientName || 'Unknown Client';
    const safeProject = projectName || 'Unknown Project';
    const safeSubmittal = submittalName || 'N/A';
    const emailSubject = subject || `New submittal published: ${safeSubmittal} — ${safeProject}`;

    const text = `Hello,

A new submittal has been published.

- Client: ${safeClient}
- Project: ${safeProject}
- Submittal: ${safeSubmittal}

This is an automated notification.`;

    const html = `
      <p>Hello,</p>
      <p>A new submittal has been published.</p>
      <ul>
        <li><strong>Client:</strong> ${safeClient}</li>
        <li><strong>Project:</strong> ${safeProject}</li>
        <li><strong>Submittal:</strong> ${safeSubmittal}</li>
      </ul>
      <p>This is an automated notification.</p>
    `;

    const msg = {
      to: recipients,
      from: fromEmail,
      subject: emailSubject,
      text,
      html,
    };

    await sgMail.send(msg);
    return NextResponse.json({ sent: true, to: recipients.length });
  } catch (e) {
    console.error('notify-submittal error', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Failed to send email' }, { status: 500 });
  }
}
