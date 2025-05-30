import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    service: 'gmail',
    auth: {
        user: 'joychandraud@gmail.com',
        pass: 'mkhc ubfy nhwu ituu',
    }
});

export async function sendNotification(email: string, message: string): Promise<void> {
    try {
        // Validate email
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            throw new Error(`Invalid email address: ${email}`);
        }

        // Validate environment variables
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
        }

        // Configure Nodemailer transport
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Replace with your email service (e.g., SendGrid, AWS SES)
            auth: {
                user: 'joychandraud@gmail.com',
                pass: 'mkhc ubfy nhwu ituu',
            },
        });

        // Verify transporter
        try {
            await transporter.verify();
        } catch (verifyError) {
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

        // Send email
        const info = await transporter.sendMail(mailOptions);
    } catch (error: any) {
        console.error(`Error in sendNotification for ${email}:`, error.message, error);
        throw new Error(`Failed to send notification: ${error.message}`);
    }
}