// services/mailer.js
import nodemailer from 'nodemailer';

let transporter;
function makeTransport() {
  const {
    MAIL_HOST = 'smtp.gmail.com',
    MAIL_PORT = '465',
    MAIL_USER,
    MAIL_PASS,
  } = process.env;
  
  const port = Number(MAIL_PORT);
  const isSecure = port === 465;
  
  // Debug current configuration
  console.log('📧 Email Configuration:', {
    host: MAIL_HOST,
    port: port,
    secure: isSecure,
    user: MAIL_USER ? `${MAIL_USER.substring(0, 3)}***` : 'MISSING',
    hasPassword: !!MAIL_PASS
  });
  
  const config = {
    host: MAIL_HOST,
    port: port,
    secure: isSecure,
    auth: { 
      user: MAIL_USER, 
      pass: MAIL_PASS 
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    logger: true,
    // Add timeout configurations
    connectionTimeout: 60000,  // 60 seconds
    greetingTimeout: 30000,    // 30 seconds
    socketTimeout: 60000,      // 60 seconds
  };
  
  // For port 587 (STARTTLS), add TLS configuration
  if (port === 587) {
    config.requireTLS = true;
    config.tls = {
      ciphers: 'SSLv3'
    };
  }
  
  return nodemailer.createTransport(config);
}


export function getTransporter() {
  if (!transporter) {
    transporter = makeTransport();
    transporter.verify(err =>
      err ? console.error('[mail] verify failed:', err) : console.log('[mail] transporter ready')
    );
  }
  return transporter;
}

const fromAddr = () => {
  const addr = process.env.MAIL_FROM || process.env.MAIL_USER;
  console.log('📧 fromAddr():', addr);
  return addr;
};

// Modern email template base
const getEmailTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deductive</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 50%, #f3e8ff 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 50%, #f3e8ff 100%); min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 24px; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 0 40px;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                <span style="color: white; font-size: 28px; font-weight: bold;">🧠</span>
              </div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Deductive
              </h1>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 16px;">
                Where every question is a puzzle waiting to be solved
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 24px 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                This email was sent from <strong>Deductive</strong><br>
                The platform for logical thinkers and puzzle enthusiasts
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2025 Deductive. Made with 🧠 for curious minds.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export async function sendVerificationCodeEmail(to, code) {
  const content = `
    <div style="text-align: center;">
      <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #34d399 0%, #10b981 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-size: 32px;">✨</span>
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827;">
        Verify Your Email
      </h2>
      
      <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 18px; line-height: 1.6;">
        Welcome to the community of logical thinkers! <br>
        Enter this verification code to complete your registration:
      </p>
      
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; padding: 24px; margin: 32px 0; display: inline-block;">
        <div style="color: white; font-size: 36px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${code}
        </div>
      </div>
      
      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 20px; margin: 32px 0; text-align: left;">
        <p style="margin: 0 0 12px 0; color: #1e40af; font-weight: 600; font-size: 14px;">
          🛡️ Security Notice
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #3730a3; font-size: 14px; line-height: 1.5;">
          <li>This code expires in <strong>15 minutes</strong></li>
          <li>Never share this code with anyone</li>
          <li>If you didn't request this, please ignore this email</li>
        </ul>
      </div>
      
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 16px;">
        Ready to challenge your mind with deductive puzzles? <br>
        We can't wait to see what you'll discover! 🚀
      </p>
    </div>
  `;

  const t = getTransporter();
  const info = await t.sendMail({
    from: {
      name: 'Deductive',
      address: fromAddr()
    },
    to,
    subject: '🧠 Verify your Deductive account',
    html: getEmailTemplate(content),
    text: `Welcome to Deductive! Your verification code: ${code} (expires in 15 minutes). Never share this code with anyone.`,
  });
  
  console.log('[mail] verification code sent:', info.messageId);
  return info;
}

export async function sendPasswordResetEmail(to, resetLink) {
  const content = `
    <div style="text-align: center;">
      <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-size: 32px;">🔐</span>
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827;">
        Reset Your Password
      </h2>
      
      <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 18px; line-height: 1.6;">
        No worries, it happens to the best of us! <br>
        Click the button below to create a new secure password:
      </p>
      
      <a href="${resetLink}" 
         style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; font-weight: 600; font-size: 18px; padding: 16px 32px; border-radius: 12px; margin: 24px 0; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3); transition: all 0.2s;">
        <span style="margin-right: 8px;">🔗</span> Reset My Password
      </a>
      
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 20px; margin: 32px 0; text-align: left;">
        <p style="margin: 0 0 12px 0; color: #dc2626; font-weight: 600; font-size: 14px;">
          ⚠️ Important Security Information
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #b91c1c; font-size: 14px; line-height: 1.5;">
          <li>This reset link expires in <strong>15 minutes</strong></li>
          <li>Only use this link if you requested a password reset</li>
          <li>Never share this link with anyone</li>
          <li>If you didn't request this, your account is still secure</li>
        </ul>
      </div>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 32px 0;">
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">
          Can't click the button? Copy and paste this link:
        </p>
        <p style="margin: 0; color: #6366f1; font-size: 14px; word-break: break-all; font-family: 'Courier New', monospace;">
          ${resetLink}
        </p>
      </div>
      
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 16px;">
        Stay curious, stay secure! 🧠✨
      </p>
    </div>
  `;

  const t = getTransporter();
  const info = await t.sendMail({
    from: {
      name: 'Deductive Security',
      address: fromAddr()
    },
    to,
    subject: '🔐 Reset your Deductive password',
    html: getEmailTemplate(content),
    text: `Reset your Deductive password: ${resetLink} (expires in 15 minutes). If you didn't request this, please ignore this email.`,
  });
  
  console.log('[mail] password reset sent:', info.messageId);
  return info;
}
