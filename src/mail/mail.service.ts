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
}
