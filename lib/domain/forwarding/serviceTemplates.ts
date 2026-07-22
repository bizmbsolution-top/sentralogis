// lib/domain/forwarding/serviceTemplates.ts
// Domain-specific service templates for SBU Forwarding operations

// Sea freight service template
export const seaFreightTemplate = {
  serviceType: 'sea_freight' as const,
  containerTypes: ['FCL', 'LCL'] as const,
  calculationRules: {
    priceBreakdown: 'master_selling_price',
    costFallback: 'master_costing_vendor',
    consolidationTracking: true
  }
};

// Land freight service template
export const landFreightTemplate = {
  serviceType: 'land_freight' as const,
  transportationModes: ['truck', 'container'] as const,
  executionModes: ['OWN', 'VENDOR'] as const,
  costComponents: ['driver_coin_reward', 'fuel_surcharge'] as const,
  trackingRequired: true
};

// Consolidation management template
export const consolidationTemplate = {
  serviceType: 'consolidation' as const,
  groupageLogic: {
    itemsPerContainer: 12,
    containerCapacity: 25000,
    consolidationExpirationHours: 48
  },
  autoAssignments: ['stuffing', 'deconsolidation'],
  statusFlow: ['open', 'stuffing', 'shipped', 'arrived', 'deconsol_done', 'closed']
};

// Export all templates
export const serviceTemplates = {
  seaFreight: seaFreightTemplate,
  landFreight: landFreightTemplate,
  consolidation: consolidationTemplate
};