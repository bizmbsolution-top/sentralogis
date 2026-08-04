export interface IMiddlewareHandler {
  handle(req: Request, next: () => Promise<Response>): Promise<Response>;
}
