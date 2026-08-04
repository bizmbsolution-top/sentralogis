export interface IRefreshTokenProvider {
  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
}
