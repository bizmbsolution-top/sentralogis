export interface NumberGeneratorConfig {
  prefix: string;
  padLength: number;
  suffix?: string;
}

export abstract class NumberGeneratorService {
  abstract generateWorkOrderNumber(tenantId: string): Promise<string>;
  abstract generateJobOrderNumber(tenantId: string): Promise<string>;
  abstract generateShipmentNumber(tenantId: string): Promise<string>;
  abstract generateInvoiceNumber(tenantId: string): Promise<string>;
  abstract generateMovementNumber(tenantId: string): Promise<string>;
  
  protected formatNumber(sequence: number, config: NumberGeneratorConfig): string {
    const padded = sequence.toString().padStart(config.padLength, '0');
    return `${config.prefix}${padded}${config.suffix || ''}`;
  }
}
