import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { OpenAIIntentAdapter, OpenAIAdapterError } from '@/src/platforms/copilot/intelligence/adapters/OpenAIIntentAdapter';
import { GeminiIntentAdapter } from '@/src/platforms/copilot/intelligence/adapters/GeminiIntentAdapter';
import { IntentResolver } from '@/src/platforms/copilot/resolver/IntentResolver';
import { PipelineContext } from '@/src/platforms/copilot/pipeline/PipelineModels';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import { IntentKnowledgeRegistry } from '@/src/platforms/copilot/intelligence/IntentKnowledgeRegistry';
import { SemanticIntentMatcher } from '@/src/platforms/copilot/intelligence/SemanticIntentMatcher';

describe('D-OPENAI-10: Negative Architecture Hardening — Zero Gemini & Zero Provider Cascade', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalOpenAiKey = process.env.OPEN_AI_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'mock-openai-key';
    IntentKnowledgeRegistry.loadDefaultKnowledge();
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPEN_AI_KEY = originalOpenAiKey;
    vi.restoreAllMocks();
  });

  function createMockPipelineContext(userInput: string): PipelineContext {
    const opContext = OperationalContext.create({
      tenant: TenantContext.create({ id: 'tenant-test' }),
      user: UserContext.create({ id: 'user-test', roles: ['DISPATCHER'] }),
      permissions: PermissionContext.create(['JobOrder.Update', 'JobOrder.Read']),
      conversation: ConversationContext.create({ conversationId: 'conv-test-10' }),
      workspace: WorkspaceContext.create({})
    });
    return new PipelineContext(userInput, opContext);
  }

  // NA-01: Happy path zero Gemini
  it('NA-01: Happy path invokes OpenAI, leaves Gemini at exactly 0 calls, and tags resolutionSource as OPENAI', async () => {
    const openAiSpy = vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockResolvedValueOnce({
      intent: 'SHOW_TIMELINE',
      confidence: 0.98,
      entities: { JobOrder: 'JO-1001' },
      ambiguities: [],
      reasoning: 'Happy path test resolution',
      language: 'id'
    });
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    const ctx = createMockPipelineContext('tampilkan timeline JO-1001');
    const result = await IntentResolver.resolve(ctx);

    expect(openAiSpy).toHaveBeenCalledTimes(1);
    expect(geminiSpy).toHaveBeenCalledTimes(0);
    expect(result.intent).toBe('SHOW_TIMELINE');
    expect(ctx.resolutionMetadata?.aiStatus).toBe('AVAILABLE');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('OPENAI');
  });

  // NA-02: OpenAI failure does not call Gemini
  it('NA-02: When OpenAI fails, Gemini is NOT called (0 calls), routing directly to deterministic fallback', async () => {
    const openAiSpy = vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(
      new OpenAIAdapterError('Upstream connection timeout', 'TIMEOUT_EXCEEDED', 'UNAVAILABLE')
    );
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    const ctx = createMockPipelineContext('lihat timeline');
    const result = await IntentResolver.resolve(ctx);

    expect(openAiSpy).toHaveBeenCalledTimes(1);
    expect(geminiSpy).toHaveBeenCalledTimes(0);
    expect(result.intent).toBe('SHOW_TIMELINE');
    expect(ctx.resolutionMetadata?.aiStatus).toBe('UNAVAILABLE');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
    expect(ctx.resolutionMetadata?.failureClass).toBe('TIMEOUT_EXCEEDED');
  });

  // NA-03: Provider inventory / zero other providers
  it('NA-03: Provider inventory confirms OpenAI is the sole active adapter, Gemini is dormant, and no secondary providers exist', () => {
    const adaptersDir = path.resolve(process.cwd(), 'src/platforms/copilot/intelligence/adapters');
    const files = fs.readdirSync(adaptersDir);

    // List of expected files in adapters directory
    expect(files).toContain('OpenAIIntentAdapter.ts');
    expect(files).toContain('GeminiIntentAdapter.ts');

    // Ensure no third-party alternative providers exist
    const unauthorizedProviders = ['Anthropic', 'Cohere', 'Mistral', 'Bedrock', 'Azure', 'Groq', 'Ollama', 'Replicate', 'HuggingFace'];
    for (const file of files) {
      for (const unauthorized of unauthorizedProviders) {
        expect(file.toLowerCase()).not.toContain(unauthorized.toLowerCase());
      }
    }

    // Verify IntentResolver strictly imports OpenAI and NOT Gemini
    const resolverPath = path.resolve(process.cwd(), 'src/platforms/copilot/resolver/IntentResolver.ts');
    const resolverSource = fs.readFileSync(resolverPath, 'utf8');
    expect(resolverSource).toContain("import { OpenAIIntentAdapter, OpenAIAdapterError } from '../intelligence/adapters/OpenAIIntentAdapter';");
    expect(resolverSource).not.toMatch(/import\s+.*GeminiIntentAdapter/);
  });

  // NA-04: Multiple failure modes all verify zero Gemini calls and deterministic routing
  it('NA-04: Exhaustive failure modes (Timeout, 503 Capacity, 429 Quota, 500 Network, JSON error, Schema error, Runtime throw) all yield exactly 0 Gemini calls', async () => {
    const failureScenarios: Array<{ error: any; expectedStatus: string; expectedClass: string }> = [
      {
        error: new OpenAIAdapterError('Timeout', 'TIMEOUT_EXCEEDED', 'UNAVAILABLE'),
        expectedStatus: 'UNAVAILABLE',
        expectedClass: 'TIMEOUT_EXCEEDED'
      },
      {
        error: new OpenAIAdapterError('High demand', 'CAPACITY_EXHAUSTED', 'UNAVAILABLE'),
        expectedStatus: 'UNAVAILABLE',
        expectedClass: 'CAPACITY_EXHAUSTED'
      },
      {
        error: new OpenAIAdapterError('Quota exceeded', 'QUOTA_EXHAUSTED', 'UNAVAILABLE'),
        expectedStatus: 'UNAVAILABLE',
        expectedClass: 'QUOTA_EXHAUSTED'
      },
      {
        error: new OpenAIAdapterError('Internal Server Error', 'UPSTREAM_FAILURE', 'UNAVAILABLE'),
        expectedStatus: 'UNAVAILABLE',
        expectedClass: 'UPSTREAM_FAILURE'
      },
      {
        error: new OpenAIAdapterError('Bad JSON', 'PAYLOAD_INVALID_JSON', 'DEGRADED'),
        expectedStatus: 'DEGRADED',
        expectedClass: 'PAYLOAD_INVALID_JSON'
      },
      {
        error: new OpenAIAdapterError('Schema mismatch', 'PAYLOAD_SCHEMA_MISMATCH', 'DEGRADED'),
        expectedStatus: 'DEGRADED',
        expectedClass: 'PAYLOAD_SCHEMA_MISMATCH'
      },
      {
        error: new Error('Unexpected catastrophic runtime failure'),
        expectedStatus: 'UNAVAILABLE',
        expectedClass: 'UPSTREAM_FAILURE'
      }
    ];

    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    for (const scenario of failureScenarios) {
      vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(scenario.error);

      const ctx = createMockPipelineContext('cek status armada');
      const result = await IntentResolver.resolve(ctx);

      expect(geminiSpy).not.toHaveBeenCalled();
      expect(result.intent).toBe('SHOW_TIMELINE');
      expect(ctx.resolutionMetadata?.aiStatus).toBe(scenario.expectedStatus);
      expect(ctx.resolutionMetadata?.failureClass).toBe(scenario.expectedClass);
      expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
    }

    expect(geminiSpy).toHaveBeenCalledTimes(0);
  });

  // NA-05: Repeated resolutions (success, failure, mixed) accumulate zero Gemini invocations
  it('NA-05: 10 consecutive successes, 10 consecutive failures, and 10 mixed resolutions all result in cumulative 0 Gemini calls', async () => {
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    // 10 Successes
    for (let i = 0; i < 10; i++) {
      vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockResolvedValueOnce({
        intent: 'SHOW_TIMELINE',
        confidence: 0.9,
        entities: { JobOrder: `JO-${i}` },
        ambiguities: [],
        reasoning: 'Batch test',
        language: 'id'
      });
      const ctx = createMockPipelineContext(`timeline ${i}`);
      const res = await IntentResolver.resolve(ctx);
      expect(res.intent).toBe('SHOW_TIMELINE');
      expect(ctx.resolutionMetadata?.resolutionSource).toBe('OPENAI');
    }
    expect(geminiSpy).toHaveBeenCalledTimes(0);

    // 10 Failures
    for (let i = 0; i < 10; i++) {
      vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(
        new OpenAIAdapterError(`Error ${i}`, 'UPSTREAM_FAILURE', 'UNAVAILABLE')
      );
      const ctx = createMockPipelineContext(`cek status armada ${i}`);
      const res = await IntentResolver.resolve(ctx);
      expect(res.intent).toBe('SHOW_TIMELINE');
      expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
    }
    expect(geminiSpy).toHaveBeenCalledTimes(0);

    // 10 Mixed
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockResolvedValueOnce({
          intent: 'SHOW_TIMELINE',
          confidence: 0.85,
          entities: {},
          ambiguities: [],
          reasoning: 'Even mixed',
          language: 'id'
        });
      } else {
        vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(
          new OpenAIAdapterError('Odd mixed error', 'TIMEOUT_EXCEEDED', 'UNAVAILABLE')
        );
      }
      const ctx = createMockPipelineContext(`lihat timeline ${i}`);
      const res = await IntentResolver.resolve(ctx);
      expect(res.intent).toBe('SHOW_TIMELINE');
      if (i % 2 === 0) {
        expect(ctx.resolutionMetadata?.resolutionSource).toBe('OPENAI');
      } else {
        expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
      }
    }

    // Cumulative Gemini calls MUST strictly remain 0
    expect(geminiSpy).toHaveBeenCalledTimes(0);
  });

  // NA-06: Spy all known providers (OpenAI allowed, Gemini forbidden)
  it('NA-06: Strict surveillance proves OpenAI is the only AI provider that receives invocations', async () => {
    const openAiSpy = vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockResolvedValueOnce({
      intent: 'SHOW_TIMELINE',
      confidence: 0.99,
      entities: {},
      ambiguities: [],
      reasoning: 'Sole provider test',
      language: 'id'
    });
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    const ctx = createMockPipelineContext('tampilkan timeline');
    await IntentResolver.resolve(ctx);

    expect(openAiSpy).toHaveBeenCalledTimes(1);
    expect(geminiSpy).not.toHaveBeenCalled();
  });

  // NA-07: Fallback source assert
  it('NA-07: When fallback executes, resolutionSource is explicitly asserted as DETERMINISTIC_FALLBACK and never a secondary AI provider', async () => {
    vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(
      new OpenAIAdapterError('429 rate limited', 'QUOTA_EXHAUSTED', 'UNAVAILABLE')
    );

    const ctx = createMockPipelineContext('lihat timeline');
    const result = await IntentResolver.resolve(ctx);

    expect(result.intent).toBe('SHOW_TIMELINE');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
    expect(ctx.resolutionMetadata?.resolutionSource).not.toBe('GEMINI');
    expect(ctx.resolutionMetadata?.resolutionSource).not.toBe('OPENAI');
  });

  // NA-08: No silent provider substitution across HTTP 5xx, timeouts, or JSON syntax errors
  it('NA-08: HTTP 500/502/503/504, connection drops, and syntax errors never silently invoke Gemini or another provider', async () => {
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    const badResponses = [
      new OpenAIAdapterError('500 Internal Server Error', 'UPSTREAM_FAILURE', 'UNAVAILABLE'),
      new OpenAIAdapterError('502 Bad Gateway', 'UPSTREAM_FAILURE', 'UNAVAILABLE'),
      new OpenAIAdapterError('503 Service Unavailable', 'CAPACITY_EXHAUSTED', 'UNAVAILABLE'),
      new OpenAIAdapterError('504 Gateway Timeout', 'TIMEOUT_EXCEEDED', 'UNAVAILABLE'),
      new OpenAIAdapterError('JSON Parse error', 'PAYLOAD_INVALID_JSON', 'DEGRADED')
    ];

    for (const err of badResponses) {
      vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(err);
      const ctx = createMockPipelineContext('lihat timeline');
      await IntentResolver.resolve(ctx);
      expect(geminiSpy).not.toHaveBeenCalled();
      expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
    }
  });

  // NA-10: Test the test — confirm spies actually intercept calls if invoked directly
  it('NA-10: Meta-verification: confirms Gemini spy detects calls when invoked directly, proving zero calls in NA-01..08 is genuine', async () => {
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent').mockResolvedValueOnce({
      intent: 'MOCK',
      confidence: 1,
      entities: {},
      ambiguities: [],
      reasoning: 'Spy test',
      language: 'id'
    });

    // Directly calling Gemini verifies the spy operates correctly
    await GeminiIntentAdapter.extractIntent('test input');
    expect(geminiSpy).toHaveBeenCalledTimes(1);
  });
});
