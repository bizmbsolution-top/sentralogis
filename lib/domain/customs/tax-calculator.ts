/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/tax-calculator.ts
 * Description: Deterministic Indonesian Customs Tax & Duty Calculation Engine (Nilai Pabean, BM, PPN, PPh 22)
 */

import { CustomsTaxCalculationContext, CustomsTaxResult } from './types';
import { TaxCalculationError } from './errors';

export class CustomsTaxCalculator {
  public static readonly DEFAULT_EXCHANGE_RATE_IDR = 16000;
  public static readonly DEFAULT_PPN_RATE_PERCENT = 11;
  public static readonly DEFAULT_PPH_RATE_PERCENT = 2.5;

  /**
   * Calculates duty and import taxes for a single classification item
   */
  public static calculateLineTax(context: CustomsTaxCalculationContext): CustomsTaxResult {
    if (context.cifValueUsd < 0) {
      throw new TaxCalculationError('CIF Value cannot be negative.');
    }
    if (context.exchangeRateIdr <= 0) {
      throw new TaxCalculationError('Exchange rate (Kurs Pajak) must be greater than zero.');
    }

    // 1. Nilai Pabean (IDR) = CIF (USD) * Kurs Pajak (IDR)
    const nilaiPabeanIdr = Math.round(context.cifValueUsd * context.exchangeRateIdr);

    // 2. Bea Masuk (IDR) = Nilai Pabean * BM % (0 if preferential tariff exempts BM)
    const effectiveBmRate = context.hasPreferentialTariff ? 0 : Math.max(0, context.bmRatePercent);
    const beaMasukIdr = Math.round(nilaiPabeanIdr * (effectiveBmRate / 100));

    // 3. Nilai Impor (IDR) = Nilai Pabean + Bea Masuk (Tax Base)
    const nilaiImporIdr = nilaiPabeanIdr + beaMasukIdr;

    // 4. PPN (IDR) = Nilai Impor * PPN %
    const ppnRate = Math.max(0, context.ppnRatePercent);
    const ppnIdr = Math.round(nilaiImporIdr * (ppnRate / 100));

    // 5. PPh Pasal 22 Impor (IDR) = Nilai Impor * PPh %
    const pphRate = Math.max(0, context.pphRatePercent);
    const pph22Idr = Math.round(nilaiImporIdr * (pphRate / 100));

    // 6. Total Pajak dalam Rangka Impor (PDRI) + Bea Masuk
    const totalPajakIdr = beaMasukIdr + ppnIdr + pph22Idr;

    return {
      nilaiPabeanIdr,
      beaMasukIdr,
      nilaiImporIdr,
      ppnIdr,
      pph22Idr,
      totalPajakIdr
    };
  }

  /**
   * Calculates aggregated tax summary across multiple classification lines
   */
  public static calculateAggregateTax(
    lines: Array<{
      cif_value_usd: number;
      bm_rate_percent?: number;
      ppn_rate_percent?: number;
      pph_rate_percent?: number;
    }>,
    exchangeRateIdr: number = CustomsTaxCalculator.DEFAULT_EXCHANGE_RATE_IDR
  ): {
    totalCifUsd: number;
    totalNilaiPabeanIdr: number;
    totalBeaMasukIdr: number;
    totalPpnIdr: number;
    totalPphIdr: number;
    totalDutyAndTaxIdr: number;
    calculatedLines: Array<CustomsTaxResult & { itemSequence: number }>;
  } {
    let totalCifUsd = 0;
    let totalNilaiPabeanIdr = 0;
    let totalBeaMasukIdr = 0;
    let totalPpnIdr = 0;
    let totalPphIdr = 0;
    let totalDutyAndTaxIdr = 0;

    const calculatedLines = lines.map((line, idx) => {
      const cifUsd = Number(line.cif_value_usd) || 0;
      totalCifUsd += cifUsd;

      const result = this.calculateLineTax({
        cifValueUsd: cifUsd,
        exchangeRateIdr,
        bmRatePercent: line.bm_rate_percent !== undefined ? Number(line.bm_rate_percent) : 0,
        ppnRatePercent: line.ppn_rate_percent !== undefined ? Number(line.ppn_rate_percent) : this.DEFAULT_PPN_RATE_PERCENT,
        pphRatePercent: line.pph_rate_percent !== undefined ? Number(line.pph_rate_percent) : this.DEFAULT_PPH_RATE_PERCENT
      });

      totalNilaiPabeanIdr += result.nilaiPabeanIdr;
      totalBeaMasukIdr += result.beaMasukIdr;
      totalPpnIdr += result.ppnIdr;
      totalPphIdr += result.pph22Idr;
      totalDutyAndTaxIdr += result.totalPajakIdr;

      return {
        ...result,
        itemSequence: idx + 1
      };
    });

    return {
      totalCifUsd,
      totalNilaiPabeanIdr,
      totalBeaMasukIdr,
      totalPpnIdr,
      totalPphIdr,
      totalDutyAndTaxIdr,
      calculatedLines
    };
  }
}
