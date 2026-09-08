export type PartyRoleType =
  | 'CUSTOMER'
  | 'VENDOR'
  | 'SUPPLIER'
  | 'BROKER'
  | 'CARRIER'
  | 'AGENT'
  | 'BILL_TO'
  | 'SHIP_TO'
  | 'PAYER'
  | 'ORDERING_PARTY';

export type PartyRoleContextType =
  | 'GLOBAL'
  | 'ENGAGEMENT'
  | 'ORDER'
  | 'CONTRACT';

export type PartyRelationshipType =
  | 'PARENT_COMPANY'
  | 'SUBSIDIARY'
  | 'AFFILIATE'
  | 'PARTNER'
  | 'AGENT_OF';

export type PartyLocationRelationshipType =
  | 'OWNS'
  | 'OPERATES'
  | 'MANAGES'
  | 'USES'
  | 'LOCATED_AT';

export type ExternalReferenceEntityType =
  | 'PARTY'
  | 'LOCATION'
  | 'CARRIER'
  | 'SHIPMENT'
  | 'ORDER';

export type ExternalReferenceSystem =
  | 'ERP'
  | 'CRM'
  | 'TMS'
  | 'WMS'
  | 'CUSTOMS'
  | 'OTHER';

export interface PartyRole {
  id: string;
  tenant_id: string;
  party_id: string;
  role_type: PartyRoleType;
  context_type: PartyRoleContextType;
  context_id: string | null;
  is_primary: boolean;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreatePartyRoleDTO {
  party_id: string;
  role_type: PartyRoleType;
  context_type: PartyRoleContextType;
  context_id?: string | null;
  is_primary?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
}

export interface PartyRelationship {
  id: string;
  tenant_id: string;
  from_party_id: string;
  to_party_id: string;
  relationship_type: PartyRelationshipType;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreatePartyRelationshipDTO {
  from_party_id: string;
  to_party_id: string;
  relationship_type: PartyRelationshipType;
  effective_from?: string | null;
  effective_to?: string | null;
}

export interface PartyContact {
  id: string;
  tenant_id: string;
  party_id: string;
  contact_name: string;
  contact_role: string | null;
  department: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreatePartyContactDTO {
  party_id: string;
  contact_name: string;
  contact_role?: string | null;
  department?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  is_primary?: boolean;
}

export interface PartyLocation {
  id: string;
  tenant_id: string;
  party_id: string;
  location_id: string;
  relationship_type: PartyLocationRelationshipType;
  is_primary: boolean;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreatePartyLocationDTO {
  party_id: string;
  location_id: string;
  relationship_type: PartyLocationRelationshipType;
  is_primary?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
}

export interface ExternalReference {
  id: string;
  tenant_id: string;
  entity_type: ExternalReferenceEntityType;
  entity_id: string;
  external_system: ExternalReferenceSystem;
  external_id: string;
  external_context: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateExternalReferenceDTO {
  entity_type: ExternalReferenceEntityType;
  entity_id: string;
  external_system: ExternalReferenceSystem;
  external_id: string;
  external_context?: Record<string, unknown>;
}

export const PARTY_ROLE_TYPES: PartyRoleType[] = [
  'CUSTOMER', 'VENDOR', 'SUPPLIER', 'BROKER', 'CARRIER', 'AGENT',
  'BILL_TO', 'SHIP_TO', 'PAYER', 'ORDERING_PARTY',
];

export const PARTY_ROLE_CONTEXT_TYPES: PartyRoleContextType[] = [
  'GLOBAL', 'ENGAGEMENT', 'ORDER', 'CONTRACT',
];

export const PARTY_RELATIONSHIP_TYPES: PartyRelationshipType[] = [
  'PARENT_COMPANY', 'SUBSIDIARY', 'AFFILIATE', 'PARTNER', 'AGENT_OF',
];

export const PARTY_LOCATION_RELATIONSHIP_TYPES: PartyLocationRelationshipType[] = [
  'OWNS', 'OPERATES', 'MANAGES', 'USES', 'LOCATED_AT',
];

export const EXTERNAL_REFERENCE_ENTITY_TYPES: ExternalReferenceEntityType[] = [
  'PARTY', 'LOCATION', 'CARRIER', 'SHIPMENT', 'ORDER',
];

export const EXTERNAL_REFERENCE_SYSTEMS: ExternalReferenceSystem[] = [
  'ERP', 'CRM', 'TMS', 'WMS', 'CUSTOMS', 'OTHER',
];
