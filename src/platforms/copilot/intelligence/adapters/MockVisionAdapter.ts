export class MockVisionAdapter {
  static async extractTextFromImage(filename: string, mimeType: string, base64Data: string): Promise<string> {
    const lowerName = filename.toLowerCase();
    
    // Simulate OCR text extraction based on filename hints
    if (lowerName.includes('pod') || lowerName.includes('delivery')) {
      return `BUKTI PENGIRIMAN BARANG\nNomor JO: JO-123\nPenerima: Budi\nWaktu: 14:30\nStatus: Diterima dengan baik`;
    }

    if (lowerName.includes('surat') || lowerName.includes('jalan')) {
      return `SURAT JALAN\nNo: SJ-99182\nPengirim: PT Global Logistik\nTujuan: Gudang Cikarang\nPlat Nomor: B9123CD\nSopir: Anton`;
    }

    if (lowerName.includes('container') || lowerName.includes('seal')) {
      return `CONTAINER INSPECTION\nContainer No: TGHU 817263-5\nSeal: 9182736\nType: 40HC\nCondition: OK`;
    }

    return "Extracted text: \n(Unrecognized Document Type)\n" + filename;
  }
}
