const nodemailer = require('nodemailer');

const FROM = process.env.SMTP_FROM || '"School Management System" <no-reply@localhost>';
// Most SMTP providers cap recipients per message (Gmail ~100, many relays 50).
const BCC_BATCH_SIZE = Number(process.env.SMTP_BATCH_SIZE || 50);

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const layout = (inner) => `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
    ${inner}
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 12px; color: #64748b;">Regards,<br/>School Administration</p>
</div>`;

class EmailService {
    constructor() {
        this.transporter = null;
        this.ready = this.init();
    }

    async init() {
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT || 587),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                });
                console.log('Using real SMTP configuration');
            } else if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
                console.log('Email delivery is disabled until SMTP settings are configured.');
            } else {
                // Use Ethereal for local development if no config is found
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: { user: testAccount.user, pass: testAccount.pass },
                });
                console.log('Using Ethereal testing SMTP configuration');
            }
        } catch (error) {
            console.error('Failed to initialize EmailService:', error);
        }
    }

    async send(mailOptions, description) {
        await this.ready; // avoid "not initialized" races right after startup
        if (!this.transporter) {
            console.error(`Email not sent (${description}): no transport configured.`);
            return false;
        }
        try {
            const info = await this.transporter.sendMail({ from: FROM, ...mailOptions });
            console.log(`Email sent (${description}). Message ID: ${info.messageId}`);
            const preview = nodemailer.getTestMessageUrl(info);
            if (preview) console.log(`Preview URL: ${preview}`);
            return true;
        } catch (error) {
            console.error(`Failed to send email (${description}):`, error);
            return false;
        }
    }

    /** Credentials email for a newly created account (student or staff). */
    async sendWelcomeEmail(toEmail, name, enrollmentNumber, password) {
        const idLine = enrollmentNumber && enrollmentNumber !== 'N/A' ? `Index/Enrollment Number: ${enrollmentNumber}\n` : '';
        return this.send({
            to: toEmail,
            subject: 'Welcome to the School System - Your Login Credentials',
            text: `Hello ${name},

Welcome to the School Management System! Your account has been created.

${idLine}Email: ${toEmail}
Temporary Password: ${password}

Log in with your email and the temporary password above. You will be asked to choose a new password when you first log in.

Regards,
School Administration`,
            html: layout(`
    <h2 style="color: #1e293b;">Welcome to the School Management System!</h2>
    <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
    <p>Your account has been created. Here are your login credentials:</p>
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        ${idLine ? `<p style="margin: 5px 0;"><strong>Index Number:</strong> ${escapeHtml(enrollmentNumber)}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Email:</strong> ${escapeHtml(toEmail)}</p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(password)}</code></p>
    </div>
    <p style="color: #ef4444; font-size: 14px;"><strong>Note:</strong> You will be asked to choose a new password when you first log in.</p>`),
        }, `welcome to ${toEmail}`);
    }

    /** Sends one message to many recipients, in BCC batches the SMTP server will accept. */
    async sendBulkNotification(toEmails, subject, message) {
        if (!toEmails || toEmails.length === 0) return true;
        const html = layout(`
    <h2 style="color: #1e293b;">${escapeHtml(subject)}</h2>
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; color: #334155; line-height: 1.6;">
        ${escapeHtml(message).replace(/\n/g, '<br/>')}
    </div>`);

        let allSent = true;
        for (let i = 0; i < toEmails.length; i += BCC_BATCH_SIZE) {
            const batch = toEmails.slice(i, i + BCC_BATCH_SIZE);
            const sent = await this.send({ bcc: batch, subject, text: message, html }, `bulk batch of ${batch.length}`);
            allSent = allSent && sent;
        }
        return allSent;
    }
}

module.exports = new EmailService();
module.exports.escapeHtml = escapeHtml;
