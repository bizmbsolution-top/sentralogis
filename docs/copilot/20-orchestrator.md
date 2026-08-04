# Sentralogis Copilot Orchestrator

## 1. Responsibilities
The `CopilotOrchestrator` is a lightweight coordination class. It wires together the Intent Parser, Validator, and Resolver. It ensures that the strict pipeline is followed and acts as the entry point for the API controller.

## 2. Execution Pipeline
```typescript
class CopilotOrchestrator {
  public async processInput(ctx: IRequestContext, input: string): Promise<CopilotResponse> {
    
    // 1. Parse
    const intentResult = await this.intentParser.parse(input);
    if (intentResult.isFailure) return { message: intentResult.error };
    const rawIntent = intentResult.getValue();

    // 2. Validate
    const validationResult = await this.intentValidator.validate(ctx, rawIntent);
    if (validationResult.isFailure) return { message: validationResult.error };
    const validIntent = validationResult.getValue();

    // 3. Propose (If confirmation required)
    if (validIntent.requiresConfirmation) {
      return { 
        message: "Please confirm the action below.",
        actionProposal: validIntent 
      };
    }

    // 4. Resolve & Execute (If no confirmation needed, e.g. Queries)
    return await this.intentResolver.execute(ctx, validIntent);
  }
}
```

## 3. Timeline Logging
When the Orchestrator successfully processes and confirms an action that mutates state, it records a `TimelineEvent` indicating that the action was executed via Copilot. This maintains the audit trail of AI-assisted operations.
