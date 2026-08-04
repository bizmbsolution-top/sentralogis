import { Result } from '../../../shared/kernel/Result';
import { NotificationTemplate } from './NotificationTemplate';
import { NotificationResult } from './NotificationResult';
export interface INotificationProvider<TTarget> {
  dispatch<TPayload>(template: Readonly<NotificationTemplate<TPayload>>, payload: Readonly<TPayload>, target: Readonly<TTarget>): Result<NotificationResult>;
}
