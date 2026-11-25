import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  private getTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendSchoolWelcomeEmail(params: {
    email: string;
    ownerName: string;
    schoolName: string;
    loginUrl: string;
    password: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    const from =
      this.configService.get<string>('SMTP_FROM') ??
      this.configService.get<string>('SMTP_USER');

    if (!transporter || !from) {
      this.logger.warn(
        `SMTP configuration is incomplete. Skipping email sending to ${params.email}.`,
      );
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #0c3a2b; padding: 18px; border-radius: 8px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Welcome to EduSaaS Portal</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #b7f0cf;">${params.schoolName} Tenant Activated</p>
        </div>
        
        <div style="padding: 20px 0; color: #222222; line-height: 1.6;">
          <p>Dear <strong>${params.ownerName}</strong>,</p>
          <p>Congratulations! Your school instance <strong>${params.schoolName}</strong> has been successfully registered on our Cloud School Management SaaS Platform.</p>
          
          <div style="background-color: #f4f8f5; border: 1px solid #cce5d6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #0c3a2b; font-size: 15px;">Your Portal Login Credentials:</h4>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Portal URL:</strong> <a href="${params.loginUrl}" style="color: #0c3a2b;">${params.loginUrl}</a></p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Email / Username:</strong> ${params.email}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background-color: #e2ede5; padding: 3px 8px; border-radius: 4px; font-weight: bold; color: #0c3a2b;">${params.password}</code></p>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${params.loginUrl}" style="background-color: #0c3a2b; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Log in to Your School Dashboard</a>
          </div>
          
          <p style="font-size: 13px; color: #666666;">Please sign in and change your password immediately under Account Settings.</p>
        </div>
        
        <div style="border-top: 1px solid #eeeeee; padding-top: 15px; text-align: center; font-size: 12px; color: #888888;">
          <p style="margin: 0;">EduSaaS Platform Support & Administration</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: params.email,
      subject: `Welcome to EduSaaS - Your School Portal Credentials (${params.schoolName})`,
      html: htmlContent,
      text: `Hello ${params.ownerName},\n\nYour school instance ${params.schoolName} is ready.\n\nLogin URL: ${params.loginUrl}\nEmail: ${params.email}\nTemporary Password: ${params.password}\n\nPlease sign in and update your password.\n\nRegards,\nEduSaaS Administration`,
    });

    this.logger.log(`School welcome email sent to ${params.email}`);
  }

  async sendPasswordResetLink(params: {
    email: string;
    name: string;
    resetUrl: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    const from =
      this.configService.get<string>('SMTP_FROM') ??
      this.configService.get<string>('SMTP_USER');

    if (!transporter || !from) {
      this.logger.warn(
        `SMTP configuration is incomplete. Skipping password reset email to ${params.email}.`,
      );
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #0c3a2b; padding: 18px; border-radius: 8px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Password Reset Request</h2>
        </div>
        
        <div style="padding: 20px 0; color: #222222; line-height: 1.6;">
          <p>Hello <strong>${params.name}</strong>,</p>
          <p>We received a request to reset the password for your account.</p>
          <p>Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${params.resetUrl}" style="background-color: #0c3a2b; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Reset Password</a>
          </div>
          
          <p style="font-size: 13px; color: #666666;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: params.email,
      subject: 'EduSaaS Portal - Reset Your Password',
      html: htmlContent,
      text: `Hello ${params.name},\n\nPlease reset your password using the following link: ${params.resetUrl}\n\nLink valid for 1 hour.\n\nRegards,\nEduSaaS Administration`,
    });

    this.logger.log(`Password reset link sent to ${params.email}`);
  }
}
