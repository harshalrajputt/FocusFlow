const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true" || false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends a password reset OTP email
 * @param {string} toEmail - The recipient's email address
 * @param {string} otp - The 6-digit OTP
 * @returns {Promise<boolean>} - True if sent via SMTP, false if fallback logged to console
 */
const sendOTPEmail = async (toEmail, otp) => {
    // If auth credentials aren't set, do fallback logging
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("\n==================================================");
        console.warn("[WARNING] SMTP environment credentials are not configured in .env.");
        console.warn(`[OTP FALLBACK] Verification code for ${toEmail}: ${otp}`);
        console.warn("==================================================\n");
        return false;
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"FocusFlow" <no-reply@focusflow.com>',
        to: toEmail,
        subject: "FocusFlow Password Reset Code",
        text: `Your password reset verification code is: ${otp}. This code is valid for 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #0284c7; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; font-family: sans-serif;">Focus<span style="color: #0d9488;">Flow</span></h2>
                </div>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                    <p style="font-size: 16px; color: #1f2937; line-height: 1.5; font-family: sans-serif;">Hello,</p>
                    <p style="font-size: 16px; color: #4b5563; line-height: 1.5; font-family: sans-serif;">We received a request to reset your password. Use the following verification code to proceed:</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #0f172a; padding: 12px 24px; background-color: #f3f4f6; border-radius: 12px; border: 1px solid #e5e7eb; font-family: monospace;">
                            ${otp}
                        </span>
                    </div>
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.5; font-family: sans-serif;">This verification code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or contact support.</p>
                </div>
                <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 16px; text-align: center;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 0; font-family: sans-serif;">&copy; 2026 FocusFlow. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS] Password reset OTP sent to ${toEmail}. MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send SMTP email to ${toEmail}:`, error);
        // Fall back to printing to console if actual send fails so dev doesn't break
        console.log(`[OTP FALLBACK PRINT] Verification code for ${toEmail}: ${otp}`);
        return false;
    }
};

module.exports = {
    sendOTPEmail,
};
