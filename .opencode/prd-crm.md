# PRD: CRM System — Sentralogis

## 1. Overview
Sistem CRM multi-tenant untuk tracking lead-to-order pipeline, terintegrasi dengan WhatsApp Bot Gateway (future), web form inquiry, dan Work Order system.

## 2. Problem Statement
- Pelanggan sering inquiry via WhatsApp tapi tidak ter-track dengan baik
- Manajemen tidak tahu berapa banyak opportunity yang tidak di-followup
- Conversion rate tidak terukur (misal: 100 inquiry → 50 jadi WO, 50 lost — tapi tidak tahu alasannya)
- Sales di lapangan tidak punya tools mobile untuk capture lead dan check price list
- Tidak ada SLA tracking untuk follow-up lead

## 3. Goals
1. **Track semua opportunity** dari inquiry pertama sampai won/lost
2. **SLA enforcement** — alert saat lead tidak di-followup dalam waktu tertentu
3. **Mobile-first sales tools** — capture lead, meeting notes, price list di HP
4. **Auto-fill pricing** saat create WO dari customer deal price list
5. **Commission tracking** — forecast vs actual per sales
6. **Lost reason analytics** — management tahu kenapa deal gagal

## 4. User Roles (Hardcoded)

### Existing Roles
| Role | Access |
|------|--------|
| `owner_sentralogis` | Semua tenant, full analytics |
| `tenant_superadmin` | Semua data tenant mereka |
| `hq_director_*` | Semua data tenant, cross-tenant analytics |

### New Roles (CRM)
| Role | Access |
|------|--------|
| `hq_marketing_mgr_domestik` | Semua lead domestik di tenant, approve offering |
| `hq_marketing_mgr_international` | Semua lead internasional di tenant, approve offering |
| `hq_sales_trucking` | Lead trucking saja, create offering |
| `hq_sales_forwarding` | Lead forwarding saja, create offering |
| `hq_sales_warehouse` | Lead warehouse saja, create offering |
| `hq_cs` | Lead yang sudah won, handle retention & komplain |

## 5. Pipeline Stages & SLA

| Stage | Owner | SLA | Escalation |
|-------|-------|-----|------------|
| `new` | Sales | 4 jam | Sales Manager |
| `qualified` | Sales | 24 jam | Sales Manager |
| `quoted` | Sales | 72 jam | Sales Manager |
| `negotiation` | Sales | 7 hari | Sales Manager |
| `won` | CS | — | — |
| `lost` | — | — | — |

## 6. Database Schema

### 6.1 crm_leads
```sql
id UUID PK
tenant_id UUID FK → tenants
phone TEXT NOT NULL
name TEXT
email TEXT
company TEXT
address TEXT
pic_name TEXT, pic_jabatan TEXT, pic_phone TEXT
source TEXT (whatsapp, web_form, instagram, referral, google_ads, event, manual)
campaign TEXT
wa_uuid TEXT
stage TEXT (new, qualified, quoted, negotiation, won, lost)
category TEXT (penawaran, status_check, komplain, lainnya)
sub_category TEXT (trucking, warehousing, forwarding, custom)
expected_price NUMERIC (harga ekspektasi customer)
lost_reason TEXT (price_too_high, no_response, competitor, cancelled, budget, timing, other)
lost_notes TEXT
wo_id UUID FK → work_orders
assigned_to UUID FK → profiles (sales)
sales_name TEXT
sla_deadline TIMESTAMPTZ
sla_breached BOOLEAN DEFAULT false
last_activity_at TIMESTAMPTZ
created_at, updated_at
```

### 6.2 crm_offerings
```sql
id UUID PK
lead_id UUID FK → crm_leads
tenant_id UUID FK → tenants
sales_id UUID FK → profiles
document_url TEXT (PDF offering)
status TEXT (draft, sent, approved, rejected)
approved_at TIMESTAMPTZ
approved_by UUID FK → profiles (Marketing Manager)
created_at
```

### 6.3 crm_price_lists (Deal Price per Customer per SBU)
```sql
id UUID PK
tenant_id UUID FK → tenants
customer_id UUID FK → md_entities
sbu_type TEXT (trucking, warehousing, forwarding, custom)
service_type TEXT (truck_type, route_desc, dll)
price NUMERIC
unit TEXT
currency TEXT DEFAULT 'IDR'
source_offering_id UUID FK → crm_offerings
valid_from TIMESTAMPTZ
valid_to TIMESTAMPTZ
created_by UUID FK → profiles
created_at
```

### 6.4 crm_price_list_items (Structured per SBU)
```sql
id UUID PK
price_list_id UUID FK → crm_price_lists
origin TEXT
destination TEXT
cargo_type TEXT
truck_type TEXT
route_desc TEXT
price NUMERIC
unit TEXT
min_qty INTEGER
max_qty INTEGER
created_at
```

### 6.5 general_price_lists (Reference untuk Sales di Lapangan)
```sql
id UUID PK
tenant_id UUID FK → tenants
sbu_type TEXT
origin TEXT
destination TEXT
cargo_type TEXT
truck_type TEXT
price NUMERIC
unit TEXT
valid_from TIMESTAMPTZ
valid_to TIMESTAMPTZ
created_at
```

### 6.6 meeting_notes (Input di Lapangan)
```sql
id UUID PK
lead_id UUID FK → crm_leads
sales_id UUID FK → profiles
meeting_date TIMESTAMPTZ
location TEXT (GPS)
pic_name TEXT, pic_jabatan TEXT, pic_phone TEXT
needs TEXT
volume_estimate TEXT
pain_points TEXT
competitor_info TEXT
expected_price NUMERIC
next_action TEXT
created_at
```

### 6.7 crm_messages
```sql
id UUID PK
lead_id UUID FK → crm_leads
direction TEXT (inbound, outbound)
content TEXT
media_url TEXT
twilio_sid TEXT
meta_wa_id TEXT
status TEXT (sent, delivered, read, failed)
created_at
```

### 6.8 crm_notes
```sql
id UUID PK
lead_id UUID FK → crm_leads
agent_id UUID FK → profiles
note TEXT
created_at
```

### 6.9 crm_activity_log
```sql
id UUID PK
lead_id UUID FK → crm_leads
tenant_id UUID FK → tenants
agent_id UUID FK → profiles
action TEXT (status_change, message_sent, wo_created, lead_assigned, offering_sent, offering_approved)
details JSONB
created_at
```

### 6.10 sales_targets
```sql
id UUID PK
sales_id UUID FK → profiles
tenant_id UUID FK → tenants
period TEXT (YYYY-MM)
target_amount NUMERIC
target_leads INTEGER
actual_won_amount NUMERIC DEFAULT 0
actual_won_count INTEGER DEFAULT 0
actual_paid_amount NUMERIC DEFAULT 0
commission_rate NUMERIC (%)
forecast_commission NUMERIC (target_amount × rate)
actual_commission NUMERIC (actual_paid_amount × rate)
created_at, updated_at
```

## 7. Key Features

### 7.1 Lead Capture
- **WA Bot** (future): Parse UUID → auto-create lead
- **Web Form**: `sentralogis.com/wa/{tenant_id}` → form inquiry
- **Manual**: Sales input via Sales Portal

### 7.2 Sales Portal (Mobile-First)
- Quick lead capture (nama, alamat, PIC, GPS)
- Meeting notes input (offline → auto-sync)
- General price list view (per SBU)
- Expected price field (harga ekspektasi customer)
- Upload offering + flag approved
- Target & commission dashboard

### 7.3 Offering Workflow
1. Sales upload offering (PDF)
2. Marketing Manager review & approve
3. Auto-create customer price list dari offering
4. Price list dipakai saat CS create WO

### 7.4 WO Integration
- CS create WO → pilih customer → pilih SBU → isi layanan
- Sistem auto-search price list → auto-fill harga deal
- Jika tidak match → manual input + alert

### 7.5 Commission Tracking
- **Forecast**: invoice amount × commission rate
- **Actual**: payment received × commission rate
- Finance settle komisi setelah customer bayar

### 7.6 SLA & Alerts
- Lead tanpa response > SLA → alert ke Sales Manager
- Unfollowed leads dashboard
- Escalation notification

## 8. UI Pages

| Page | Route | User |
|------|-------|------|
| Sales Dashboard | `/hq/crm` | Sales |
| Lead Detail + Chat | `/hq/crm/leads/[id]` | Sales, CS |
| Price Lists | `/hq/crm/price-lists` | Sales, Marketing |
| Contacts | `/hq/crm/contacts` | All |
| Meeting Notes | `/hq/crm/meetings` | Sales |
| Targets & Commission | `/hq/crm/targets` | Sales, Director |
| Management Dashboard | `/owner/crm` | Owner |

## 9. WhatsApp Bot Gateway (Future)
- 1 nomor WA Business untuk semua tenant
- Routing via `tenants.id` (UUID)
- Interactive menu untuk auto-qualify lead
- Short URL: `sentralogis.com/wa/{tenant_id}`

## 10. Implementation Priority

| Phase | Tasks | Est. |
|-------|-------|------|
| **Phase 1** | Migration 027, Server Actions, Sales Portal | 3 hari |
| **Phase 2** | CS Dashboard, WO Integration, Price Lists | 2 hari |
| **Phase 3** | Management Dashboard, Commission Tracking | 2 hari |
| **Phase 4** | WA Bot Gateway, Web Form, Short URL | 2 hari |
