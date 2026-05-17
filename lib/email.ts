import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendVerificationCode(to: string, code: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Cloud Drive" <${process.env.SMTP_USER || ""}>`,
      to,
      subject: "邮箱验证码 - Cloud Drive",
      html: `
        <div style="max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;border-radius:16px;font-family:-apple-system,sans-serif">
          <h1 style="color:#e2e8f0;font-size:20px;margin:0 0 8px">Cloud Drive 邮箱验证</h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">您的验证码如下，60秒内有效：</p>
          <div style="background:#1e293b;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#f472b6;font-family:monospace">${code}</span>
          </div>
          <p style="color:#64748b;font-size:12px;margin:0">如果这不是您的操作，请忽略此邮件。</p>
        </div>
      `,
    });
    return true;
  } catch (e) {
    console.error("Send email failed:", e);
    return false;
  }
}
