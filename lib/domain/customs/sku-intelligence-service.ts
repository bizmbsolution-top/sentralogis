/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/sku-intelligence-service.ts
 * Description: Master Product Memory, Reusable SKU Intelligence & Historical Classification Engine
 */

import { CustomsSkuIntelligence, CustomsSkuClassificationHistory } from './types';

export interface SkuMatchResult {
  sku_code: string;
  matched: boolean;
  match_type: 'EXACT_SKU' | 'SKU_MANUFACTURER' | 'SKU_SUPPLIER' | 'FINGERPRINT' | 'NONE';
  confidence_score: number; // 0.00 to 1.00
  suggested_hs_code?: string;
  normalized_description?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
  supplier?: string;
  country_of_origin?: string;
  preferred_uom?: string;
  classification_rationale?: string;
  historical_declarations_count: number;
  historical_hs_usage: Array<{ hs_code: string; count: number; percentage: number }>;
  average_unit_price_usd?: number;
  historical_price_range?: { min: number; max: number };
  sku_intelligence_id?: string;
}

export interface SkuCatalogRegistrationDTO {
  tenant_id: string;
  importer_id: string;
  customer_id?: string;
  sku_code: string;
  normalized_description: string;
  original_description?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
  supplier?: string;
  country_of_origin?: string;
  preferred_uom?: string;
  suggested_hs_code: string;
  classification_rationale?: string;
  unit_price_usd?: number;
  reviewed_by?: string;
}

export class SkuIntelligenceService {
  /**
   * Generates a deterministic normalized product fingerprint for fuzzy/cross-reference matching
   */
  public static generateProductFingerprint(importerId: string, skuCode: string, brand?: string, model?: string): string {
    const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${norm(importerId)}:${norm(skuCode)}:${norm(brand)}:${norm(model)}`;
  }

  /**
   * Evaluates deterministic match and computes confidence score for a candidate item
   */
  public matchSku(
    importerId: string,
    skuCode: string,
    context: {
      brand?: string;
      model?: string;
      manufacturer?: string;
      supplier?: string;
      unitPriceUsd?: number;
    },
    knownCatalog: CustomsSkuIntelligence[],
    historyRecords: CustomsSkuClassificationHistory[] = []
  ): SkuMatchResult {
    const cleanSku = (skuCode || '').trim().toUpperCase();
    if (!cleanSku) {
      return {
        sku_code: '',
        matched: false,
        match_type: 'NONE',
        confidence_score: 0,
        historical_declarations_count: 0,
        historical_hs_usage: []
      };
    }

    // Filter catalog for this importer
    const importerCatalog = knownCatalog.filter(c => c.importer_id === importerId && c.is_active);

    // 1. Exact Match on SKU code
    const exactMatch = importerCatalog.find(c => c.sku_code.toUpperCase() === cleanSku);
    if (exactMatch) {
      const historicalUsage = this.computeHistoricalUsage(cleanSku, historyRecords);
      const priceStats = this.computeHistoricalPrices(cleanSku, historyRecords);

      return {
        sku_code: cleanSku,
        matched: true,
        match_type: 'EXACT_SKU',
        confidence_score: exactMatch.classification_confidence || 1.00,
        suggested_hs_code: exactMatch.suggested_hs_code || undefined,
        normalized_description: exactMatch.normalized_description,
        brand: exactMatch.brand || undefined,
        model: exactMatch.model || undefined,
        manufacturer: exactMatch.manufacturer || undefined,
        supplier: exactMatch.supplier || undefined,
        country_of_origin: exactMatch.country_of_origin,
        preferred_uom: exactMatch.preferred_uom,
        classification_rationale: exactMatch.classification_rationale || undefined,
        historical_declarations_count: exactMatch.total_declarations_count || historicalUsage.reduce((a, b) => a + b.count, 0),
        historical_hs_usage: historicalUsage,
        average_unit_price_usd: exactMatch.average_unit_price_usd || priceStats.avg,
        historical_price_range: (priceStats.min !== undefined && priceStats.max !== undefined) ? { min: priceStats.min, max: priceStats.max } : undefined,
        sku_intelligence_id: exactMatch.id
      };
    }

    // 2. Normalized SKU + Manufacturer match
    if (context.manufacturer) {
      const mfgNorm = context.manufacturer.trim().toLowerCase();
      const mfgMatch = importerCatalog.find(c =>
        c.manufacturer && c.manufacturer.trim().toLowerCase() === mfgNorm &&
        (c.sku_code.toUpperCase().includes(cleanSku) || cleanSku.includes(c.sku_code.toUpperCase()))
      );
      if (mfgMatch) {
        return {
          sku_code: cleanSku,
          matched: true,
          match_type: 'SKU_MANUFACTURER',
          confidence_score: 0.95,
          suggested_hs_code: mfgMatch.suggested_hs_code || undefined,
          normalized_description: mfgMatch.normalized_description,
          brand: mfgMatch.brand || undefined,
          model: mfgMatch.model || undefined,
          manufacturer: mfgMatch.manufacturer || undefined,
          supplier: mfgMatch.supplier || undefined,
          country_of_origin: mfgMatch.country_of_origin,
          preferred_uom: mfgMatch.preferred_uom,
          classification_rationale: mfgMatch.classification_rationale || undefined,
          historical_declarations_count: mfgMatch.total_declarations_count,
          historical_hs_usage: [{ hs_code: mfgMatch.suggested_hs_code || '', count: mfgMatch.total_declarations_count, percentage: 100 }],
          sku_intelligence_id: mfgMatch.id
        };
      }
    }

    // 3. Normalized SKU + Supplier match
    if (context.supplier) {
      const supNorm = context.supplier.trim().toLowerCase();
      const supMatch = importerCatalog.find(c =>
        c.supplier && c.supplier.trim().toLowerCase() === supNorm &&
        (c.sku_code.toUpperCase().includes(cleanSku) || cleanSku.includes(c.sku_code.toUpperCase()))
      );
      if (supMatch) {
        return {
          sku_code: cleanSku,
          matched: true,
          match_type: 'SKU_SUPPLIER',
          confidence_score: 0.90,
          suggested_hs_code: supMatch.suggested_hs_code || undefined,
          normalized_description: supMatch.normalized_description,
          brand: supMatch.brand || undefined,
          model: supMatch.model || undefined,
          manufacturer: supMatch.manufacturer || undefined,
          supplier: supMatch.supplier || undefined,
          country_of_origin: supMatch.country_of_origin,
          preferred_uom: supMatch.preferred_uom,
          classification_rationale: supMatch.classification_rationale || undefined,
          historical_declarations_count: supMatch.total_declarations_count,
          historical_hs_usage: [{ hs_code: supMatch.suggested_hs_code || '', count: supMatch.total_declarations_count, percentage: 100 }],
          sku_intelligence_id: supMatch.id
        };
      }
    }

    // 4. Strong Product Fingerprint match
    const targetFingerprint = SkuIntelligenceService.generateProductFingerprint(importerId, cleanSku, context.brand, context.model);
    const fingerprintMatch = importerCatalog.find(c =>
      SkuIntelligenceService.generateProductFingerprint(c.importer_id, c.sku_code, c.brand || undefined, c.model || undefined) === targetFingerprint
    );
    if (fingerprintMatch) {
      return {
        sku_code: cleanSku,
        matched: true,
        match_type: 'FINGERPRINT',
        confidence_score: 0.85,
        suggested_hs_code: fingerprintMatch.suggested_hs_code || undefined,
        normalized_description: fingerprintMatch.normalized_description,
        brand: fingerprintMatch.brand || undefined,
        model: fingerprintMatch.model || undefined,
        country_of_origin: fingerprintMatch.country_of_origin,
        preferred_uom: fingerprintMatch.preferred_uom,
        historical_declarations_count: fingerprintMatch.total_declarations_count,
        historical_hs_usage: [{ hs_code: fingerprintMatch.suggested_hs_code || '', count: fingerprintMatch.total_declarations_count, percentage: 100 }],
        sku_intelligence_id: fingerprintMatch.id
      };
    }

    // No match found in catalog
    return {
      sku_code: cleanSku,
      matched: false,
      match_type: 'NONE',
      confidence_score: 0,
      historical_declarations_count: 0,
      historical_hs_usage: []
    };
  }

  /**
   * Batch match helper for 100–10,000+ items without N+1 overhead
   */
  public batchMatch(
    importerId: string,
    items: Array<{ sku_code: string; brand?: string; model?: string; manufacturer?: string; supplier?: string }>,
    knownCatalog: CustomsSkuIntelligence[],
    historyRecords: CustomsSkuClassificationHistory[] = []
  ): Map<string, SkuMatchResult> {
    const resultMap = new Map<string, SkuMatchResult>();
    for (const item of items) {
      const res = this.matchSku(importerId, item.sku_code, item, knownCatalog, historyRecords);
      resultMap.set(item.sku_code.toUpperCase(), res);
    }
    return resultMap;
  }

  /**
   * Aggregates historical HS code usage frequency across prior declarations
   */
  private computeHistoricalUsage(
    skuCode: string,
    historyRecords: CustomsSkuClassificationHistory[]
  ): Array<{ hs_code: string; count: number; percentage: number }> {
    const matched = historyRecords.filter(r => r.sku_code.toUpperCase() === skuCode);
    if (matched.length === 0) return [];

    const counts = new Map<string, number>();
    for (const r of matched) {
      counts.set(r.hs_code, (counts.get(r.hs_code) || 0) + 1);
    }

    const total = matched.length;
    const result: Array<{ hs_code: string; count: number; percentage: number }> = [];
    for (const [hs_code, count] of counts.entries()) {
      result.push({
        hs_code,
        count,
        percentage: Math.round((count / total) * 100)
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }

  /**
   * Aggregates historical import price statistics
   */
  private computeHistoricalPrices(
    skuCode: string,
    historyRecords: CustomsSkuClassificationHistory[]
  ): { min?: number; max?: number; avg?: number } {
    const prices = historyRecords
      .filter(r => r.sku_code.toUpperCase() === skuCode && r.unit_price_usd !== null && r.unit_price_usd !== undefined && r.unit_price_usd > 0)
      .map(r => Number(r.unit_price_usd));

    if (prices.length === 0) return {};

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return { min, max, avg: Math.round(avg * 100) / 100 };
  }
}
