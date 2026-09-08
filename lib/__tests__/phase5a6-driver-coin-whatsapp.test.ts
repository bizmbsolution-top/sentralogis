import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function readAllMigrationContents(): string[] {
  const migDir = path.join(ROOT, 'supabase', 'migrations');
  if (!fs.existsSync(migDir)) return [];
  return fs.readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFile(path.join(migDir, f)));
}

describe('Phase 5A Wave 6 Driver Coin Reward + WhatsApp Inquiry', () => {
  const allSql = readAllMigrationContents().join('\n');

  // =========================================================================
  // DRIVER COIN SCHEMA
  // =========================================================================

  describe('Driver coin schema', () => {
    test('driver_coins table exists', () => {
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS driver_coins');
    });

    test('driver_coins has required columns', () => {
      expect(allSql).toContain('driver_id UUID REFERENCES md_drivers(id)');
      expect(allSql).toContain('job_order_id UUID REFERENCES job_orders(id)');
      expect(allSql).toContain('coins INTEGER NOT NULL DEFAULT 1');
      expect(allSql).toContain('coin_value NUMERIC NOT NULL DEFAULT 5000');
    });

    test('driver_coins has RLS policies', () => {
      expect(allSql).toContain('driver_read_own_coins');
      expect(allSql).toContain('tenant_admin_read_coins');
    });

    test('md_drivers has coin balance columns', () => {
      expect(allSql).toContain('ADD COLUMN IF NOT EXISTS total_coins INTEGER NOT NULL DEFAULT 0');
      expect(allSql).toContain('ADD COLUMN IF NOT EXISTS total_coin_value NUMERIC NOT NULL DEFAULT 0');
    });

    test('award_driver_coin RPC exists and is idempotent', () => {
      expect(allSql).toContain('CREATE OR REPLACE FUNCTION award_driver_coin(');
      expect(allSql).toContain('SELECT EXISTS(');
      expect(allSql).toContain('WHERE job_order_id = p_job_order_id AND driver_id = p_driver_id');
      expect(allSql).toContain('IF v_existing THEN');
      expect(allSql).toContain('RETURN FALSE;');
    });

    test('get_driver_coin_balance RPC exists', () => {
      expect(allSql).toContain('CREATE OR REPLACE FUNCTION get_driver_coin_balance(p_driver_id UUID)');
    });
  });

  // =========================================================================
  // COIN AWARD TRIGGER
  // =========================================================================

  describe('Coin award trigger', () => {
    test('JO completion route awards coin via RPC', () => {
      const joRoute = readFile('app/api/jo/[token]/route.ts');
      expect(joRoute).toContain('award_driver_coin');
      expect(joRoute).toContain('p_driver_id: jo.driver_id');
      expect(joRoute).toContain('p_tenant_id: jo.tenant_id');
      expect(joRoute).toContain('p_job_order_id: jo.id');
    });

    test('JoAutoCompleteService awards coin via RPC', () => {
      const autoComplete = readFile('src/application/trucking/services/JoAutoCompleteService.ts');
      expect(autoComplete).toContain('award_driver_coin');
      expect(autoComplete).toContain('p_driver_id: jo.driver_id');
      expect(autoComplete).toContain('p_tenant_id: jo.tenant_id');
      expect(autoComplete).toContain('p_job_order_id: jo.id');
    });
  });

  // =========================================================================
  // DRIVER FEED API COIN BALANCE
  // =========================================================================

  describe('Driver feed API coin balance', () => {
    test('driver feed queries driver_coins with correct columns', () => {
      const feedRoute = readFile('app/api/driver/feed/route.ts');
      expect(feedRoute).toContain('.from("driver_coins")');
      expect(feedRoute).toContain('coins');
      expect(feedRoute).toContain('coin_value');
    });

    test('driver feed calculates total coins correctly', () => {
      const feedRoute = readFile('app/api/driver/feed/route.ts');
      expect(feedRoute).toContain('totalCoins = coinsData.reduce');
      expect(feedRoute).toContain('c.coins || 0');
    });

    test('driver feed returns coin balance in response', () => {
      const feedRoute = readFile('app/api/driver/feed/route.ts');
      expect(feedRoute).toContain('total_coins: totalCoins');
      expect(feedRoute).toContain('total_coin_value: totalCoins * 5000');
    });
  });

  // =========================================================================
  // WHATSAPP KOIN INQUIRY
  // =========================================================================

  describe('WhatsApp KOIN inquiry', () => {
    test('WhatsApp webhook handles KOIN keyword', () => {
      const webhook = readFile('app/api/whatsapp/webhook/route.ts');
      expect(webhook).toContain('message.toUpperCase() === "KOIN"');
    });

    test('WhatsApp webhook resolves driver by WA number', () => {
      const webhook = readFile('app/api/whatsapp/webhook/route.ts');
      expect(webhook).toContain('or(`whatsapp.eq.${waNumber},phone.eq.${waNumber}`)');
    });

    test('WhatsApp webhook calls get_driver_coin_balance RPC', () => {
      const webhook = readFile('app/api/whatsapp/webhook/route.ts');
      expect(webhook).toContain('rpc("get_driver_coin_balance"');
      expect(webhook).toContain('p_driver_id: driver.id');
    });

    test('WhatsApp webhook sends formatted balance reply', () => {
      const webhook = readFile('app/api/whatsapp/webhook/route.ts');
      expect(webhook).toContain('Saldo Koin Driver');
      expect(webhook).toContain('Total Koin:');
      expect(webhook).toContain('1 Koin = Rp 5.000');
    });

    test('WhatsApp webhook handles unregistered number', () => {
      const webhook = readFile('app/api/whatsapp/webhook/route.ts');
      expect(webhook).toContain('belum terdaftar sebagai driver');
    });

    test('WhatsApp webhook falls through to Copilot for non-KOIN messages', () => {
      const webhook = readFile('app/api/whatsapp/webhook/route.ts');
      expect(webhook).toContain('WhatsAppCopilotGateway.handleIncomingMessage');
    });
  });

  // =========================================================================
  // CLIENT-SIDE MUTATION SECURITY
  // =========================================================================

  describe('Client-side mutation security', () => {
    test('no browser direct driver_coins mutation', () => {
      const clientFiles = [
        readFile('app/driver/portal/page.tsx'),
        readFile('app/(dashboard)/sbu/trucking/driver-performance/page.tsx'),
        readFile('app/(dashboard)/hq/master/drivers/page.tsx'),
      ];
      const hasClientMutation = clientFiles.some(src =>
        src.includes('supabase.from(\'driver_coins\').insert') ||
        src.includes('supabase.from("driver_coins").insert') ||
        src.includes('supabase.from(\'driver_coins\').update') ||
        src.includes('supabase.from("driver_coins").update')
      );
      expect(hasClientMutation).toBe(false);
    });
  });

  // =========================================================================
  // PROFILE TAB COIN DISPLAY
  // =========================================================================

  describe('Profile tab coin display', () => {
    test('ProfileTab displays coin balance', () => {
      const profileTab = readFile('app/driver/portal/components/ProfileTab.tsx');
      expect(profileTab).toContain('total_coins');
      expect(profileTab).toContain('total_coin_value');
      expect(profileTab).toContain('Saldo Koin');
    });
  });
});
