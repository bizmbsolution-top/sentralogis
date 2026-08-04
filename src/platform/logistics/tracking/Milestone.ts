import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface MilestoneProps extends Record<string, unknown> { readonly name: string; readonly achievedAt: Date; }
export class Milestone extends ValueObject<MilestoneProps> {
  private constructor(props: MilestoneProps) { super(props); }
  public static create(props: MilestoneProps): Result<Milestone> { return Result.ok(new Milestone(props)); }
  public static restore(props: MilestoneProps): Milestone { return new Milestone(props); }
}
