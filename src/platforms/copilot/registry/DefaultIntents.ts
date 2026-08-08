import { IntentRegistry } from './IntentRegistry';

export const DefaultIntents = {
  ASSIGN_DRIVER: 'ASSIGN_DRIVER',
  REPLACE_DRIVER: 'REPLACE_DRIVER',
  SHOW_TIMELINE: 'SHOW_TIMELINE',
  CANCEL_JOB: 'CANCEL_JOB'
};

export function registerDefaultIntents() {
  const registry = IntentRegistry.getInstance();

  registry.register({
    name: DefaultIntents.ASSIGN_DRIVER,
    description: 'Assigns a driver to a job order',
    requiredEntities: ['JobOrder', 'Driver'],
    optionalEntities: ['Vehicle'],
    requiredPermissions: ['JobOrder.Update'],
    riskLevel: 'MEDIUM',
    explanationTemplate: 'Driver assignment triggers fleet manifestation and notifies the driver via PWA.'
  });
  
  registry.register({
    name: DefaultIntents.REPLACE_DRIVER,
    description: 'Replaces a driver on a job order',
    requiredEntities: ['JobOrder', 'Driver'],
    optionalEntities: [],
    requiredPermissions: ['JobOrder.Update'],
    riskLevel: 'HIGH',
    explanationTemplate: 'Replacing a driver notifies both the new and old drivers.'
  });

  registry.register({
    name: DefaultIntents.SHOW_TIMELINE,
    description: 'Displays the chronological timeline for an entity',
    requiredEntities: [], // Could be JobOrder or Vehicle or Driver
    optionalEntities: ['JobOrder', 'Driver', 'Vehicle'],
    requiredPermissions: ['JobOrder.Read'],
    riskLevel: 'LOW',
    explanationTemplate: 'Querying chronological data for the requested entities.'
  });

  registry.register({
    name: DefaultIntents.CANCEL_JOB,
    description: 'Cancels an active job order',
    requiredEntities: ['JobOrder'],
    optionalEntities: [],
    requiredPermissions: ['JobOrder.Delete'],
    riskLevel: 'HIGH',
    explanationTemplate: 'Canceling a job order is irreversible and will notify the customer.'
  });
}
