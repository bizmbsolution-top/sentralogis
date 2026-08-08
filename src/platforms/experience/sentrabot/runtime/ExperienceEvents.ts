export type ExperienceEventType = 
  | 'IntentCaptured' 
  | 'IntentResolved' 
  | 'ValidationStarted' 
  | 'ValidationCompleted' 
  | 'PlanningStarted' 
  | 'PlanningCompleted' 
  | 'ExecutionStarted' 
  | 'ExecutionSucceeded' 
  | 'ExecutionFailed' 
  | 'ContextChanged' 
  | 'NotificationReceived' 
  | 'UserTyping' 
  | 'UserIdle'
  | 'SystemOffline';

export interface ExperienceEvent {
  type: ExperienceEventType;
  payload?: any;
  timestamp: number;
}
