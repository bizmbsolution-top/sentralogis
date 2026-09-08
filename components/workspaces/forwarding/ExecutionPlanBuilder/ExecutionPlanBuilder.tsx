import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import {
  ExecutionPlan,
  ExecutionLeg,
  LegUnitAllocation,
  ShipmentUnit,
  CreateExecutionLegDTO
} from '@/lib/domain/shipment/types';
import {
  fetchExecutionPlan,
  saveOrReplaceExecutionPlan,
  deleteExecutionLeg,
  assignUnitsToLeg
} from '@/lib/api/execution-plan';
import { ExecutionPlanGraph } from '../ExecutionPlanGraph';
import { ExecutionLegCard } from './ExecutionLegCard';
import { ExecutionLegEditor } from './ExecutionLegEditor';
import { LegDependencyValidator, PlanValidationResult } from './LegDependencyValidator';

interface ExecutionPlanBuilderProps {
  shipmentId: string;
  units: ShipmentUnit[];
  onPlanUpdated?: () => void;
}

export const ExecutionPlanBuilder: React.FC<ExecutionPlanBuilderProps> = ({
  shipmentId,
  units = [],
  onPlanUpdated
}) => {
  const [legs, setLegs] = useState<ExecutionLeg[]>([]);
  const [allocations, setAllocations] = useState<LegUnitAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLeg, setEditingLeg] = useState<ExecutionLeg | null>(null);
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchExecutionPlan(shipmentId);
      setLegs(data.legs || []);
      setAllocations(data.allocations || []);
    } catch (err: any) {
      console.error('Failed to fetch execution plan:', err);
      setError(err.message || 'Could not load execution plan.');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Pre-flight Client Validation
  const validation: PlanValidationResult = useMemo(() => {
    return LegDependencyValidator.validate(legs);
  }, [legs]);

  const handleOpenAddModal = () => {
    setEditingLeg(null);
    setEditorOpen(true);
  };

  const handleOpenEditModal = (leg: ExecutionLeg) => {
    setEditingLeg(leg);
    setEditorOpen(true);
  };

  const handleSaveLegFromEditor = (legData: CreateExecutionLegDTO, allocatedUnitIds: string[]) => {
    if (editingLeg) {
      // Update local state for existing leg
      setLegs(prev =>
        prev.map(l =>
          l.id === editingLeg.id
            ? {
                ...l,
                ...legData,
                transport_mode: legData.transport_mode,
                execution_provider_type: legData.execution_provider_type || 'INTERNAL_SBU',
                origin_location_id: legData.origin_location_id,
                destination_location_id: legData.destination_location_id
              }
            : l
        )
      );
    } else {
      // Add new leg to local state
      const tempId = `temp_leg_${Date.now()}`;
      const newLeg: ExecutionLeg = {
        id: tempId,
        tenant_id: 'current',
        shipment_id: shipmentId,
        execution_plan_id: 'plan_active',
        leg_sequence: legs.length + 1,
        leg_code: legData.leg_code || `LEG-${String(legs.length + 1).padStart(2, '0')}`,
        transport_mode: legData.transport_mode,
        execution_provider_type: legData.execution_provider_type || 'INTERNAL_SBU',
        origin_location_id: legData.origin_location_id,
        destination_location_id: legData.destination_location_id,
        assigned_vendor_id: null,
        planned_start_at: legData.planned_start_at || null,
        planned_end_at: legData.planned_end_at || null,
        actual_start_at: null,
        actual_end_at: null,
        status: 'PLANNED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setLegs(prev => [...prev, newLeg]);
    }
  };

  const handleDeleteLeg = async (legId: string) => {
    if (legId.startsWith('temp_')) {
      setLegs(prev => prev.filter(l => l.id !== legId).map((l, idx) => ({ ...l, leg_sequence: idx + 1 })));
      return;
    }

    try {
      setSaving(true);
      await deleteExecutionLeg(shipmentId, legId);
      await loadPlan();
      if (onPlanUpdated) onPlanUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete execution leg');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLegs(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((l, idx) => ({ ...l, leg_sequence: idx + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= legs.length - 1) return;
    setLegs(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((l, idx) => ({ ...l, leg_sequence: idx + 1 }));
    });
  };

  // Save / Replace Execution Plan to Database Atomically
  const handleSavePlan = async () => {
    if (!validation.isValid) {
      setError('Please fix all validation errors before saving the execution plan.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const legsDto: CreateExecutionLegDTO[] = legs.map((l, idx) => ({
        leg_sequence: idx + 1,
        leg_code: l.leg_code,
        transport_mode: l.transport_mode,
        execution_provider_type: l.execution_provider_type,
        origin_location_id: l.origin_location_id,
        destination_location_id: l.destination_location_id,
        planned_start_at: l.planned_start_at || undefined,
        planned_end_at: l.planned_end_at || undefined,
        aircraft_name: l.aircraft_name || undefined,
        flight_number: l.flight_number || undefined
      }));

      await saveOrReplaceExecutionPlan(shipmentId, legsDto);

      setSuccessMsg('Execution plan validated and saved successfully.');
      await loadPlan();
      if (onPlanUpdated) onPlanUpdated();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      setError(err.message || 'Failed to save execution plan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Loading Execution Plan & Multi-Modal Journey...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Directed Graph */}
      <ExecutionPlanGraph
        legs={legs}
        selectedLegId={selectedLegId}
        onSelectLeg={id => {
          const found = legs.find((l, idx) => l.id === id || idx === Number(id));
          if (found) handleOpenEditModal(found);
        }}
      />

      {/* Validation Banner (Errors or Warnings) */}
      {validation.errors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1 text-xs text-rose-800">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Execution Plan Sequence Incomplete</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
            {validation.errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1 text-xs text-amber-800">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Operational Warnings</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
            {validation.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-xs text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadPlan}
            className="text-red-700 underline font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Journey Legs ({legs.length})
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Define multi-modal segments, corridor transitions, and carrier handoffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPlan}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors"
            title="Reload Plan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add Journey Leg</span>
          </button>
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={saving || !validation.isValid}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Execution Plan</span>
          </button>
        </div>
      </div>

      {/* Leg Cards Grid */}
      {legs.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-400 text-xs">
          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-700 text-sm">No execution legs configured</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Click below to add your first journey leg.</p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Leg</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {legs.map((leg, idx) => {
            const legAllocations = allocations.filter(a => a.execution_leg_id === leg.id);
            const allocatedUnits = units.filter(u => legAllocations.some(a => a.unit_id === u.id));

            return (
              <ExecutionLegCard
                key={leg.id || idx}
                leg={leg}
                index={idx}
                totalLegs={legs.length}
                allocatedUnits={allocatedUnits}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteLeg}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            );
          })}
        </div>
      )}

      {/* Leg Editor Modal */}
      <ExecutionLegEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveLegFromEditor}
        initialLeg={editingLeg}
        availableUnits={units}
        currentAllocatedUnitIds={
          editingLeg
            ? allocations.filter(a => a.execution_leg_id === editingLeg.id).map(a => a.unit_id)
            : []
        }
        nextSequence={legs.length + 1}
      />
    </div>
  );
};
