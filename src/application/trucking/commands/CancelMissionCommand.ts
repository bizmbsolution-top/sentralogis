export interface CancelMissionCommand {
  readonly jobOrderId: string;
  readonly reason?: string;
}
