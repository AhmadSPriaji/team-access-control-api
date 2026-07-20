import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using Nodemailer.
 * Configured using environment variables or defaults to Ethereal (for testing).
 */
export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  // Use SMTP credentials from env, or fallback to Ethereal for dev
  const host = process.env.SMTP_HOST || "smtp.ethereal.email";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  let transporter: nodemailer.Transporter;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    // Automatically generate test account if no credentials are provided (dev mode)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("No SMTP credentials provided. Using Ethereal test account:", testAccount.user);
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Team Access Control" <noreply@example.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);

  if (!user || !pass) {
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  }
};
