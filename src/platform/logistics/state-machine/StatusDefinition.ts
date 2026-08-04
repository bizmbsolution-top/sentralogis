import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface StatusDefinitionProps<TStatus extends string> extends Record<string, unknown> { readonly code: TStatus; readonly label: string; readonly isTerminal: boolean; }
export class StatusDefinition<TStatus extends string> extends ValueObject<StatusDefinitionProps<TStatus>> {
  private constructor(props: StatusDefinitionProps<TStatus>) { super(props); }
  public static create<TStatus extends string>(props: StatusDefinitionProps<TStatus>): Result<StatusDefinition<TStatus>> { return Result.ok(new StatusDefinition<TStatus>(props)); }
  public static restore<TStatus extends string>(props: StatusDefinitionProps<TStatus>): StatusDefinition<TStatus> { return new StatusDefinition<TStatus>(props); }
  public get code(): TStatus { return this.props.code; }
}
