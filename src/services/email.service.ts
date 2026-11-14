import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> => {
  try {
    const activeTransporter = getTransporter();
    const from = process.env.SMTP_FROM || '"Aurevilux Concierge" <aurevilux@gmail.com>';

    if (activeTransporter) {
      await activeTransporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
        headers: {
          "X-Entity-Ref-ID": `aurevilux-${Date.now()}`,
          "X-Mailer": "Aurevilux Atelier Engine",
        },
      });
      console.log(`[Email Service] Dispatched email to ${to}: "${subject}"`);
      return true;
    } else {
      console.log(`[Email Service (Dev Simulation)] To: ${to} | Subject: "${subject}"`);
      return true;
    }
  } catch (error) {
    console.error("[Email Service Error]:", error);
    return false;
  }
};

export const sendStaffInviteEmail = async (to: string, role: string, inviteUrl: string) => {
  const subject = `Exclusive Invitation: Join Aurevilux Atelier as ${role}`;
  const text = `AUREVILUX\n\nAtelier Staff Invitation\n\nYou have been granted administrative privileges as ${role} at Aurevilux Atelier.\nTo activate your atelier credentials and access the private management portal, use the following link:\n\n${inviteUrl}\n\nThis secure link is private and will expire in 7 days. If you did not expect this invitation, please disregard this transmission.`;
  const html = `
    <div style="background-color: #0d0d0f; color: #f5f5f7; font-family: 'Cinzel', 'Playfair Display', serif, sans-serif; padding: 40px; text-align: center;">
      <h1 style="color: #c5a059; letter-spacing: 4px; font-size: 26px; margin-bottom: 8px;">A U R E V I L U X</h1>
      <p style="color: #888888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 30px;">Haute Couture & Fine Living Marketplace</p>
      
      <div style="background-color: #141418; border: 1px solid #2a2a30; border-radius: 8px; padding: 32px; max-width: 520px; margin: 0 auto; text-align: left;">
        <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Atelier Staff Invitation</h2>
        <p style="color: #a0a0a8; font-size: 14px; line-height: 1.6;">
          You have been granted administrative privileges as <strong>${role}</strong> at Aurevilux Atelier.
          To set up your atelier credentials and access the private management portal, accept the invitation below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #c5a059; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: 600; letter-spacing: 1px; font-size: 13px; text-transform: uppercase; border-radius: 4px; display: inline-block;">
            Activate Atelier Access
          </a>
        </div>
        <p style="color: #666; font-size: 12px; line-height: 1.4;">
          This secure link is private and will expire in 7 days. If you did not expect this invitation, please disregard this transmission.
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text });
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  const subject = "Aurevilux Security: Atelier Password Recovery";
  const text = `AUREVILUX\n\nPassword Reset Request\n\nWe received a request to reset the password for your Aurevilux account (${to}).\n\nTo reset your password, visit the link below:\n${resetUrl}\n\nThis recovery link will expire in 1 hour.\nIf you did not request this password recovery, you may safely ignore this transmission; your credentials remain secure.`;
  const html = `
    <div style="background-color: #0d0d0f; color: #f5f5f7; font-family: serif, sans-serif; padding: 40px; text-align: center;">
      <h1 style="color: #c5a059; letter-spacing: 4px; font-size: 24px;">A U R E V I L U X</h1>
      <div style="background-color: #141418; border: 1px solid #2a2a30; border-radius: 8px; padding: 30px; max-width: 500px; margin: 20px auto; text-align: left;">
        <h3 style="color: #fff; margin-top: 0;">Password Reset Request</h3>
        <p style="color: #999; font-size: 14px;">We received a request to reset your password for <strong>${to}</strong>. Click below to proceed with establishing your new password credentials:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #c5a059; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #888; font-size: 12px; line-height: 1.4;">If the button above does not work, copy and paste this link into your browser:<br/><span style="color: #c5a059; word-break: break-all;">${resetUrl}</span></p>
        <p style="color: #555; font-size: 12px; margin-top: 20px;">If you did not request this, your credentials remain safe and no further action is required.</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text });
};

export const sendNewsletterBroadcast = async (
  recipientEmails: string[],
  subject: string,
  htmlContent: string
) => {
  const formattedHtml = `
    <div style="background-color: #0a0a0c; color: #e5e5e7; font-family: serif, sans-serif; padding: 30px; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background: #121216; padding: 32px; border: 1px solid #26262e; border-radius: 6px;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #222; padding-bottom: 16px;">
          <h2 style="color: #c5a059; letter-spacing: 3px; margin: 0;">A U R E V I L U X</h2>
          <span style="font-size: 10px; color: #777; letter-spacing: 2px;">THE PRIVATE ATELIER DISPATCH</span>
        </div>
        <div style="color: #d1d1d6; font-size: 15px;">
          ${htmlContent}
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #222; text-align: center; font-size: 11px; color: #555;">
          You are receiving this exclusive dispatch as a subscribed patron of Aurevilux Atelier.
        </div>
      </div>
    </div>
  `;
  return sendEmail({ to: recipientEmails, subject, html: formattedHtml });
};

