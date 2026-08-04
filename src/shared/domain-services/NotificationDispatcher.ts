export interface NotificationPayload {
  recipientId: string;
  subject: string;
  body: string;
  templateId?: string;
  data?: Record<string, unknown>;
}

export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK' | 'TEAMS' | 'SLACK';

export abstract class NotificationDispatcher {
  abstract sendEmail(payload: NotificationPayload): Promise<void>;
  abstract sendWhatsApp(payload: NotificationPayload): Promise<void>;
  abstract sendSMS(payload: NotificationPayload): Promise<void>;
  abstract sendPush(payload: NotificationPayload): Promise<void>;
  abstract sendInApp(payload: NotificationPayload): Promise<void>;
  abstract sendWebhook(payload: NotificationPayload): Promise<void>;
  abstract sendTeams(payload: NotificationPayload): Promise<void>;
  abstract sendSlack(payload: NotificationPayload): Promise<void>;
  
  abstract dispatch(channels: NotificationChannel[], payload: NotificationPayload): Promise<void>;
}
