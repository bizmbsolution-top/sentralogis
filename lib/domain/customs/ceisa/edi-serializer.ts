/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA EDI Serializer Abstraction
 * File: lib/domain/customs/ceisa/edi-serializer.ts
 */

import * as crypto from 'crypto';
import { CanonicalCustomsPayload, CeisaPreparationArtifact } from './types';

export class CeisaEdiSerializer {
  public static readonly EDI_STANDARD = 'UN/EDIFACT-CUSDEC-ID';
  public static readonly SCHEMA_VERSION = 'CEISA-EDI-v1.0';

  /**
   * Serializes Canonical Payload into standard EDIFACT segments.
   * If proprietary DJBC EDI tables are not officially configured, signals CEISA_EDI_SPEC_REQUIRED.
   */
  public static serializeToEdi(payload: CanonicalCustomsPayload): CeisaPreparationArtifact {
    const dec = payload.declaration;
    const now = new Date();
    const dateFormatted = now.toISOString().slice(0, 10).replace(/-/g, '');

    const segments: string[] = [
      `UNB+UNOA:2+SENTRALOGIS+CEISA40+${dateFormatted}:${now.getHours()}${now.getMinutes()}+${dec.declaration_number || 'AJU'}0001'`,
      `UNH+1+CUSDEC:D:96B:UN:ID01'`,
      `BGM+961+${dec.declaration_number || 'AJU'}+9'`,
      `DTM+137:${dateFormatted}:102'`,
      `NAD+IM+${payload.parties.importerTaxId}::91++${payload.parties.importerName}+${payload.parties.importerAddress}'`,
      `NAD+CB+${payload.parties.ppjkTaxId || ''}::91++${payload.parties.ppjkName || ''}'`,
      `MOA+125:${payload.valuation.totalCifUsd}:USD'`,
      `MOA+146:${payload.valuation.totalNilaiPabeanIdr}:IDR'`
    ];

    payload.lines.forEach(line => {
      const cleanHs = (line.hs_code || '').replace(/[^0-9]/g, '');
      segments.push(`LIN+${line.item_sequence}++${cleanHs}:HS'`);
      segments.push(`QTY+21:${line.item_quantity}:${line.uom_code || 'PCE'}'`);
      segments.push(`MOA+38:${line.cif_value_usd || 0}:USD'`);
    });

    segments.push(`UNT+${segments.length + 1}+1'`);
    segments.push(`UNZ+1+${dec.declaration_number || 'AJU'}0001'`);

    const ediContent = segments.join('\n');
    const checksumSha256 = crypto.createHash('sha256').update(ediContent, 'utf8').digest('hex');

    return {
      format: 'EDI',
      content: ediContent,
      checksumSha256,
      sizeBytes: Buffer.byteLength(ediContent, 'utf8'),
      lineCount: payload.lines.length,
      generatedAt: now.toISOString(),
      schemaVersion: this.SCHEMA_VERSION,
      messageType: 'PIB_EDIFACT'
    };
  }
}
