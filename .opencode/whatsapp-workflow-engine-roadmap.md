# WhatsApp Business Workflow Engine — Development Roadmap

## Konsep
WhatsApp sebagai UI utama untuk semua stakeholder (Customer, Driver, SBU, HQ). Bukan sekadar notifikasi — WhatsApp adalah gerbang interaksi dengan Sentralogis.

## Arsitektur
```
WhatsApp Business API → Webhook → Workflow Engine (State Machine + Role Router) → Supabase/API → Response via WA
```

## Flow per Stakeholder

### 1. Customer
- Create WO via conversational flow
- Track shipment real-time (auto-push)
- Receive invoice + payment link
- Rate service setelah delivery

### 2. Driver (OWN)
- Job notification + accept/reject via buttons
- Status update (Arrived, Loading, Unloading, Complete)
- Upload POD via WA (foto langsung)
- Check earnings summary
- Report issues

### 3. Driver (Vendor)
- Link ke web page untuk complex actions
- WA untuk simple status updates
- Confirm fit + roadworthy

### 4. SBU / Dispatcher
- Approve/reject handover requests
- Exception alerts (delay, breakdown, POD missing)
- Quick reassign jobs
- Daily summary

### 5. HQ / Management
- Daily/weekly/monthly auto-reports
- Approval workflows (invoices, expenses, discounts)
- Exception escalation
- KPI alerts

## Workflow Engine Design

### State Machine per Conversation
```
User sends message → Identify user (phone → role + context) → Load conversation state → Route to handler → Process action → Generate response → Send via WA
```

### Context Management
```json
{
  "phone": "628123456789",
  "role": "driver",
  "driver_id": "uuid-here",
  "state": "awaiting_job_confirmation",
  "current_job_id": "jo-uuid",
  "session_expires": "2026-05-17T10:00:00Z"
}
```

## Implementasi Phases

### Phase 1 — Foundation (2-3 minggu)
- [ ] Setup WhatsApp Business API webhook
- [ ] Build basic workflow engine (state machine)
- [ ] Driver job notification + accept/reject
- [ ] Status update via buttons

### Phase 2 — Customer (2-3 minggu)
- [ ] WO creation via conversational flow
- [ ] Tracking via WA (auto-push status)
- [ ] Invoice delivery + payment link

### Phase 3 — SBU/HQ (2 minggu)
- [ ] Approval workflows via WA
- [ ] Daily summary reports
- [ ] Exception alerts

### Phase 4 — Advanced (ongoing)
- [ ] POD upload via WA (foto langsung)
- [ ] Natural language queries
- [ ] Multi-language support
- [ ] Voice message support

## Tantangan & Mitigasi
| Tantangan | Mitigasi |
|---|---|
| 24-hour session window | Template messages untuk outbound |
| Template approval | Pre-approve template umum |
| Cost per conversation | Batch notifications, free-tier |
| Complex tasks | Fallback ke web link |
| Rate limits | Queue system |
| Security | Phone verification + PIN |

## Pertanyaan Terbuka
1. WhatsApp Business API provider? (Twilio, 360Dialog, Meta direct?)
2. Budget per conversation?
3. Fallback strategy jika WA down?
4. Priority stakeholder? (Driver → Customer → SBU → HQ?)
