import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendFarmOwnerInvitation(
    email: string,
    ownerName: string,
    phone: string,
    password: string,
  ): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM') ?? user;

    if (!host || !user || !pass || !from) {
      this.logger.warn('SMTP configuration is incomplete. Skipping email sending.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Welcome to Farm Dost - Your Farm Owner Account',
      text: `Hello ${ownerName},\n\nYour Farm Dost organization account has been created by the platform administrator.\n\nLogin Phone: ${phone}\nEmail: ${email}\nTemporary Password: ${password}\n\nPlease sign in to the portal and change your password.\n\nRegards,\nFarm Dost Administration`,
    });

    this.logger.log(`Farm owner invitation sent to ${email}`);
  }

  async sendPasswordReset(
    email: string,
    ownerName: string,
    newPassword: string,
  ): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM') ?? user;

    if (!host || !user || !pass || !from) {
      this.logger.warn('SMTP configuration is incomplete. Skipping reset email.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Farm Dost - Password Reset',
      text: `Hello ${ownerName},\n\nYour Farm Dost account password has been reset by the platform administrator.\n\nNew Temporary Password: ${newPassword}\n\nPlease sign in and change your password immediately.\n\nRegards,\nFarm Dost Administration`,
    });

    this.logger.log(`Password reset email sent to ${email}`);
  }

  async sendSupportReply(
    email: string,
    ownerName: string,
    farmName: string,
    ticketNumber: string,
    subject: string,
    adminResponse: string,
  ): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM') ?? user;

    if (!host || !user || !pass || !from) {
      this.logger.warn('SMTP configuration is incomplete. Skipping support reply email.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: `[Farm Dost Support] Re: ${subject} (${ticketNumber})`,
      text: `Hello ${ownerName},\n\nThe platform administrator has responded to your support request regarding "${farmName}".\n\nTicket Number: ${ticketNumber}\nSubject: ${subject}\n\nAdministrator Response:\n${adminResponse}\n\nRegards,\nFarm Dost Administration`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #059669; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px; letter-spacing: -0.5px;">Farm Dost Support</h2>
            <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">Official Administrative Response</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0;">Hello <strong>${ownerName}</strong>,</p>
            <p>The platform administration has reviewed and responded to your support request for <strong>${farmName}</strong>.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 18px 0; border-radius: 0 4px 4px 0;">
              <p style="margin: 0 0 6px; font-size: 13px; color: #64748b;"><strong>Ticket Number:</strong> <span style="color: #0f172a; font-family: monospace;">${ticketNumber}</span></p>
              <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Subject:</strong> <span style="color: #0f172a;">${subject}</span></p>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px; color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Administrator Message:</h4>
              <p style="margin: 0; font-size: 15px; color: #1e293b; white-space: pre-wrap;">${adminResponse}</p>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              You can sign in to the Farm Dost portal anytime to review the status of all your support tickets.
            </p>
          </div>
          <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 Farm Dost. All rights reserved.
          </div>
        </div>
      `,
    });

    this.logger.log(`Support reply email sent to ${email} for ticket ${ticketNumber}`);
  }
}
