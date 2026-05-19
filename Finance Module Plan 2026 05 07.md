# Sentralogis Finance Module Roadmap
**Date:** 2026-05-07
**SBU:** Trucking Operations

## Overview
Following the successful stabilization of the Operational Pipeline (Work Orders -> Job Orders -> Live Tracking), the next phase is to integrate the **Finance & Settlement** layer. This module will convert operational milestones into financial data points for auditing and billing.

## Phase 1: Revenue & Cost Auditing
- [x] **Job Order Value Linking:** Ensured `customer_price` (Revenue) and `purchase_price` (Cost) are correctly captured from the Job Order Matrix.
- [x] **Driver Payout Calculation:** Automated calculation of `driver_share_percentage` based on the internal SBU policy.
- [x] **Expense Tracking:** Ability to add ancillary costs (Tolls, Fuel, Parking, Loading/Unloading) to individual Job Orders via **Trip Charges Console**.

## Phase 2: Document Verification (POD)
- [x] **Proof of Delivery (POD) Workflow:** Interface for SBU Ops to verify uploaded photos/documents from the Driver App.
- [x] **Billing Readiness:** Status transition from `PEKERJAAN SELESAI` to `READY FOR BILLING` once all physical documents are confirmed.
- [x] **Digital Archive:** Linking document UUIDs to Supabase Storage buckets for financial audit trails.

## Phase 3: Transporter Settlement
- [ ] **Vendor Invoicing:** Generate pro-forma invoices for external transporters based on completed Job Orders.
- [ ] **Internal Payroll Sync:** Prepare driver share reports for internal pilots.

## Phase 4: Profitability Dashboard
- [x] **Real-time Gross Margin:** Visual indicator of profit/loss per Work Order in **HQ Financial Report**.
- [x] **SBU Performance Matrix:** Comparison of "Own Fleet" vs "Outsourced" profitability.

---
**Status:** Phase 1, 2, and 4 COMPLETED. Phase 3 (Settlement Documents) is the next focus.
**Pre-requisites:** Job Order Matrix is stable and uniquely identifies every unit deployment.
