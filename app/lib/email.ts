import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type TeamSummary = {
  executive_signal?: string;
  decision?: string;
  tension?: string;
  recommended_move?: string;
  tradeoff?: string;
  confidence_score?: number;
  confidence_reason?: string;
  projection_14d?: string;
  contradictions?: string | null;
  operating?: {
    working?: string[];
    breaking?: string[];
    top_risk?: string;
  };
  leadership_edge?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeText(value?: string | null) {
  return escapeHtml(value || '—');
}

function renderList(items?: string[]) {
  if (!items || items.length === 0) {
    return `
      <div style="margin-top:10px; font-size:14px; line-height:1.7; color:#6b7280;">
        —
      </div>
    `;
  }

  return `
    <ul style="margin:10px 0 0; padding-left:18px; color:#111827;">
      ${items
        .map(
          (item) => `
            <li style="margin:6px 0; font-size:14px; line-height:1.7; color:#111827;">
              ${escapeHtml(item)}
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function getConfidenceLabel(score?: number) {
  if (typeof score !== 'number') return 'Confidence';
  if (score >= 80) return 'High confidence';
  if (score >= 60) return 'Moderate confidence';
  return 'Low confidence';
}

function getConfidenceStyles(score?: number) {
  if (typeof score !== 'number') {
    return {
      border: '#d1d5db',
      bg: '#f9fafb',
      pillBg: '#6b7280',
      pillText: '#ffffff',
    };
  }

  if (score >= 80) {
    return {
      border: '#a7f3d0',
      bg: '#ecfdf5',
      pillBg: '#059669',
      pillText: '#ffffff',
    };
  }

  if (score >= 60) {
    return {
      border: '#fde68a',
      bg: '#fffbeb',
      pillBg: '#f59e0b',
      pillText: '#ffffff',
    };
  }

  return {
    border: '#fecaca',
    bg: '#fef2f2',
    pillBg: '#dc2626',
    pillText: '#ffffff',
  };
}

function cardShell(inner: string) {
  return `
    <div style="
      background:#ffffff;
      border:1px solid rgba(0,0,0,0.08);
      border-radius:18px;
      padding:20px;
    ">
      ${inner}
    </div>
  `;
}

function cardLabel(label: string) {
  return `
    <div style="
      font-size:11px;
      line-height:1.4;
      letter-spacing:0.18em;
      text-transform:uppercase;
      color:#6b7280;
      margin-bottom:10px;
    ">
      ${escapeHtml(label)}
    </div>
  `;
}

export async function sendSummaryEmail({
  to,
  title,
  summary,
}: {
  to: string;
  title: string;
  summary: TeamSummary;
}) {
  if (!to) return;

  const confidenceScore =
    typeof summary?.confidence_score === 'number' ? summary.confidence_score : undefined;

  const confidenceStyles = getConfidenceStyles(confidenceScore);
  const confidenceLabel = getConfidenceLabel(confidenceScore);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Decision Layer Summary</title>
      </head>
      <body style="margin:0; padding:0; background:#f7f7f2; font-family:Arial, sans-serif; color:#111827;">
        <div style="background:#f7f7f2; padding:32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:760px;">
                  <tr>
                    <td style="padding:0 0 14px 0; font-size:10px; line-height:1.4; letter-spacing:0.32em; text-transform:uppercase; color:#6b7280;">
                      Prepared for: Decision, not review
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 0 6px 0; font-size:38px; line-height:1.1; font-weight:700; color:#111111;">
                      ${escapeHtml(title)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 0 22px 0; font-size:14px; line-height:1.7; color:#4b5563;">
                      Decision Layer Summary
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:16px;">
                      <div style="
                        background:#f1f1ec;
                        border:1px solid rgba(0,0,0,0.08);
                        border-left:4px solid #111111;
                        border-radius:20px;
                        padding:24px;
                      ">
                        ${cardLabel('What matters now')}
                        <div style="font-size:18px; line-height:1.5; font-weight:700; color:#111111;">
                          ${safeText(summary?.executive_signal)}
                        </div>
                        <div style="margin-top:14px; font-size:14px; line-height:1.7; color:#4b5563;">
                          ${safeText(summary?.tension)}
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="top" width="50%" style="padding-right:8px;">
                            ${cardShell(`
                              ${cardLabel('The decision')}
                              <div style="font-size:15px; line-height:1.7; font-weight:600; color:#111111;">
                                ${safeText(summary?.decision)}
                              </div>
                            `)}
                          </td>
                          <td valign="top" width="50%" style="padding-left:8px;">
                            ${cardShell(`
                              ${cardLabel('What to do now')}
                              <div style="font-size:15px; line-height:1.7; font-weight:600; color:#111111;">
                                ${safeText(summary?.recommended_move)}
                              </div>
                            `)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="top" width="50%" style="padding-right:8px;">
                            <div style="
                              background:${confidenceStyles.bg};
                              border:1px solid ${confidenceStyles.border};
                              border-radius:18px;
                              padding:20px;
                            ">
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td valign="top">
                                    ${cardLabel('Confidence')}
                                  </td>
                                  <td align="right" valign="top">
                                    <div style="
                                      display:inline-block;
                                      background:${confidenceStyles.pillBg};
                                      color:${confidenceStyles.pillText};
                                      border-radius:999px;
                                      padding:5px 10px;
                                      font-size:10px;
                                      line-height:1;
                                      font-weight:700;
                                      text-transform:uppercase;
                                      letter-spacing:0.1em;
                                      white-space:nowrap;
                                    ">
                                      ${escapeHtml(confidenceLabel)}
                                    </div>
                                  </td>
                                </tr>
                              </table>

                              <div style="margin-top:8px; font-size:34px; line-height:1; font-weight:700; color:#111111;">
                                ${typeof confidenceScore === 'number' ? confidenceScore : '—'}
                              </div>

                              <div style="margin-top:8px; font-size:12px; line-height:1.6; color:#6b7280;">
                                Based on consistency across team inputs
                              </div>

                              <div style="margin-top:14px; font-size:14px; line-height:1.7; color:#4b5563;">
                                ${safeText(summary?.confidence_reason)}
                              </div>
                            </div>
                          </td>

                          <td valign="top" width="50%" style="padding-left:8px;">
                            ${cardShell(`
                              ${cardLabel('If delayed')}
                              <div style="font-size:14px; line-height:1.7; color:#374151;">
                                ${safeText(summary?.projection_14d)}
                              </div>

                              <div style="
                                margin-top:14px;
                                padding-top:14px;
                                border-top:1px solid rgba(0,0,0,0.08);
                                font-size:14px;
                                line-height:1.7;
                                color:#4b5563;
                              ">
                                <strong style="color:#111111;">Tradeoff:</strong>
                                ${safeText(summary?.tradeoff)}
                              </div>
                            `)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:16px;">
                      <div style="
                        background:#111111;
                        color:#ffffff;
                        border-radius:18px;
                        padding:20px;
                      ">
                        ${cardLabel('What others may miss').replace('color:#6b7280', 'color:rgba(255,255,255,0.62)')}
                        <div style="font-size:16px; line-height:1.8; font-weight:600; color:#ffffff;">
                          ${safeText(summary?.leadership_edge)}
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="top" width="50%" style="padding-right:8px;">
                            ${cardShell(`
                              ${cardLabel('What’s working')}
                              ${renderList(summary?.operating?.working)}
                            `)}
                          </td>
                          <td valign="top" width="50%" style="padding-left:8px;">
                            ${cardShell(`
                              ${cardLabel('What’s breaking')}
                              ${renderList(summary?.operating?.breaking)}
                            `)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${
                    summary?.contradictions
                      ? `
                    <tr>
                      <td style="padding-bottom:16px;">
                        <div style="
                          background:#fef3c7;
                          border:1px solid #f59e0b;
                          border-radius:18px;
                          padding:20px;
                        ">
                          <div style="
                            font-size:11px;
                            line-height:1.4;
                            letter-spacing:0.18em;
                            text-transform:uppercase;
                            color:#92400e;
                            margin-bottom:10px;
                          ">
                            Misalignment
                          </div>
                          <div style="font-size:14px; line-height:1.7; color:#78350f;">
                            ${safeText(summary?.contradictions)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  `
                      : ''
                  }

                  <tr>
                    <td style="padding-bottom:22px;">
                      ${cardShell(`
                        ${cardLabel('Top risk')}
                        <div style="font-size:14px; line-height:1.7; color:#374151;">
                          ${safeText(summary?.operating?.top_risk)}
                        </div>
                      `)}
                    </td>
                  </tr>

                  <tr>
                    <td style="font-size:12px; line-height:1.6; color:#6b7280;">
                      Generated by Decision Layer
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: 'Decision Layer <info@decisionlayer.dev>',
    to,
    subject: `Summary: ${title}`,
    html,
  });
}

export async function sendNetworkConfirmationEmail({
  to,
  firstName,
}: {
  to: string;
  firstName: string;
}) {
  if (!to) return;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Decision Layer report is confirmed</title>
      </head>
      <body style="margin:0; padding:0; background:#f7f7f2; font-family:Arial, sans-serif; color:#111827;">
        <div style="background:#f7f7f2; padding:32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
                  <tr>
                    <td style="padding:0 0 24px 0;">
                      <div style="font-size:24px; line-height:1.3; font-weight:700; color:#111111;">
                        Hi ${escapeHtml(firstName)},
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 0 20px 0; font-size:15px; line-height:1.7; color:#4b5563;">
                      You're in. Here's what happens next:
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:20px;">
                      <div style="background:#ffffff; border:1px solid rgba(0,0,0,0.08); border-radius:12px; padding:24px;">
                        <div style="font-size:13px; line-height:1.4; letter-spacing:0.1em; text-transform:uppercase; color:#6b7280; margin-bottom:12px; font-weight:600;">
                          Step 1 — Get your LinkedIn connections file
                        </div>
                        <div style="font-size:14px; line-height:1.7; color:#374151; margin-bottom:12px;">
                          Go to <a href="https://www.linkedin.com/mypreferences/d/download-my-data" style="color:#0066cc; text-decoration:none;">https://www.linkedin.com/mypreferences/d/download-my-data</a>, select <strong>Download larger data archive</strong>, and click <strong>Request archive</strong>. LinkedIn will email you the file within 10-24 hours.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:20px;">
                      <div style="background:#ffffff; border:1px solid rgba(0,0,0,0.08); border-radius:12px; padding:24px;">
                        <div style="font-size:13px; line-height:1.4; letter-spacing:0.1em; text-transform:uppercase; color:#6b7280; margin-bottom:12px; font-weight:600;">
                          Step 2 — Forward it to us
                        </div>
                        <div style="font-size:14px; line-height:1.7; color:#374151;">
                          Once you have it, forward the <strong>Connections.csv</strong> file to <a href="mailto:info@decisionlayer.dev" style="color:#0066cc; text-decoration:none;">info@decisionlayer.dev</a>.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:28px;">
                      <div style="background:#ffffff; border:1px solid rgba(0,0,0,0.08); border-radius:12px; padding:24px;">
                        <div style="font-size:13px; line-height:1.4; letter-spacing:0.1em; text-transform:uppercase; color:#6b7280; margin-bottom:12px; font-weight:600;">
                          Step 3 — Get your report
                        </div>
                        <div style="font-size:14px; line-height:1.7; color:#374151;">
                          Your full network intelligence report will be delivered within <strong>24 hours</strong> of us receiving your file.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:20px 0; border-top:1px solid rgba(0,0,0,0.08); font-size:13px; line-height:1.7; color:#6b7280;">
                      Questions? Reply to this email or contact us at <a href="mailto:info@decisionlayer.dev" style="color:#0066cc; text-decoration:none;">info@decisionlayer.dev</a>.
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px 0 0 0; font-size:13px; line-height:1.7; color:#111111; font-weight:600;">
                      — The Decision Layer Team
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: 'Decision Layer <info@decisionlayer.dev>',
    to,
    subject: 'Your Decision Layer report is confirmed — one last step',
    html,
  });
}