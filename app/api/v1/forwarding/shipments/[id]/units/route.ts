import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { ShipmentFactory } from '@/lib/domain/shipment/shipment-factory';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  CreateUnitDTO,
  ContainerUnit,
  BulkUnit,
  PackageUnit,
  VehicleUnit
} from '@/lib/domain/shipment/types';

const service = new ShipmentService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;

    const aggregate = await service.getShipment(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: aggregate.units,
      meta: {
        total: aggregate.units.length,
        shipment_id: id
      }
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    // Verify shipment exists and belongs to tenant
    await service.getShipment(id, auth.tenantId);

    const unitsDto: CreateUnitDTO[] = Array.isArray(body.units) ? body.units : [body];
    const createdUnits = ShipmentFactory.createUnitEntities(id, auth.tenantId, unitsDto);

    // 1. Insert Base Units
    const { error: baseError } = await supabaseAdmin.from('shp_units').insert(
      createdUnits.map(u => ({
        id: u.id,
        tenant_id: u.tenant_id,
        shipment_id: u.shipment_id,
        unit_type: u.unit_type,
        unit_identifier: u.unit_identifier,
        total_gross_weight_kg: u.total_gross_weight_kg,
        total_volume_cbm: u.total_volume_cbm,
        status: u.status
      }))
    );

    if (baseError) throw new Error(`Failed to insert units: ${baseError.message}`);

    // 2. Insert Subtype Tables (Table-per-Type)
    const containers = createdUnits.filter(u => u.unit_type === 'CONTAINER') as ContainerUnit[];
    if (containers.length > 0) {
      await supabaseAdmin.from('shp_unit_containers').insert(
        containers.map(c => ({
          unit_id: c.id,
          tenant_id: c.tenant_id,
          container_number: c.container_number,
          iso_type: c.iso_type,
          seal_number: c.seal_number,
          tare_weight_kg: c.tare_weight_kg,
          max_payload_kg: c.max_payload_kg,
          temperature_celsius: c.temperature_celsius,
          is_soc: c.is_soc
        }))
      );
    }

    const bulkUnits = createdUnits.filter(u => u.unit_type === 'BULK_MT') as BulkUnit[];
    if (bulkUnits.length > 0) {
      await supabaseAdmin.from('shp_unit_bulk').insert(
        bulkUnits.map(b => ({
          unit_id: b.id,
          tenant_id: b.tenant_id,
          bulk_type: b.bulk_type,
          metric_tonnage: b.metric_tonnage,
          moisture_percentage: b.moisture_percentage,
          surveyor_report_number: b.surveyor_report_number,
          surveyor_entity_id: b.surveyor_entity_id
        }))
      );
    }

    const pkgUnits = createdUnits.filter(
      u => u.unit_type === 'PALLET' || u.unit_type === 'BOX' || u.unit_type === 'BREAKBULK'
    ) as PackageUnit[];
    if (pkgUnits.length > 0) {
      await supabaseAdmin.from('shp_unit_packages').insert(
        pkgUnits.map(p => ({
          unit_id: p.id,
          tenant_id: p.tenant_id,
          package_type: p.package_type,
          colli_count: p.colli_count,
          length_cm: p.length_cm,
          width_cm: p.width_cm,
          height_cm: p.height_cm,
          is_stackable: p.is_stackable
        }))
      );
    }

    const vehicles = createdUnits.filter(u => u.unit_type === 'VEHICLE') as VehicleUnit[];
    if (vehicles.length > 0) {
      await supabaseAdmin.from('shp_unit_vehicles').insert(
        vehicles.map(v => ({
          unit_id: v.id,
          tenant_id: v.tenant_id,
          vin_number: v.vin_number,
          engine_number: v.engine_number,
          vehicle_model: v.vehicle_model,
          color: v.color,
          is_drivable: v.is_drivable
        }))
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: createdUnits
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
