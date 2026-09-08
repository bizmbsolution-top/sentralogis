/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA 4.0 Artifact Builder
 * File: lib/domain/customs/ceisa/artifact-builder.ts
 */

import {
  CanonicalCustomsPayload,
  CeisaArtifactFormat,
  CeisaPreparationArtifact
} from './types';
import { CeisaXmlSerializer } from './xml-serializer';
import { CeisaEdiSerializer } from './edi-serializer';

export class CeisaArtifactBuilder {
  /**
   * Builds an immutable preparation artifact in the requested format
   */
  public static buildArtifact(
    payload: CanonicalCustomsPayload,
    format: CeisaArtifactFormat = 'XML'
  ): CeisaPreparationArtifact {
    switch (format) {
      case 'XML':
        return CeisaXmlSerializer.serializeToXml(payload);
      case 'EDI':
        return CeisaEdiSerializer.serializeToEdi(payload);
      case 'JSON':
      default: {
        const jsonContent = JSON.stringify(payload, null, 2);
        const crypto = require('crypto');
        const checksumSha256 = crypto.createHash('sha256').update(jsonContent, 'utf8').digest('hex');
        return {
          format: 'JSON',
          content: jsonContent,
          checksumSha256,
          sizeBytes: Buffer.byteLength(jsonContent, 'utf8'),
          lineCount: payload.lines.length,
          generatedAt: new Date().toISOString(),
          schemaVersion: 'CEISA-4.0-JSON-v1.0',
          messageType: 'PIB_JSON'
        };
      }
    }
  }
}
