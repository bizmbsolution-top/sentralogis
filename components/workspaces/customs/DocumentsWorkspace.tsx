'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  FileCheck,
  Calendar,
  Building,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsDocumentCompletenessReport,
  CustomsDocumentType
} from '@/lib/domain/customs/types';

interface DocumentsWorkspaceProps {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  onDocumentsUpdated?: () => void;
  onNavigateTab?: (tabId: string, filter?: string) => void;
}

export function DocumentsWorkspace({
  declaration,
  lines,
  onDocumentsUpdated,
  onNavigateTab
}: DocumentsWorkspaceProps) {
  const [documents, setDocuments] = useState<CustomsDeclarationDocument[]>([]);
  const [completeness, setCompleteness] = useState<CustomsDocumentCompletenessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);

  // New Document Form State
  const [docType, setDocType] = useState<CustomsDocumentType>('INVOICE');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  const fetchDocumentData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/documents?completeness=true`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDocuments(json.data.documents || []);
          setCompleteness(json.data.completeness || null);
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, [declaration.id]);

  useEffect(() => {
    fetchDocumentData();
  }, [fetchDocumentData]);

  // Handle Verify / Reject
  const handleUpdateStatus = async (documentId: string, newStatus: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: `Status updated to ${newStatus}` })
      });
      if (res.ok) {
        fetchDocumentData();
        onDocumentsUpdated?.();
      }
    } catch (err) {
      console.error('Failed to update document status:', err);
    }
  };

  // Handle Delete
  const handleDeleteDoc = async (documentId: string) => {
    if (!confirm('Are you sure you want to unlink this supporting document?')) return;
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/documents/${documentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDocumentData();
        onDocumentsUpdated?.();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Handle Attach Document
  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docType) return;
    setSubmitting(true);

    try {
      const selectedLine = lines.find(l => l.id === selectedLineId);
      const payload: Partial<CustomsDeclarationDocument> = {
        document_type: docType,
        document_number: docNumber || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        issuer_name: issuerName || null,
        classification_line_id: selectedLineId || null,
        item_sequence: selectedLine ? selectedLine.item_sequence : null,
        file_name: fileName || `${docType}_${docNumber || 'DOC'}.pdf`,
        file_reference: `ref_${Date.now()}`,
        verification_status: 'PENDING_REVIEW',
        status: 'UPLOADED',
        notes: notes || null
      };

      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAttachModalOpen(false);
        // Reset form
        setDocNumber('');
        setIssueDate('');
        setExpiryDate('');
        setIssuerName('');
        setSelectedLineId('');
        setFileName('');
        setNotes('');
        fetchDocumentData();
        onDocumentsUpdated?.();
      }
    } catch (err) {
      console.error('Failed to attach document:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch =
      (doc.document_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.document_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.issuer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.file_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || doc.document_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || doc.verification_status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. DOCUMENT CONTROL COCKPIT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completeness</span>
            {completeness?.overallStatus === 'COMPLETE' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> COMPLETE
              </span>
            )}
            {completeness?.overallStatus === 'WARNING' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Clock size={12} /> PENDING REVIEW
              </span>
            )}
            {completeness?.overallStatus === 'INCOMPLETE' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                <AlertCircle size={12} /> INCOMPLETE
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{completeness?.totalVerified || 0}</span>
            <span className="text-xs font-semibold text-slate-500">/ {completeness?.totalRequired || 0} Mandatory Verified</span>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Attached Vault Docs</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{documents.length}</span>
            <span className="text-xs font-semibold text-slate-500">files in vault</span>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Verification</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              {documents.filter(d => d.verification_status === 'PENDING_REVIEW').length}
            </span>
            <span className="text-xs font-semibold text-slate-500">needs review</span>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50/70 border-slate-200 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</span>
          <div className="mt-2 flex items-center gap-2">
            <Button
              onClick={() => setIsAttachModalOpen(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              <Plus size={14} className="mr-1.5" /> Attach Document
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDocumentData}
              disabled={loading}
              className="h-8 w-8 text-slate-600 hover:text-slate-900 border-slate-300 p-0"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </Card>
      </div>

      {/* 2. STATUTORY REQUIREMENT CHECKLIST */}
      {completeness && (
        <Card className="p-5 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Statutory Supporting Document Requirements
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">UU Kepabeanan No. 17/2006 & PMK Standard</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {completeness.requirements.map((req, idx) => {
              const isMet = req.status === 'MET';
              const isPending = req.status === 'PENDING_REVIEW';
              const isMissing = req.status === 'MISSING';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    isMet
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : isPending
                        ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                        : isMissing
                          ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold line-clamp-1">{req.label}</span>
                    {isMet && <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />}
                    {isPending && <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />}
                    {isMissing && <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-semibold">
                      {isMet ? 'Verified' : isPending ? 'Pending Review' : isMissing ? 'Required (Missing)' : 'Not Required'}
                    </span>
                    {req.attachedDocuments.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-white/80 border border-slate-300">
                        {req.attachedDocuments.length} doc{req.attachedDocuments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 3. ATTACHED DOCUMENTS VAULT TABLE */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Document Vault Registry ({filteredDocs.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search document no, issuer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-48"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="INVOICE">Commercial Invoice</option>
              <option value="PACKING_LIST">Packing List</option>
              <option value="BL_AWB">B/L / AWB</option>
              <option value="COO_FORM_D">COO Form D</option>
              <option value="COO_FORM_E">COO Form E</option>
              <option value="PERMIT">Trade Permit</option>
              <option value="MSDS">MSDS / Spec</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Document Type</th>
                <th className="py-2.5 px-4">Document Number</th>
                <th className="py-2.5 px-4">Issue / Expiry Date</th>
                <th className="py-2.5 px-4">Issuer / Authority</th>
                <th className="py-2.5 px-4">Line Linkage</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No supporting documents match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <FileText size={13} className="text-indigo-600" />
                        <span>{doc.document_type}</span>
                      </div>
                      {doc.file_name && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {doc.file_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {doc.document_number || <span className="text-slate-400 italic">No number declared</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col text-[11px] font-medium text-slate-600">
                        <span>Issued: {doc.issue_date || '-'}</span>
                        {doc.expiry_date && (
                          <span className="text-rose-600 font-bold text-[10px]">
                            Exp: {doc.expiry_date}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {doc.issuer_name || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {doc.item_sequence ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                          <Tag size={10} /> Line #{doc.item_sequence}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Declaration Level</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {doc.verification_status === 'VERIFIED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check size={11} /> VERIFIED
                        </span>
                      )}
                      {doc.verification_status === 'PENDING_REVIEW' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock size={11} /> PENDING REVIEW
                        </span>
                      )}
                      {doc.verification_status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <X size={11} /> REJECTED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {doc.verification_status !== 'VERIFIED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(doc.id, 'VERIFIED')}
                            className="h-7 px-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <Check size={12} className="mr-1" /> Verify
                          </Button>
                        )}
                        {doc.verification_status !== 'REJECTED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(doc.id, 'REJECTED')}
                            className="h-7 px-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          >
                            <X size={12} className="mr-1" /> Reject
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. ATTACH DOCUMENT MODAL */}
      {isAttachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Attach Supporting Customs Document</h3>
              </div>
              <button
                onClick={() => setIsAttachModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAttachSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Type *</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as CustomsDocumentType)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-semibold bg-white"
                  >
                    <option value="INVOICE">Commercial Invoice</option>
                    <option value="PACKING_LIST">Packing List</option>
                    <option value="BL_AWB">Bill of Lading / Air Waybill</option>
                    <option value="COO_FORM_D">Certificate of Origin (Form D)</option>
                    <option value="COO_FORM_E">Certificate of Origin (Form E)</option>
                    <option value="COO_FORM_AK">Certificate of Origin (Form AK)</option>
                    <option value="PERMIT">Trade / Import Permit (PI / LS)</option>
                    <option value="MSDS">Material Safety Data Sheet (MSDS)</option>
                    <option value="SPEC">Technical Specifications</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-001"
                    value={docNumber}
                    onChange={e => setDocNumber(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date (if permit)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issuer / Authority</label>
                  <input
                    type="text"
                    placeholder="e.g. Kemendag, Sucofindo"
                    value={issuerName}
                    onChange={e => setIssuerName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Link to Line Item</label>
                  <select
                    value={selectedLineId}
                    onChange={e => setSelectedLineId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="">(All Lines / Declaration Level)</option>
                    {lines.map(l => (
                      <option key={l.id} value={l.id}>
                        Line #{l.item_sequence}: {l.sku_code || l.hs_code} - {l.goods_description.slice(0, 25)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">File Name / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Commercial_Invoice_Signed.pdf"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification Notes</label>
                <textarea
                  placeholder="Optional verification remarks or regulatory notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAttachModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  {submitting ? 'Attaching...' : 'Save Document to Vault'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
