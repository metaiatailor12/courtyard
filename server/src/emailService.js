const nodemailer = require('nodemailer');
const { env } = require('./config');

let transporter = null;

function getGmailAppPassword() {
  return String(env.gmailAppPassword || '').replace(/\s+/g, '');
}

function initializeEmailService() {
  console.log('Initializing email service...');
  console.log('Gmail Email:', env.gmailAdminEmail ? 'Set' : 'Not set');
  console.log('Gmail Password:', getGmailAppPassword() ? 'Set' : 'Not set');
  
  if (!env.gmailAdminEmail || !getGmailAppPassword()) {
    console.warn('Email service not configured. Set GMAIL_ADMIN_EMAIL and GMAIL_APP_PASSWORD.');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.gmailAdminEmail,
        pass: getGmailAppPassword(),
      },
    });

    console.log('Email service configured successfully');
    return transporter;
  } catch (error) {
    console.error('Failed to configure email service:', error);
    return null;
  }
}

async function sendVerificationEmail(recipientEmail, verificationLink, userName) {
  try {
    if (!transporter) {
      throw new Error('Email service is not configured');
    }

    const mailOptions = {
      from: `"Courtyard" <${env.gmailAdminEmail}>`,
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBookingDate(date) {
  if (!date) {
    return 'Not specified';
  }

  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return String(date);
  }

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

async function sendBookingConfirmationEmail(recipientEmail, booking) {
  try {
    if (!transporter) {
      throw new Error('Email service is not configured');
    }

    const slots = Array.isArray(booking.slots) ? booking.slots : [];
    const slotRows = slots.length
      ? slots.map(slot => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Court ${escapeHtml(slot.court)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(slot.time)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2" style="padding: 8px;">No slots listed</td></tr>';

    const slotText = slots.length
      ? slots.map(slot => `Court ${slot.court}: ${slot.time}`).join('\n')
      : 'No slots listed';

    const mailOptions = {
      from: `"Courtyard" <${env.gmailAdminEmail}>`,
      to: recipientEmail,
      subject: `Booking Confirmed - ${booking.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
          <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Booking Confirmed</h1>
            <p style="margin: 8px 0 0;">Your court booking is confirmed.</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p>Hello ${escapeHtml(booking.userName || 'Guest')},</p>
            <p>Thank you for booking with Courtyard. Here are your booking details:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; color: #4b5563;">Booking ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.id)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Court</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.courtName)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Date</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(formatBookingDate(booking.date))}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentId || 'Not available')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment Method</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentMethod || 'online')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment Status</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentStatus || 'paid')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Total Amount</td><td style="padding: 8px; font-weight: bold;">INR ${escapeHtml(booking.totalAmount)}</td></tr>
            </table>
            <h2 style="font-size: 18px; margin: 20px 0 8px;">Booked Slots</h2>
            <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #d1d5db;">Court</th>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #d1d5db;">Time</th>
                </tr>
              </thead>
              <tbody>${slotRows}</tbody>
            </table>
            <p style="margin-top: 24px; color: #4b5563;">Please keep this email for your records.</p>
          </div>
        </div>
      `,
      text: `
Booking Confirmed

Hello ${booking.userName || 'Guest'},

Your court booking is confirmed.

Booking ID: ${booking.id}
Court: ${booking.courtName}
Date: ${formatBookingDate(booking.date)}
Payment ID: ${booking.paymentId || 'Not available'}
Payment Method: ${booking.paymentMethod || 'online'}
Payment Status: ${booking.paymentStatus || 'paid'}
Total Amount: INR ${booking.totalAmount}

Booked Slots:
${slotText}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent:', info.response);
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    throw error;
  }
}

async function sendAdminBookingAlertEmail(booking) {
  try {
    if (!transporter) {
      throw new Error('Email service is not configured');
    }

    const adminEmail = String(env.gmailAdminEmail || '').trim().toLowerCase();
    if (!adminEmail) {
      throw new Error('Admin email is not configured');
    }

    const slots = Array.isArray(booking.slots) ? booking.slots : [];
    const slotRows = slots.length
      ? slots.map(slot => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Court ${escapeHtml(slot.court)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(slot.time)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2" style="padding: 8px;">No slots listed</td></tr>';

    const slotText = slots.length
      ? slots.map(slot => `Court ${slot.court}: ${slot.time}`).join('\n')
      : 'No slots listed';

    const mailOptions = {
      from: `"Courtyard" <${env.gmailAdminEmail}>`,
      to: adminEmail,
      subject: `New Booking Received - ${booking.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
          <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">New Booking Received</h1>
            <p style="margin: 8px 0 0;">A new booking has been created in Courtyard.</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; color: #4b5563;">Booking ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.id)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Source</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.source || 'user-app')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Customer Name</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.userName || 'Not provided')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Customer Email</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.userEmail || 'Not provided')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Customer Phone</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.userPhone || 'Not provided')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Court</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.courtName)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Date</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(formatBookingDate(booking.date))}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentId || 'Not available')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment Method</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentMethod || 'online')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment Status</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentStatus || 'paid')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Total Amount</td><td style="padding: 8px; font-weight: bold;">INR ${escapeHtml(booking.totalAmount)}</td></tr>
            </table>
            <h2 style="font-size: 18px; margin: 20px 0 8px;">Booked Slots</h2>
            <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #d1d5db;">Court</th>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #d1d5db;">Time</th>
                </tr>
              </thead>
              <tbody>${slotRows}</tbody>
            </table>
          </div>
        </div>
      `,
      text: `
New Booking Received

Booking ID: ${booking.id}
Source: ${booking.source || 'user-app'}
Customer Name: ${booking.userName || 'Not provided'}
Customer Email: ${booking.userEmail || 'Not provided'}
Customer Phone: ${booking.userPhone || 'Not provided'}
Court: ${booking.courtName}
Date: ${formatBookingDate(booking.date)}
Payment ID: ${booking.paymentId || 'Not available'}
Payment Method: ${booking.paymentMethod || 'online'}
Payment Status: ${booking.paymentStatus || 'paid'}
Total Amount: INR ${booking.totalAmount}

Booked Slots:
${slotText}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin booking alert email sent:', info.response);
    return true;
  } catch (error) {
    console.error('Failed to send admin booking alert email:', error);
    throw error;
  }
}

async function sendSubscriptionConfirmationEmail(recipientEmail, subscription) {
  try {
    if (!transporter) {
      throw new Error('Email service is not configured');
    }

    const mailOptions = {
      from: `"Courtyard" <${env.gmailAdminEmail}>`,
      to: recipientEmail,
      subject: `Subscription Confirmed - ${subscription.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
          <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Subscription Confirmed</h1>
            <p style="margin: 8px 0 0;">Your monthly court subscription is active.</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p>Hello ${escapeHtml(subscription.userName || 'Guest')},</p>
            <p>Thank you for subscribing with Courtyard. Here are your subscription details:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; color: #4b5563;">Subscription ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(subscription.id)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Court</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(subscription.courtName || `Court ${subscription.court}`)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Time Slot</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(subscription.timeSlot)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Start Date</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(formatBookingDate(subscription.startDate))}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">End Date</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(formatBookingDate(subscription.endDate))}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Weekdays</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(subscription.weekdaysCount)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(subscription.paymentId || 'Not available')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment Method</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(subscription.paymentMethod || 'online')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment Status</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(subscription.paymentStatus || 'paid')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Amount</td><td style="padding: 8px; font-weight: bold;">INR ${escapeHtml(subscription.amount)}</td></tr>
            </table>
            <p style="margin-top: 24px; color: #4b5563;">Please keep this email for your records.</p>
          </div>
        </div>
      `,
      text: `
Subscription Confirmed

Hello ${subscription.userName || 'Guest'},

Your monthly court subscription is active.

Subscription ID: ${subscription.id}
Court: ${subscription.courtName || `Court ${subscription.court}`}
Time Slot: ${subscription.timeSlot}
Start Date: ${formatBookingDate(subscription.startDate)}
End Date: ${formatBookingDate(subscription.endDate)}
Weekdays: ${subscription.weekdaysCount}
Payment ID: ${subscription.paymentId || 'Not available'}
Payment Method: ${subscription.paymentMethod || 'online'}
Payment Status: ${subscription.paymentStatus || 'paid'}
Amount: INR ${subscription.amount}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Subscription confirmation email sent:', info.response);
    return true;
  } catch (error) {
    console.error('Failed to send subscription confirmation email:', error);
    throw error;
  }
}

async function sendBookingCancellationEmail(recipientEmail, booking) {
  try {
    if (!transporter) {
      throw new Error('Email service is not configured');
    }

    const slots = Array.isArray(booking.slots) ? booking.slots : [];
    const slotRows = slots.length
      ? slots.map(slot => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Court ${escapeHtml(slot.court)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(slot.time)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2" style="padding: 8px;">No slots listed</td></tr>';

    const slotText = slots.length
      ? slots.map(slot => `Court ${slot.court}: ${slot.time}`).join('\n')
      : 'No slots listed';

    const mailOptions = {
      from: `"Courtyard" <${env.gmailAdminEmail}>`,
      to: recipientEmail,
      subject: `Booking Cancelled - ${booking.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
          <div style="background-color: #991b1b; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Booking Cancelled</h1>
            <p style="margin: 8px 0 0;">Your court booking has been cancelled.</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p>Hello ${escapeHtml(booking.userName || 'Guest')},</p>
            <p>This email confirms that your Courtyard booking has been cancelled.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; color: #4b5563;">Booking ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.id)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Court</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.courtName)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Date</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(formatBookingDate(booking.date))}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment ID</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentId || 'Not available')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Payment Method</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.paymentMethod || 'online')}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Total Amount</td><td style="padding: 8px; font-weight: bold;">INR ${escapeHtml(booking.totalAmount)}</td></tr>
              <tr><td style="padding: 8px; color: #4b5563;">Reason</td><td style="padding: 8px; font-weight: bold;">${escapeHtml(booking.cancelReason || 'Cancelled')}</td></tr>
            </table>
            <h2 style="font-size: 18px; margin: 20px 0 8px;">Cancelled Slots</h2>
            <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #d1d5db;">Court</th>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #d1d5db;">Time</th>
                </tr>
              </thead>
              <tbody>${slotRows}</tbody>
            </table>
            <p style="margin-top: 24px; color: #4b5563;">Please contact us if you need help with this cancellation.</p>
          </div>
        </div>
      `,
      text: `
Booking Cancelled

Hello ${booking.userName || 'Guest'},

Your Courtyard booking has been cancelled.

Booking ID: ${booking.id}
Court: ${booking.courtName}
Date: ${formatBookingDate(booking.date)}
Payment ID: ${booking.paymentId || 'Not available'}
Payment Method: ${booking.paymentMethod || 'online'}
Total Amount: INR ${booking.totalAmount}
Reason: ${booking.cancelReason || 'Cancelled'}

Cancelled Slots:
${slotText}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking cancellation email sent:', info.response);
    return true;
  } catch (error) {
    console.error('Failed to send booking cancellation email:', error);
    throw error;
  }
}

module.exports = {
  initializeEmailService,
  sendVerificationEmail,
  sendBookingConfirmationEmail,
  sendAdminBookingAlertEmail,
  sendBookingCancellationEmail,
  sendSubscriptionConfirmationEmail,
};
