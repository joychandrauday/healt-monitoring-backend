"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.gmail.com',
    service: 'gmail',
    auth: {
        user: 'joychandraud@gmail.com',
        pass: 'mkhc ubfy nhwu ituu',
    }
});
function sendNotification(email, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validate email
            if (!email || typeof email !== 'string' || !email.includes('@')) {
                throw new Error(`Invalid email address: ${email}`);
            }
            // Validate environment variables
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                throw new Error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
            }
            // Log email attempt
            console.log(`Configuring transporter for email to ${email}`);
            // Configure Nodemailer transport
            const transporter = nodemailer_1.default.createTransport({
                service: 'gmail', // Replace with your email service (e.g., SendGrid, AWS SES)
                auth: {
                    user: 'joychandraud@gmail.com',
                    pass: 'mkhc ubfy nhwu ituu',
                },
            });
            // Verify transporter
            try {
                yield transporter.verify();
                console.log(`Transporter verified for ${process.env.EMAIL_USER}`);
            }
            catch (verifyError) {
                throw new Error(`Transporter verification failed`);
            }
            // Create mail options
            const mailOptions = {
                from: `"Vital Alert" <${process.env.EMAIL_USER}>`,
                to: email, // Use validated email
                subject: 'Vital Alert',
                text: message,
            };
            // Validate mailOptions
            if (!mailOptions.to) {
                throw new Error('mailOptions.to is undefined');
            }
            // Log mailOptions
            console.log('Mail options:', {
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject,
            });
            // Send email
            const info = yield transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${email}:`, info.messageId);
        }
        catch (error) {
            console.error(`Error in sendNotification for ${email}:`, error.message, error);
            throw new Error(`Failed to send notification: ${error.message}`);
        }
    });
}
