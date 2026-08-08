import { OperationalSituation } from '../knowledge/OperationalSituation';
import { OperationalRecommendation } from '../context/OperationalRecommendationEngine';

// These represent the data contracts for the React UI components
// The actual React implementation will consume these models.

export interface SituationCardModel {
  situation: OperationalSituation;
  durationMs: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface RecommendationCardModel {
  recommendation: OperationalRecommendation;
  autoExecuteSupported: boolean;
}

export interface TimelineSummaryModel {
  events: Array<{ time: string, title: string, status: string }>;
  currentStatus: string;
}

export interface TrackingSummaryModel {
  currentLocation: { lat: number, lng: number, address: string };
  distanceToDestinationKm: number;
  estimatedEta: string;
}

export interface CustomerImpactModel {
  customerName: string;
  slaBreachExpected: boolean;
  notified: boolean;
}

export interface OperationalInsightCardModel {
  summary: string;
  health: 'HEALTHY' | 'ATTENTION' | 'DELAYED' | 'CRITICAL';
  risk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attentionRequiredBy: string;
}

export interface BusinessImpactCardModel {
  impacts: string[];
}

export interface CustomerImpactCardModel {
  impacts: string[];
}

export interface NextBestActionCardModel {
  actions: string[];
}

export interface FocusQueueCardModel {
  jobOrderId: string;
  priorityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  operationalReason: string;
}

export interface TodaySummaryCardModel {
  totalActiveJobs: number;
  delayedJobs: number;
  criticalJobs: number;
  missingPod: number;
  jobsAwaitingAttention: number;
}

export interface WhyNotCardModel {
  actionRejected: string;
  reason: string;
  evidence: string[];
}

export interface DecisionPolicyCardModel {
  status: 'ALLOWED' | 'WARNING' | 'REJECTED';
  reason?: string;
}

export interface DecisionEvidenceCardModel {
  evidence: string[];
}

export interface AlternativeActionCardModel {
  actions: string[];
}

export interface ExpectedBenefitCardModel {
  benefits: string[];
}

export interface ConsequenceCardModel {
  consequences: string[];
}
