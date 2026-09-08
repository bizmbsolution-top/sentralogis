# SENTRALOGIS — DATA-2
# PARTY ROLE DECISION

**Date:** 2026-09-02  
**Phase:** DATA-2  
**Nature:** ARCHITECTURE DESIGN ONLY  

---

## 1. GLOBAL VS CONTEXTUAL ROLES

### 1.1 Decision

**Party Roles are CONTEXTUAL, not global.**

A party's role depends on the business context:
- BYD Indonesia is a CUSTOMER in the commercial context
- BYD Subang is a CONSIGNEE in the shipment context
- A vendor can be a CARRIER in one context and a SUPPLIER in another

### 1.2 Role Classification

| Category | Roles | Context |
|----------|-------|---------|
| Commercial | CUSTOMER, BILL_TO, PAYER, ORDERING_PARTY | Sales Order, Contract |
| Logistics | SHIPPER, CONSIGNEE, SHIP_TO, NOTIFY_PARTY | Shipment |
| Vendor | VENDOR, CARRIER, AGENT, BROKER | Procurement, Operations |
| Supply | SUPPLIER | Procurement |

---

## 2. ROLE DEFINITIONS

### 2.1 CUSTOMER

**Definition:** A party that buys services from SENTRALOGIS.

**Context:** GLOBAL or ENGAGEMENT or ORDER

**Rules:**
- A party becomes CUSTOMER when they sign a contract or place an order
- CUSTOMER role can be global (applies to all transactions) or contextual
- Multiple parties can be CUSTOMER for different engagements

**Example:**
```
BYD Indonesia: CUSTOMER (GLOBAL)
```

---

### 2.2 BILL_TO

**Definition:** A party that receives invoices for services rendered.

**Context:** ENGAGEMENT or ORDER or CONTRACT

**Rules:**
- BILL_TO may differ from CUSTOMER (e.g., parent company pays for subsidiary)
- BILL_TO is transaction-context specific
- A party can be BILL_TO for one order and not for another

**Example:**
```
BYD Indonesia: BILL_TO (ENGAGEMENT: ENG-001)
BYD Group: BILL_TO (ENGAGEMENT: ENG-002)
```

---

### 2.3 SHIP_TO

**Definition:** A party (or location) that receives goods.

**Context:** ORDER or SHIPMENT

**Rules:**
- SHIP_TO is transaction-context specific
- SHIP_TO may be a party or a location
- Multiple SHIP_TO per order possible (split delivery)

**Example:**
```
BYD Subang Factory: SHIP_TO (ORDER: SO-001)
```

---

### 2.4 SHIPPER

**Definition:** A party that sends goods.

**Context:** SHIPMENT

**Rules:**
- SHIPPER is shipment-context specific
- SHIPPER may differ from CUSTOMER
- A party can be SHIPPER for one shipment and not for another

**Example:**
```
Supplier ABC: SHIPPER (SHIPMENT: SHP-001)
```

---

### 2.5 CONSIGNEE

**Definition:** A party that receives goods in a shipment.

**Context:** SHIPMENT

**Rules:**
- CONSIGNEE is shipment-context specific
- CONSIGNEE may differ from CUSTOMEE
- Multiple CONSIGNEE per shipment possible (split shipment)

**Example:**
```
BYD Subang Factory: CONSIGNEE (SHIPMENT: SHP-001)
```

---

### 2.6 PAYER

**Definition:** A party that pays for services.

**Context:** ORDER or CONTRACT

**Rules:**
- PAYER may differ from CUSTOMER
- PAYER is transaction-context specific
- A party can be PAYER for one order and not for another

**Example:**
```
BYD Group: PAYER (CONTRACT: CTR-001)
```

---

### 2.7 ORDERING_PARTY

**Definition:** A party that places an order.

**Context:** ORDER

**Rules:**
- ORDERING_PARTY is order-context specific
- ORDERING_PARTY may differ from CUSTOMER (e.g., agent orders on behalf)

**Example:**
```
Agent XYZ: ORDERING_PARTY (ORDER: SO-001)
```

---

### 2.8 NOTIFY_PARTY

**Definition:** A party to be notified about shipment status.

**Context:** SHIPMENT

**Rules:**
- NOTIFY_PARTY is shipment-context specific
- Multiple NOTIFY_PARTY per shipment possible
- NOTIFY_PARTY may be broker, agent, or other stakeholder

**Example:**
```
Customs Broker ABC: NOTIFY_PARTY (SHIPMENT: SHP-001)
```

---

### 2.9 VENDOR

**Definition:** A party that provides services to SENTRALOGIS.

**Context:** GLOBAL or ENGAGEMENT

**Rules:**
- VENDOR role can be global (approved vendor) or contextual
- VENDOR includes transporters, carriers, service providers
- VENDOR may also be CARRIER, AGENT, or BROKER

**Example:**
```
Transporter XYZ: VENDOR (GLOBAL)
```

---

### 2.10 CARRIER

**Definition:** A party that transports goods.

**Context:** GLOBAL or SHIPMENT

**Rules:**
- CARRIER is a specialized VENDOR
- CARRIER may be maritime, air, road, or rail
- CARRIER role can be global (approved carrier) or per-shipment

**Example:**
```
Maersk: CARRIER (GLOBAL)
Local Trucking: CARRIER (SHIPMENT: SHP-001)
```

---

### 2.11 AGENT

**Definition:** A party that acts on behalf of another party.

**Context:** ENGAGEMENT or SHIPMENT

**Rules:**
- AGENT may act for CUSTOMER, SHIPPER, or CONSIGNEE
- AGENT role is transaction-context specific
- AGENT may be customs broker, freight forwarder, etc.

**Example:**
```
Customs Broker ABC: AGENT (SHIPMENT: SHP-001)
```

---

### 2.12 BROKER

**Definition:** A party that facilitates transactions between other parties.

**Context:** ENGAGEMENT or SHIPMENT

**Rules:**
- BROKER is a specialized AGENT
- BROKER may facilitate customs, freight, or other services
- BROKER role is transaction-context specific

**Example:**
```
Freight Broker XYZ: BROKER (ENGAGEMENT: ENG-001)
```

---

### 2.13 SUPPLIER

**Definition:** A party that supplies goods.

**Context:** GLOBAL or ENGAGEMENT

**Rules:**
- SUPPLIER is distinct from VENDOR (goods vs services)
- SUPPLIER role can be global or contextual
- SUPPLIER may also be SHIPPER

**Example:**
```
Component Supplier ABC: SUPPLIER (GLOBAL)
```

---

## 3. ROLE MODEL DESIGN

### 3.1 party_roles Table

```text
party_roles
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── party_id (UUID FK → md_entities)
├── role_type (TEXT)
├── context_type (TEXT: GLOBAL, ENGAGEMENT, ORDER, SHIPMENT, CONTRACT)
├── context_id (UUID, nullable)
├── is_primary (BOOLEAN)
├── effective_from (DATE)
├── effective_to (DATE, nullable)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
```

### 3.2 Role Coexistence Rules

| Party | Role A | Role B | Allowed? |
|-------|--------|--------|----------|
| BYD Indonesia | CUSTOMER | BILL_TO | YES |
| BYD Indonesia | CUSTOMER | VENDOR | YES (different contexts) |
| BYD Subang | CONSIGNEE | SHIP_TO | YES |
| Transporter XYZ | VENDOR | CARRIER | YES |
| Agent XYZ | AGENT | BROKER | YES |

### 3.3 Parent/Child Role Rules

**Rule:** Parent/Child ≠ Bill-To/Ship-To

- Parent may be Bill-To (but not automatically)
- Child may be Bill-To (but not automatically)
- Child may be Ship-To (but not automatically)
- Roles are assigned explicitly, not inherited

**Example:**
```
BYD Group (parent)
├── CUSTOMER (GLOBAL)
└── BILL_TO (GLOBAL)

BYD Indonesia (child)
├── CUSTOMER (GLOBAL)
├── BILL_TO (ENGAGEMENT: ENG-001)  ← Different from parent
└── SHIP_TO (ORDER: SO-001)
```

---

## 4. TRANSACTION-CONTEXT ROLES

### 4.1 Sales Order Context

```text
Sales Order SO-001
├── Ordering Party → party_roles (context_type: ORDER, context_id: SO-001)
├── Bill-To → party_roles (context_type: ORDER, context_id: SO-001)
├── Ship-To → party_roles (context_type: ORDER, context_id: SO-001)
└── Payer → party_roles (context_type: ORDER, context_id: SO-001)
```

### 4.2 Shipment Context

```text
Shipment SHP-001
├── Shipper → party_roles (context_type: SHIPMENT, context_id: SHP-001)
├── Consignee → party_roles (context_type: SHIPMENT, context_id: SHP-001)
└── Notify Party → party_roles (context_type: SHIPMENT, context_id: SHP-001)
```

### 4.3 Why Not Transaction-Level References Only?

**Problem:** If roles are only on transactions, we lose:
- Global party classification (is this party a customer?)
- Role history tracking
- Role-based access control
- Role-based reporting

**Solution:** Hybrid approach:
- party_roles for canonical role assignments
- Transaction references for transaction-specific overrides

---

## 5. MIGRATION FROM BOOLEAN FLAGS

### 5.1 Current State

md_entities has boolean flags:
- is_customer
- is_supplier
- is_vendor
- is_broker

### 5.2 Migration Strategy

1. Create party_roles table
2. Migrate existing boolean flags to party_roles with context_type = 'GLOBAL'
3. Keep boolean flags for backward compatibility (deprecated)
4. New code uses party_roles exclusively
5. Remove boolean flags in future phase

### 5.3 Migration Mapping

| Boolean Flag | party_roles Equivalent |
|--------------|------------------------|
| is_customer = true | role_type = 'CUSTOMER', context_type = 'GLOBAL' |
| is_supplier = true | role_type = 'SUPPLIER', context_type = 'GLOBAL' |
| is_vendor = true | role_type = 'VENDOR', context_type = 'GLOBAL' |
| is_broker = true | role_type = 'BROKER', context_type = 'GLOBAL' |

---

**END OF PARTY ROLE DECISION**
