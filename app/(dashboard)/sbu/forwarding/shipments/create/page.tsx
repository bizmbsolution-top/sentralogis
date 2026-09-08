'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Globe,
  Save
} from 'lucide-react';
import {
  CreateUnitDTO,
  CreateExecutionLegDTO,
  IncotermType
} from '@/lib/domain/shipment/types';
import { createShipment } from '@/lib/api/forwarding-shipments';
import { ShipmentIdentityForm } from '@/components/workspaces/forwarding/ShipmentCreator/ShipmentIdentityForm';
import { CargoComposer } from '@/components/workspaces/forwarding/ShipmentCreator/CargoComposer';
import { JourneyComposer } from '@/components/workspaces/forwarding/ShipmentCreator/JourneyComposer';
import { ServiceRequirements } from '@/components/workspaces/forwarding/ShipmentCreator/ServiceRequirements';
import { ShipmentReview } from '@/components/workspaces/forwarding/ShipmentCreator/ShipmentReview';
import { ShipmentSummary } from '@/components/workspaces/forwarding/ShipmentCreator/ShipmentSummary';

export default function CreateShipmentWorkspacePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Aggregate State — NO fabricated canonical IDs; server resolves via U-03
  const [identityData, setIdentityData] = useState({
    customer_id: '',
    customer_name: '',
    origin_location_id: 'CNSHA',
    destination_location_id: 'IDPTB',
    incoterm: 'FOB' as IncotermType,
    booking_reference: '',
    master_bl_number: '',
    house_bl_number: '',
    etd: '',
    eta: '',
    notes: ''
  });

  const [units, setUnits] = useState<CreateUnitDTO[]>([
    {
      unit_type: 'CONTAINER',
      unit_identifier: 'CONT-TEMU-1234567',
      container_number: 'TEMU1234567',
      iso_type: '40HC',
      seal_number: 'SEAL-8899',
      tare_weight_kg: 3800,
      total_gross_weight_kg: 28000
    }
  ]);

  const [legs, setLegs] = useState<CreateExecutionLegDTO[]>([
    {
      leg_sequence: 1,
      leg_code: 'LEG-01-OCEAN',
      transport_mode: 'OCEAN_VESSEL',
      origin_location_id: 'CNSHA',
      destination_location_id: 'IDPTB'
    },
    {
      leg_sequence: 2,
      leg_code: 'LEG-02-ROAD',
      transport_mode: 'ROAD_TRUCK',
      origin_location_id: 'IDPTB',
      destination_location_id: 'IDBYD'
    }
  ]);

  const [selectedServices, setSelectedServices] = useState<string[]>([
    'SEA_OCEAN_FREIGHT',
    'CUS_IMPORT_PIB_STANDARD',
    'TRK_DEST_DELIVERY'
  ]);

  const handleIdentityChange = (field: string, value: any) => {
    setIdentityData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddUnit = (unit: CreateUnitDTO) => {
    setUnits(prev => [...prev, unit]);
  };

  const handleRemoveUnit = (index: number) => {
    setUnits(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddLeg = (leg: CreateExecutionLegDTO) => {
    setLegs(prev => [...prev, leg]);
  };

  const handleRemoveLeg = (index: number) => {
    setLegs(prev => prev.filter((_, idx) => idx !== index).map((l, i) => ({ ...l, leg_sequence: i + 1 })));
  };

  const handleToggleService = (key: string) => {
    setSelectedServices(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Submit and Create Shipment via Canonical API
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const idempotencyKey = `create-shp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const manifestItems = units.map(u => {
        let commodityName = 'General Cargo';
        let packageQuantity = 1;
        let packageType = 'UNIT';

        if (u.unit_type === 'CONTAINER') {
          commodityName = 'Containerized Cargo';
          packageType = 'CONTAINER';
        } else if (u.unit_type === 'VEHICLE') {
          commodityName = u.vehicle_model;
          packageType = 'VEHICLE';
        } else if (u.unit_type === 'BULK_MT') {
          commodityName = u.bulk_type;
          packageType = 'BULK_MT';
        } else if (u.unit_type === 'PALLET' || u.unit_type === 'BOX' || u.unit_type === 'BREAKBULK') {
          commodityName = u.package_type;
          packageQuantity = u.colli_count;
          packageType = u.unit_type;
        }

        return {
          commodity_name: commodityName,
          package_quantity: packageQuantity,
          package_type: packageType,
          gross_weight_kg: Number(u.total_gross_weight_kg) || 1000,
          volume_cbm: Number(u.total_volume_cbm) || 30.0
        };
      });

      const res = await createShipment(
        {
          customer_id: identityData.customer_id,
          origin_location_id: identityData.origin_location_id,
          destination_location_id: identityData.destination_location_id,
          booking_reference: identityData.booking_reference || undefined,
          master_bl_number: identityData.master_bl_number || undefined,
          house_bl_number: identityData.house_bl_number || undefined,
          etd: identityData.etd ? `${identityData.etd}T00:00:00Z` : undefined,
          eta: identityData.eta ? `${identityData.eta}T00:00:00Z` : undefined,
          manifest_items: manifestItems,
          units: units,
          execution_legs: legs
        },
        idempotencyKey
      );

      // Successfully created -> Navigate to directory or detail
      if (res.data?.shipment?.id) {
        router.push(`/sbu/forwarding/shipments`);
      } else {
        router.push(`/sbu/forwarding/shipments`);
      }
    } catch (err: any) {
      console.error('Shipment creation error:', err);
      setErrorMessage(err.message || 'An error occurred while creating the shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Cargo' },
    { num: 3, label: 'Journey' },
    { num: 4, label: 'Services' },
    { num: 5, label: 'Review' }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* HEADER SECTION */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/sbu/forwarding/shipments"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Back to Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Logistics Command Composer
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Create Canonical Shipment
            </h1>
          </div>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-1 sm:gap-2">
          {STEPS.map(s => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>0{s.num}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2-COLUMN WORKSPACE: LEFT (EDITOR) + RIGHT (LIVE SUMMARY) */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Interactive Form Area (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-8">
          {currentStep === 1 && (
            <ShipmentIdentityForm formData={identityData} onChange={handleIdentityChange} />
          )}

          {currentStep === 2 && (
            <CargoComposer units={units} onAddUnit={handleAddUnit} onRemoveUnit={handleRemoveUnit} />
          )}

          {currentStep === 3 && (
            <JourneyComposer
              legs={legs}
              originDefault={identityData.origin_location_id}
              destinationDefault={identityData.destination_location_id}
              onAddLeg={handleAddLeg}
              onRemoveLeg={handleRemoveLeg}
            />
          )}

          {currentStep === 4 && (
            <ServiceRequirements
              selectedServices={selectedServices}
              onToggleService={handleToggleService}
            />
          )}

          {currentStep === 5 && (
            <ShipmentReview
              formData={identityData}
              units={units}
              legs={legs}
              services={selectedServices}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={errorMessage}
            />
          )}

          {/* Stepper Navigation Footer */}
          <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous Step
            </button>

            {currentStep < 5 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
              >
                <span>Continue to Step 0{currentStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Sticky Summary Panel (1 Column) */}
        <div className="lg:col-span-1">
          <ShipmentSummary
            formData={identityData}
            units={units}
            legs={legs}
            services={selectedServices}
          />
        </div>
      </div>
    </div>
  );
}
