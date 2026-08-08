# 111. Conversation Runtime Context

The `ConversationContext` is responsible for persisting stateless memory across single Copilot interactions. 
It operates strictly functionally; modifications (like `remember()` or `forget()`) return a *new* instance.

## Public APIs

- `getConversationId(): string`
- `activeIntent(): string | null`
- `activeEntity(type: string): string | null`
- `remember(key: string, value: any): ConversationContext`
- `forget(key: string): ConversationContext`
- `summary(): string`
