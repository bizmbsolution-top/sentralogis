import { ICommand } from './ICommand';

export interface ICommandHandler<TCommand extends ICommand, TResult> {
  execute(command: TCommand): Promise<TResult>;
}
