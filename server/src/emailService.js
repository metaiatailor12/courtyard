const nodemailer = require('nodemailer');
const { env } = require('./config');

let transporter = null;

function initializeEmailService() {
  if (!env.gmailAdminEmail || !env.gmailAppPassword) {
    console.warn('Email service not configured. Set GMAIL_ADMIN_EMAIL and GMAIL_APP_PASSWORD.');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.gmailAdminEmail,
      pass: env.gmailAppPassword,
    },
  });

  return transporter;
}

async function sendVerificationEmail(recipientEmail, verificationLink, userName) {
  try {
    if (!transporter) {
      throw new Error('Email service is not configured');
    }

    const mailOptions = {
      from: env.gmailAdminEmail,
      to: recipientEmail,
      subject: 'Verify Your Email - Courtyard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Welcome to Courtyard! 🎉</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="color: #333; font-size: 16px;">Hello ${userName},</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Thank you for signing up! To complete your registration, please verify your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p style="color: #666; font-size: 13px;">
              Or copy and paste this link in your browser:<br/>
              <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; word-break: break-all;">${verificationLink}</code>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              This link will expire in ${env.emailVerificationExpiryMinutes} minutes.<br/>
              If you didn't create this account, please ignore this email.
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            <p>© ${new Date().getFullYear()} Courtyard. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Welcome to Courtyard!
        
        Click this link to verify your email:
        ${verificationLink}
        
        This link will expire in ${env.emailVerificationExpiryMinutes} minutes.
        
        If you didn't create this account, please ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.response);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

module.exports = {
  initializeEmailService,
  sendVerificationEmail,
};
