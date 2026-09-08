/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: components/workspaces/forwarding/ExecutionPlanBuilder/LegDependencyValidator.ts
 * Description: Client-side Validation Engine for Execution Plan Leg Sequences and Dependencies
 */

import { CreateExecutionLegDTO, TransportMode } from '@/lib/domain/shipment/types';

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LegValidationInput {
  leg_sequence?: number;
  origin_location_id?: string;
  destination_location_id?: string;
  transport_mode: TransportMode;
}

export class LegDependencyValidator {
  /**
   * Validates leg sequencing and dependency rules
   */
  public static validate(legs: LegValidationInput[]): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (legs.length === 0) {
      errors.push('Execution plan must contain at least one journey leg.');
      return { isValid: false, errors, warnings };
    }

    // 1. Validate sequence order and non-empty locations
    const seenSequences = new Set<number>();

    legs.forEach((leg, index) => {
      const seq = leg.leg_sequence || index + 1;

      if (seenSequences.has(seq)) {
        errors.push(`Duplicate leg sequence number ${seq} detected.`);
      }
      seenSequences.add(seq);

      if (!leg.origin_location_id?.trim()) {
        errors.push(`Leg #${seq} is missing an Origin Location.`);
      }

      if (!leg.destination_location_id?.trim()) {
        errors.push(`Leg #${seq} is missing a Destination Location.`);
      }

      if (
        leg.origin_location_id &&
        leg.destination_location_id &&
        leg.origin_location_id.trim().toUpperCase() === leg.destination_location_id.trim().toUpperCase() &&
        leg.transport_mode !== 'CUSTOMS_CLEARANCE' &&
        leg.transport_mode !== 'PORT_TERMINAL_HANDLING' &&
        leg.transport_mode !== 'WAREHOUSE_STAGING'
      ) {
        errors.push(
          `Leg #${seq} (${leg.transport_mode}) has identical Origin and Destination (${leg.origin_location_id}). Transport legs must move between distinct nodes.`
        );
      }
    });

    // 2. Multi-modal Corridor Continuity & Customs Dependency Check
    let hasCustomsLeg = false;
    let customsSequence = -1;

    legs.forEach((leg, index) => {
      const seq = leg.leg_sequence || index + 1;

      if (leg.transport_mode === 'CUSTOMS_CLEARANCE') {
        hasCustomsLeg = true;
        customsSequence = seq;
      }

      // Check continuity with previous leg
      if (index > 0) {
        const prevLeg = legs[index - 1];
        if (
          prevLeg.destination_location_id &&
          leg.origin_location_id &&
          prevLeg.destination_location_id.trim().toUpperCase() !== leg.origin_location_id.trim().toUpperCase() &&
          leg.transport_mode !== 'CUSTOMS_CLEARANCE' &&
          prevLeg.transport_mode !== 'CUSTOMS_CLEARANCE'
        ) {
          warnings.push(
            `Location gap: Leg #${prevLeg.leg_sequence} ends at '${prevLeg.destination_location_id}', but Leg #${seq} starts at '${leg.origin_location_id}'.`
          );
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
