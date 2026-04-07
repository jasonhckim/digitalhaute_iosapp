/**
 * Optional transactional email via Resend (https://resend.com).
 * Set RESEND_API_KEY and RESEND_FROM (e.g. Digital Haute <onboarding@yourdomain.com>).
 */

function getAppName(): string {
  return process.env.APP_PUBLIC_NAME || "Digital Haute";
}

export async function sendTeamInviteEmail(opts: {
  to: string;
  joinWebUrl: string;
  deepLink: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey?.trim() || !from?.trim()) {
    return;
  }

  const appName = getAppName();
  const subject = `You're invited to join a team on ${appName}`;

  const text = [
    `You've been invited to join a team on ${appName}.`,
    "",
    `Open this link on your phone to accept (sign in with the email this message was sent to):`,
    opts.joinWebUrl,
    "",
    `Or open directly in the app:`,
    opts.deepLink,
  ].join("\n");

  const html = `
    <p>You've been invited to join a team on <strong>${escapeHtml(appName)}</strong>.</p>
    <p><a href="${escapeHtml(opts.joinWebUrl)}">Accept invitation</a></p>
    <p style="color:#666;font-size:14px;">Sign in with the same email this message was sent to.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from.trim(),
      to: [opts.to.trim()],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn("[team invite email] Resend error:", res.status, body);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
