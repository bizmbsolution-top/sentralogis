// [AI] Alerting Engine — send alerts through configured channels
// [AI] reading from .env.local for configuration

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  module: string;
  timestamp: string;
  correlation_id?: string;
  metadata?: Record<string, unknown>;
}

const severityColors: Record<AlertSeverity, string> = {
  low: '\x1b[36m',
  medium: '\x1b[33m',
  high: '\x1b[91m',
  critical: '\x1b[41m',
};

const severityLabels: Record<AlertSeverity, string> = {
  low: 'INFO',
  medium: 'WARN',
  high: 'HIGH',
  critical: 'CRITICAL',
};

let alertCounter = 0;

function generateAlertId(): string {
  alertCounter = (alertCounter + 1) % 99999;
  return `ALT-${Date.now().toString(36).toUpperCase()}-${String(alertCounter).padStart(5, '0')}`;
}

function formatAlertConsole(alert: Alert): string {
  const color = severityColors[alert.severity] || '';
  const label = severityLabels[alert.severity] || alert.severity.toUpperCase();
  return `${color}[${label}]${'\x1b[0m'} [${alert.module}] ${alert.title} — ${alert.message}`;
}

function sendConsoleAlert(alert: Alert) {
  const formatted = formatAlertConsole(alert);
  if (alert.severity === 'critical' || alert.severity === 'high') {
    console.error(formatted, alert.metadata || '');
  } else {
    console.warn(formatted, alert.metadata || '');
  }
}

// Placeholder for future channel integrations
async function sendEmailAlert(_alert: Alert) {
  // TODO: Implement email alerts via Supabase or third-party
  console.log('[Alerting] Email notification placeholder for:', _alert.id);
}

async function sendWebhookAlert(_alert: Alert) {
  // TODO: Implement webhook alerts
  console.log('[Alerting] Webhook placeholder for:', _alert.id);
}

const channelDispatch: Record<string, (alert: Alert) => Promise<void>> = {
  console: sendConsoleAlert,
  email: sendEmailAlert,
  webhook: sendWebhookAlert,
};

export async function dispatchAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
  const fullAlert: Alert = {
    ...alert,
    id: generateAlertId(),
    timestamp: new Date().toISOString(),
  };

  const channels = (process.env.NEXT_PUBLIC_ALERT_CHANNELS || 'console').split(',');

  for (const channel of channels) {
    const sender = channelDispatch[channel.trim()];
    if (sender) {
      try {
        await sender(fullAlert);
      } catch (err) {
        console.error(`[Alerting] Failed to send via ${channel}:`, err);
      }
    }
  }

  return fullAlert;
}

export const alert = {
  async send(
    severity: AlertSeverity,
    module: string,
    title: string,
    message: string,
    opts?: { correlation_id?: string; metadata?: Record<string, unknown> }
  ) {
    return dispatchAlert({
      severity,
      module,
      title,
      message,
      correlation_id: opts?.correlation_id,
      metadata: opts?.metadata,
    });
  },
};
