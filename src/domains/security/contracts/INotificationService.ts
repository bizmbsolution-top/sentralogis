export interface INotificationService {
  notify(level: 'HIGH' | 'CRITICAL', title: string, details: any): Promise<void>;
}
