import { AsyncLocalStorage } from 'async_hooks';
import { IRequestContext, IRequestContextProvider } from '../contracts/IRequestContext';

const als = new AsyncLocalStorage<IRequestContext>();

export class RequestContextManager implements IRequestContextProvider {
  getContext(): IRequestContext | null {
    return als.getStore() || null;
  }

  run<T>(context: IRequestContext, fn: () => T): T {
    return als.run(context, fn);
  }
}

export const requestContextManager = new RequestContextManager();
