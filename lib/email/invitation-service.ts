/**
 * Team Invitation Email Service
 *
 * Handles sending team invitation emails.
 * Uses a configurable email provider (Resend, SendGrid, or custom SMTP).
 */

export interface InvitationEmailData {
  organization_name: string;
  organization_slug: string;
  inviter_name: string;
  inviter_email: string;
  invitee_email: string;
  role: string;
  invite_link: string;
  expires_at: string;
}

export interface EmailServiceResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Email provider configuration
 */
export type EmailProvider = 'resend' | 'sendgrid' | 'mock' | 'console';

/**
 * Send team invitation email
 *
 * This function handles sending invitation emails based on the configured provider.
 * In production, you should configure RESEND_API_KEY or SENDGRID_API_KEY.
 */
export async function sendTeamInvitationEmail(
  data: InvitationEmailData,
  provider: EmailProvider = 'console'
): Promise<EmailServiceResult> {
  const subject = `You're invited to join ${data.organization_name}`;

  const htmlEmail = generateInvitationEmailHTML(data);
  const textEmail = generateInvitationEmailText(data);

  switch (provider) {
    case 'resend':
      return sendViaResend(data.invitee_email, subject, htmlEmail, textEmail);
    case 'sendgrid':
      return sendViaSendGrid(data.invitee_email, subject, htmlEmail);
    case 'console':
      return sendViaConsole(data.invitee_email, subject, htmlEmail);
    case 'mock':
      // Mock implementation for testing
      return { success: true, messageId: 'mock-message-id' };
    default:
      return sendViaConsole(data.invitee_email, subject, htmlEmail);
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<EmailServiceResult> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set, falling back to console');
      return sendViaConsole(to, subject, html);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourapp.com',
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to send email via Resend',
    };
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string
): Promise<EmailServiceResult> {
  try {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;

    if (!sendGridApiKey) {
      console.warn('SENDGRID_API_KEY not set, falling back to console');
      return sendViaConsole(to, subject, html);
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject,
          },
        ],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourapp.com',
        },
        content: [
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    });

    if (!response.ok && response.status !== 202) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    const messageId = response.headers.get('x-message-id');
    return { success: true, messageId: messageId || undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to send email via SendGrid',
    };
  }
}

/**
 * Send email via console (for development)
 */
function sendViaConsole(
  to: string,
  subject: string,
  html: string
): EmailServiceResult {
  console.log('='.repeat(60));
  console.log('EMAIL SERVICE (CONSOLE MODE)');
  console.log('='.repeat(60));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(''.repeat(60));
  console.log('HTML Content:');
  console.log(html);
  console.log('='.repeat(60));

  return { success: true, messageId: 'console-mock-id' };
}

/**
 * Generate HTML email template
 */
function generateInvitationEmailHTML(data: InvitationEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = new URL(data.invite_link, baseUrl).toString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .message {
      margin-bottom: 20px;
      color: #666;
    }
    .invitation-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .invitation-card p {
      margin: 8px 0;
      color: #374151;
    }
    .invitation-card strong {
      color: #111827;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .expire-warning {
      color: #dc2626;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Team Invitation</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello,</p>
      <p class="message">
        <strong>${data.inviter_name}</strong> (${data.inviter_email}) has invited you to join
        <strong>${data.organization_name}</strong> as a <strong>${formatRole(data.role)}</strong>.
      </p>

      <div class="invitation-card">
        <p><strong>Organization:</strong> ${data.organization_name}</p>
        <p><strong>Role:</strong> ${formatRole(data.role)}</p>
        <p><strong>Invited by:</strong> ${data.inviter_name}</p>
      </div>

      <div class="button-container">
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </div>

      <p class="expire-warning">
        This invitation expires on ${new Date(data.expires_at).toLocaleDateString()}.
      </p>

      <p class="message" style="margin-top: 20px;">
        If you don't have an account yet, you'll be able to create one when you click the link above.
      </p>
    </div>
    <div class="footer">
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <p>© ${new Date().getFullYear()} ${data.organization_name}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template
 */
function generateInvitationEmailText(data: InvitationEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = new URL(data.invite_link, baseUrl).toString();

  return `
Team Invitation

Hello,

${data.inviter_name} (${data.inviter_email}) has invited you to join ${data.organization_name} as a ${formatRole(data.role)}.

Organization: ${data.organization_name}
Role: ${formatRole(data.role)}
Invited by: ${data.inviter_name}

To accept this invitation, visit:
${inviteUrl}

This invitation expires on ${new Date(data.expires_at).toLocaleDateString()}.

If you don't have an account yet, you'll be able to create one when you visit the link above.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} ${data.organization_name}. All rights reserved.
  `.trim();
}

/**
 * Format role for display
 */
function formatRole(role: string): string {
  const roleDisplayNames: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
  };

  return roleDisplayNames[role] || role;
}

/**
 * Get configured email provider from environment
 */
export function getConfiguredEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    return 'resend';
  }

  if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    return 'sendgrid';
  }

  // Default to console for development
  return 'console';
}

/**
 * Generate invitation link from token
 */
export function generateInvitationLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/signup?token=${encodeURIComponent(token)}`;
}
