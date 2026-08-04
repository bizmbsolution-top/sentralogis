import { IQuery } from './IQuery';

export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<TResult>;
}
