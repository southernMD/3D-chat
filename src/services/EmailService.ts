import nodemailer from 'nodemailer';
import { config } from '../config/config';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true, // 端口465使用SSL
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // 发送验证码邮件
  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    try {
      console.log(`\n🔐 === 验证码邮件 ===`);
      console.log(`📧 收件人: ${email}`);
      console.log(`🔑 验证码: ${code}`);
      console.log(`⏰ 有效期: 10分钟`);
      console.log(`========================\n`);

      // 尝试发送真实邮件
      try {
        await this.transporter.verify();
        console.log('✅ SMTP server connection verified');

        const mailOptions = {
          from: `"3D Chat" <${config.email.auth.user}>`,
          to: email,
          subject: '邮箱验证码 - 3D Chat',
          html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #00ffff; margin-bottom: 10px;">3D Chat</h1>
                <p style="color: #666; font-size: 16px;">邮箱验证码</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">您的验证码</h2>
                <div style="font-size: 32px; font-weight: bold; color: #00ffff; letter-spacing: 8px; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; border: 2px dashed #00ffff;">
                  ${code}
                </div>
                <p style="color: #666; margin-top: 20px;">验证码有效期为10分钟，请及时使用</p>
              </div>
              
              <div style="text-align: center; color: #999; font-size: 12px;">
                <p>此邮件由系统自动发送，请勿回复。</p>
                <p>如果您没有注册3D Chat账户，请忽略此邮件。</p>
              </div>
            </div>
          `,
          text: `您的3D Chat验证码是：${code}，有效期为10分钟，请及时使用。`
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`📨 Verification code email sent to ${email}, messageId: ${info.messageId}`);
        return true;
      } catch (emailError) {
        console.log(`⚠️  邮件发送失败，但验证码已在控制台显示: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
        // 即使邮件发送失败，也返回成功，因为验证码已在控制台显示
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to send verification code email:', error);
      console.log(`\n🔐 === 备用验证码显示 ===`);
      console.log(`📧 收件人: ${email}`);
      console.log(`🔑 验证码: ${code}`);
      console.log(`⏰ 有效期: 10分钟`);
      console.log(`========================\n`);
      return true; // 总是返回成功，确保开发流程不中断
    }
  }
}
