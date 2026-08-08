export interface OperationalContext {
  currentIntent?: string;
  currentJobOrder?: string;
  currentExecution?: string;
  currentRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentUserRole?: string;
  currentTenant?: string;
  activeConversation?: string;
}
