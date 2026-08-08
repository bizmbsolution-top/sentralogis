export interface CopilotIntentEntityRef {
  type: string; // Generic string, e.g., 'DRIVER', 'INVOICE'
  value: string; // The raw value from the user, e.g., "Budi", "JO221"
}

export interface CopilotIntent {
  intentName: string;
  parameters: Record<string, any>;
  entities: CopilotIntentEntityRef[];
}
