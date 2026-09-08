/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA 4.0 Deterministic XML Serializer (PIB BC 2.0)
 * File: lib/domain/customs/ceisa/xml-serializer.ts
 */

import * as crypto from 'crypto';
import { CanonicalCustomsPayload, CeisaPreparationArtifact } from './types';
import { CeisaCodeSets } from './codesets';

export class CeisaXmlSerializer {
  public static readonly XML_NAMESPACE = 'urn:customs.go.id:ceisa:4.0:pib';
  public static readonly SCHEMA_VERSION = 'CEISA-4.0-XML-v1.0';

  /**
   * Escapes special characters for safe XML output
   */
  private static escapeXml(unsafe?: string | null): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Deterministically serializes Canonical Customs Payload into DJBC CEISA 4.0 XML
   */
  public static serializeToXml(payload: CanonicalCustomsPayload): CeisaPreparationArtifact {
    const dec = payload.declaration;
    const val = payload.valuation;
    const parties = payload.parties;
    const transport = payload.transport;

    const linesXml = payload.lines
      .slice()
      .sort((a, b) => a.item_sequence - b.item_sequence)
      .map(line => {
        const cleanHs = (line.hs_code || '').replace(/[^0-9]/g, '');
        const permitDoc = payload.documents.find(
          d => (d.classification_line_id === line.id || d.item_sequence === line.item_sequence) && d.document_type === 'PERMIT'
        );

        return `    <Item serNo="${line.item_sequence}">
      <hsCode>${this.escapeXml(cleanHs)}</hsCode>
      <uraianBarang>${this.escapeXml(line.goods_description)}</uraianBarang>
      <merk>${this.escapeXml(line.brand || '')}</merk>
      <tipe>${this.escapeXml(line.model || '')}</tipe>
      <jumlahSatuan>${Number(line.item_quantity || 0).toFixed(4)}</jumlahSatuan>
      <kodeSatuan>${this.escapeXml(line.uom_code || 'PCE')}</kodeSatuan>
      <hargaSatuanUsd>${Number(line.unit_price_usd || 0).toFixed(4)}</hargaSatuanUsd>
      <nilaiCifUsd>${Number(line.cif_value_usd || 0).toFixed(2)}</nilaiCifUsd>
      <negaraAsal>${this.escapeXml(line.country_of_origin || 'CN')}</negaraAsal>
      <tarif>
        <bmPercent>${Number(line.bm_rate_percent || 0).toFixed(2)}</bmPercent>
        <ppnPercent>${Number(line.ppn_rate_percent || 11).toFixed(2)}</ppnPercent>
        <pphPercent>${Number(line.pph_rate_percent || 2.5).toFixed(2)}</pphPercent>
      </tarif>
      <lartas>
        <isRestricted>${line.lartas_flag ? 'true' : 'false'}</isRestricted>
        <nomorIzin>${this.escapeXml(permitDoc ? permitDoc.document_number : '')}</nomorIzin>
      </lartas>
    </Item>`;
      })
      .join('\n');

    const docsXml = payload.documents
      .slice()
      .sort((a, b) => (a.document_type || '').localeCompare(b.document_type || ''))
      .map((doc, idx) => {
        const resolvedDoc = CeisaCodeSets.resolveDocumentCode(doc.document_type);
        return `    <Dokumen serNo="${idx + 1}">
      <kodeDokumen>${this.escapeXml(resolvedDoc.code)}</kodeDokumen>
      <nomorDokumen>${this.escapeXml(doc.document_number || '')}</nomorDokumen>
      <tanggalDokumen>${this.escapeXml(doc.issue_date || '')}</tanggalDokumen>
      <statusVerifikasi>${this.escapeXml(doc.verification_status || 'PENDING_REVIEW')}</statusVerifikasi>
    </Dokumen>`;
      })
      .join('\n');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<DokumenPabean xmlns="${this.XML_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <nomorAju>${this.escapeXml(dec.declaration_number || '')}</nomorAju>
    <kodeDokumen>${dec.declaration_type === 'PIB_IMPORT' ? '20' : '30'}</kodeDokumen>
    <kodeKantor>${this.escapeXml(dec.customs_office_code || '040300')}</kodeKantor>
    <importir>
      <nama>${this.escapeXml(parties.importerName)}</nama>
      <npwp>${this.escapeXml(parties.importerTaxId)}</npwp>
      <alamat>${this.escapeXml(parties.importerAddress)}</alamat>
    </importir>
    <ppjk>
      <nama>${this.escapeXml(parties.ppjkName || '')}</nama>
      <npwp>${this.escapeXml(parties.ppjkTaxId || '')}</npwp>
    </ppjk>
    <pengangkut>
      <caraAngkut>${this.escapeXml(transport.transportMode)}</caraAngkut>
      <namaSaranaPengangkut>${this.escapeXml(transport.vesselName || '')}</namaSaranaPengangkut>
      <nomorVoyFlight>${this.escapeXml(transport.voyageFlightNumber || '')}</nomorVoyFlight>
      <pelabuhanMuat>${this.escapeXml(transport.loadingPortCode || '')}</pelabuhanMuat>
      <pelabuhanBongkar>${this.escapeXml(transport.dischargePortCode || '')}</pelabuhanBongkar>
    </pengangkut>
    <nilaiPabean>
      <totalFobUsd>${val.totalFobUsd.toFixed(2)}</totalFobUsd>
      <totalFreightUsd>${val.totalFreightUsd.toFixed(2)}</totalFreightUsd>
      <totalInsuranceUsd>${val.totalInsuranceUsd.toFixed(2)}</totalInsuranceUsd>
      <totalCifUsd>${val.totalCifUsd.toFixed(2)}</totalCifUsd>
      <kursPajakKmkIdr>${val.kursPajakKmkIdr.toFixed(2)}</kursPajakKmkIdr>
      <totalNilaiPabeanIdr>${val.totalNilaiPabeanIdr.toFixed(0)}</totalNilaiPabeanIdr>
      <totalNilaiImporIdr>${val.totalNilaiImporIdr.toFixed(0)}</totalNilaiImporIdr>
    </nilaiPabean>
    <pungutan>
      <totalBeaMasukIdr>${val.totalBeaMasukIdr.toFixed(0)}</totalBeaMasukIdr>
      <totalPpnIdr>${val.totalPpnIdr.toFixed(0)}</totalPpnIdr>
      <totalPph22Idr>${val.totalPph22Idr.toFixed(0)}</totalPph22Idr>
      <totalPungutanIdr>${val.totalPungutanPabeanIdr.toFixed(0)}</totalPungutanIdr>
    </pungutan>
  </Header>
  <Barang>
${linesXml}
  </Barang>
  <DokumenLampiran>
${docsXml}
  </DokumenLampiran>
</DokumenPabean>`;

    // Deterministic SHA-256 Checksum
    const checksumSha256 = crypto.createHash('sha256').update(xmlContent, 'utf8').digest('hex');
    const sizeBytes = Buffer.byteLength(xmlContent, 'utf8');

    return {
      format: 'XML',
      content: xmlContent,
      checksumSha256,
      sizeBytes,
      lineCount: payload.lines.length,
      generatedAt: new Date().toISOString(),
      schemaVersion: this.SCHEMA_VERSION,
      messageType: 'PIB_BC20'
    };
  }
}
