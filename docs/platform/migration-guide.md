# Migration Guide

## Moving Legacy SBU Code to Platform
1. Replace hardcoded status strings with `StateMachineEngine` instances.
2. Replace `assignment_documents` JSONB structures with the `Attachment` aggregate.
3. Replace custom audit triggers with `AuditProvider` and `TimelineProvider`.
4. Ensure API routes handle the `Result<T>` pattern when executing platform transitions instead of `try/catch`.

## Migration Checklist
- [ ] Identify legacy raw DB dependency.
- [ ] Implement Platform Interface wrapper.
- [ ] Redirect UI/API to Platform methods.
- [ ] Execute Data Migration (SQL).
- [ ] Deprecate legacy table.