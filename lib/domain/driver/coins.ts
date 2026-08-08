export const COIN_VALUE = 5000;
export const COINS_PER_JOB = 1;

export interface DriverCoin {
  id: string;
  tenant_id: string | null;
  driver_id: string | null;
  job_order_id: string | null;
  coins: number;
  coin_value: number;
  earned_at: string;
  status: string;
  created_at: string;
}

export interface DriverCoinBalance {
  total_coins: number;
  total_coin_value: number;
}

export function formatCoinValue(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatCoinsLabel(coins: number, value: number): string {
  return `${coins} Koin (${formatCoinValue(value)})`;
}
