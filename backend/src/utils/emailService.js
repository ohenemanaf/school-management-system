const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.init();
    }

    async init() {
        try {
            // Check if user provided real SMTP config via environment variables
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });
                console.log('Using real SMTP configuration');
            } else {
                // Use Ethereal for testing if no config is found
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                console.log('Using Ethereal testing SMTP configuration');
            }
        } catch (error) {
            console.error('Failed to initialize EmailService:', error);
        }
    }

    async sendWelcomeEmail(toEmail, firstName, enrollmentNumber, password) {
        if (!this.transporter) {
            console.error('Transporter not initialized yet.');
            return;
        }

        const mailOptions = {
            from: '"School Management System" <admin@school.com>',
            to: toEmail,
            subject: 'Welcome to the School System - Your Login Credentials',
            text: `Hello ${firstName},

Welcome to the School Management System! Your student account has been successfully created.

Here are your login credentials:
Index/Enrollment Number: ${enrollmentNumber}
Email: ${toEmail}
Temporary Password: ${password}

Please log in using your email and the temporary password above. You will be required to change this password upon your first login.

Regards,
School Administration`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1e293b;">Welcome to the School Management System!</h2>
                <p>Hello <strong>${firstName}</strong>,</p>
                <p>Your student account has been successfully created. Here are your login credentials:</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Index Number:</strong> ${enrollmentNumber}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${toEmail}</p>
                    <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
                </div>
                <p style="color: #ef4444; font-size: 14px;"><strong>Note:</strong> You will be required to change this password upon your first login.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Regards,<br/>School Administration</p>
            </div>`
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent to ${toEmail}. Message ID: ${info.messageId}`);
            if (info.messageId && info.messageId.includes('ethereal')) {
                console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
            return true;
        } catch (error) {
            console.error(`Failed to send email to ${toEmail}:`, error);
            return false;
        }
    }
    async sendBulkNotification(toEmails, subject, message) {
        if (!this.transporter) {
            console.error('Transporter not initialized yet.');
            return false;
        }

        if (!toEmails || toEmails.length === 0) return true;

        const mailOptions = {
            from: '"School Management System" <admin@school.com>',
            bcc: toEmails.join(','), // Use BCC for bulk to protect privacy
            subject: subject,
            text: message,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1e293b;">${subject}</h2>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; color: #334155; line-height: 1.6;">
                    ${message.replace(/\n/g, '<br/>')}
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Regards,<br/>School Administration</p>
            </div>`
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Bulk email sent to ${toEmails.length} recipients. Message ID: ${info.messageId}`);
            if (info.messageId && info.messageId.includes('ethereal')) {
                console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
            return true;
        } catch (error) {
            console.error(`Failed to send bulk email:`, error);
            return false;
        }
    }
}

module.exports = new EmailService();
