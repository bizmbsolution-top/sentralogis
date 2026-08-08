import { DecisionPolicy } from './DecisionPolicy';
import { SituationCatalog } from '../knowledge/SituationCatalog';
import { DefaultIntents } from '../registry/DefaultIntents';

export class DecisionPolicyRegistry {
  private static policies: Map<string, DecisionPolicy> = new Map();

  static register(policy: DecisionPolicy) {
    this.policies.set(policy.actionIntent, policy);
  }

  static getPolicy(intent: string): DecisionPolicy | undefined {
    return this.policies.get(intent);
  }

  static loadDefaultPolicies() {
    this.register({
      actionIntent: DefaultIntents.REPLACE_DRIVER,
      blockedSituations: [
        {
          situationId: SituationCatalog.WAITING_UNLOADING.id,
          reason: 'Replacing the driver will not improve completion time because the vehicle is already at the destination.',
          evidence: [
            'Driver has already arrived at destination geofence.',
            'Consignee is currently responsible for unloading delay.'
          ]
        }
      ],
      warningSituations: [],
      alternativeActions: [
        'Contact Consignee Warehouse',
        'Update Customer ETA',
        'Monitor POD Submission'
      ],
      expectedBenefits: [
        'Avoid unnecessary reassignment overhead.',
        'Maintain timeline consistency for the active delivery.'
      ],
      possibleConsequences: [
        'Duplicate driver assignment if forced.',
        'Potential confusion at destination warehouse.'
      ]
    });

    this.register({
      actionIntent: DefaultIntents.CANCEL_JOB,
      blockedSituations: [
        {
          situationId: SituationCatalog.MISSING_POD.id,
          reason: 'Job Order cannot be cancelled because the physical delivery has already occurred.',
          evidence: [
            'Destination Arrival and Departure events are already logged.',
            'Only administrative POD submission is pending.'
          ]
        }
      ],
      warningSituations: [],
      alternativeActions: [
        'Request POD via WhatsApp',
        'Escalate to Field Coordinator'
      ],
      expectedBenefits: [
        'Complete the job lifecycle correctly.',
        'Ensure revenue recognition can proceed.'
      ],
      possibleConsequences: [
        'Billing process halted if forced cancellation occurs.',
        'Inaccurate timeline analytics.'
      ]
    });
  }
}
