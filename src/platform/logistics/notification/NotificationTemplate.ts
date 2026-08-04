import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
import { NotificationChannel } from './NotificationChannel';
export interface NotificationTemplateProps<TPayload> extends Record<string, unknown> { readonly templateId: string; readonly channels: ReadonlyArray<NotificationChannel>; }
export class NotificationTemplate<TPayload> extends ValueObject<NotificationTemplateProps<TPayload>> {
  private constructor(props: NotificationTemplateProps<TPayload>) { super(props); }
  public static create<TPayload>(props: NotificationTemplateProps<TPayload>): Result<NotificationTemplate<TPayload>> { return Result.ok(new NotificationTemplate<TPayload>(props)); }
  public static restore<TPayload>(props: NotificationTemplateProps<TPayload>): NotificationTemplate<TPayload> { return new NotificationTemplate<TPayload>(props); }
}
