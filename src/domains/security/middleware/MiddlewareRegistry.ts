import { IMiddlewareHandler } from '../contracts/IMiddlewareHandler';

export class MiddlewareRegistry {
  private handlers: IMiddlewareHandler[] = [];

  use(handler: IMiddlewareHandler): void {
    this.handlers.push(handler);
  }

  async execute(req: Request): Promise<Response> {
    let index = -1;

    const dispatch = async (i: number): Promise<Response> => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      if (i === this.handlers.length) {
        // End of pipeline, normally returning NextResponse.next() in Next.js
        return new Response('OK', { status: 200 }); 
      }

      const handler = this.handlers[i];
      return handler.handle(req, () => dispatch(i + 1));
    };

    return dispatch(0);
  }
}
