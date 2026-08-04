export interface ITokenValidator {
  validateAccessToken(token: string): Promise<any>;
}
