# Sentralogis Copilot MVP v1.0 - Product Vision

## 1. Core Vision
Sentralogis Copilot is an operational AI assistant designed to function as an intelligent operational workspace for internal tenant staff (Customer Service, Dispatchers, Ground Staff, Supervisors, and Managers). 

**The objective is not simply "AI" but measurable reduction in operational clicks and cognitive load.**

It acts as a smart orchestration layer between raw, unstructured operational inputs (e.g., pasted WhatsApp text, photos of containers) and the strict, validated Domain-Driven Design (DDD) architecture of the Sentralogis Platform.

## 2. Core Principles
1. **Never Bypass the Domain**: Copilot NEVER writes directly to database tables. Every AI-suggested mutation must strictly flow through:
   `AI Intent -> Application Service -> Aggregate -> Repository -> Database`
2. **Preserve the UI Boundary**: Copilot does not replace the existing Dashboard Workspace or the Driver PWA. It supplements the internal Workspace via a dedicated `/copilot` entry point.
3. **Action-Oriented**: Copilot suggests specific actions based on parsed intent, awaits user confirmation, and executes verifiable commands.

## 3. Capabilities Scope (MVP)
The MVP explicitly restricts scope to Trucking operational domains:
- Parsing WhatsApp conversations to suggest actions.
- OCR on operational photos (extracting Container Number, Seal Number, Document Type).
- Natural Language Commands (e.g., "Assign JO221 to Budi").
- Operational Queries (e.g., "Which jobs are delayed?").
- Automated Work Order drafting from customer messages.

## 4. Out of Scope
The MVP will explicitly exclude:
- Warehouse, Forwarding, Finance, Accounting domains.
- Customer-facing AI or Driver-facing AI.
- Voice inputs.
- Complex Workflow Engine or Timeline Platform expansion.
