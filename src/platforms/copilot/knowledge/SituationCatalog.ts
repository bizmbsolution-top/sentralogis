import { OperationalSituation } from './OperationalSituation';
import { OperationalTerm } from './OperationalVocabulary';

export const SituationCatalog: Record<string, OperationalSituation> = {
  DRIVER_WAITING: {
    id: 'DRIVER_WAITING',
    name: 'Driver Waiting',
    description: 'The driver has arrived at the destination but has not been loaded/unloaded for an extended period.',
    possibleCauses: [
      'Warehouse is full or busy',
      'Missing paperwork',
      'Customer unprepared for arrival'
    ],
    recommendedActions: [
      'Call customer warehouse contact',
      'Notify dispatcher to check driver status',
      'Verify if additional waiting fees apply'
    ],
    relatedTerms: [OperationalTerm.DRIVER, OperationalTerm.WAITING, OperationalTerm.CUSTOMER]
  },
  WAITING_UNLOADING: {
    id: 'WAITING_UNLOADING',
    name: 'Waiting Unloading',
    description: 'The driver is at the destination and waiting to be unloaded.',
    possibleCauses: [
      'Standard unloading queue',
      'Lack of unloading personnel or equipment at destination'
    ],
    recommendedActions: [
      'Monitor duration to ensure it does not exceed SLA',
      'Request ETA for unloading completion from customer'
    ],
    relatedTerms: [OperationalTerm.UNLOADING, OperationalTerm.DESTINATION, OperationalTerm.WAITING]
  },
  LATE_DEPARTURE: {
    id: 'LATE_DEPARTURE',
    name: 'Late Departure',
    description: 'The driver has not departed the origin location by the expected time.',
    possibleCauses: [
      'Vehicle breakdown',
      'Driver delayed on route to origin',
      'Loading delays at origin'
    ],
    recommendedActions: [
      'Contact driver immediately',
      'Check tracking for vehicle location',
      'Prepare replacement driver/vehicle if necessary'
    ],
    relatedTerms: [OperationalTerm.DEPARTURE, OperationalTerm.DELAY, OperationalTerm.DRIVER]
  },
  MISSING_POD: {
    id: 'MISSING_POD',
    name: 'Missing POD',
    description: 'The job is marked as arrived/departed from destination, but no Proof of Delivery has been submitted.',
    possibleCauses: [
      'Driver forgot to upload document via PWA',
      'Network connectivity issues',
      'Paperwork withheld by customer due to dispute'
    ],
    recommendedActions: [
      'Remind driver via WhatsApp to upload POD',
      'Check if driver reported any disputes or damages'
    ],
    relatedTerms: [OperationalTerm.POD, OperationalTerm.DRIVER, OperationalTerm.CUSTOMER]
  },
  NOMINAL: {
    id: 'NOMINAL',
    name: 'Nominal Operations',
    description: 'The job order is proceeding according to plan without active anomalies.',
    possibleCauses: [],
    recommendedActions: [],
    relatedTerms: [OperationalTerm.JOB_ORDER]
  }
};
