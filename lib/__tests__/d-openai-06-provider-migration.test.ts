import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIIntentAdapter, OpenAIAdapterError } from '@/src/platforms/copilot/intelligence/adapters/OpenAIIntentAdapter';
import { IntentResolver } from '@/src/platforms/copilot/resolver/IntentResolver';
import { PipelineContext } from '@/src/platforms/copilot/pipeline/PipelineModels';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';

import { IntentKnowledgeRegistry } from '@/src/platforms/copilot/intelligence/IntentKnowledgeRegistry';
import { GeminiIntentAdapter } from '@/src/platforms/copilot/intelligence/adapters/GeminiIntentAdapter';

describe('D-OPENAI-06: OpenAI Provider Migration Suite', () => {
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
      tenant: TenantContext.create({ id: 'tenant-123' }),
      user: UserContext.create({ id: 'user-123', roles: ['DISPATCHER'] }),
      permissions: PermissionContext.create(['JobOrder.Update']),
      conversation: ConversationContext.create({ conversationId: 'conv-1' }),
      workspace: WorkspaceContext.create({})
    });
    return new PipelineContext(userInput, opContext);
  }

  it('A. OpenAI adapter initializes and detects missing API key', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPEN_AI_KEY;

    await expect(OpenAIIntentAdapter.extractIntent('test input')).rejects.toThrow(OpenAIAdapterError);
    try {
      await OpenAIIntentAdapter.extractIntent('test input');
    } catch (err: any) {
      expect(err).toBeInstanceOf(OpenAIAdapterError);
      expect(err.failureClass).toBe('AUTH_MISCONFIGURED');
      expect(err.aiStatus).toBe('DEGRADED');
    }
  });

  it('B. Valid OpenAI intent response parses correctly into provider-neutral result', async () => {
    vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockResolvedValueOnce({
      intent: 'SHOW_TIMELINE',
      confidence: 0.95,
      entities: { JobOrder: 'JO-123' },
      ambiguities: [],
      reasoning: 'User asked for timeline of JO-123',
      language: 'id'
    });

    const ctx = createMockPipelineContext('tampilkan timeline JO-123');
    const result = await IntentResolver.resolve(ctx);

    expect(result.intent).toBe('SHOW_TIMELINE');
    expect(result.confidence).toBe(0.95);
    expect(ctx.resolutionMetadata?.aiStatus).toBe('AVAILABLE');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('OPENAI');
  });

  it('C. Malformed OpenAI response falls through to deterministic fallback', async () => {
    vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(
      new OpenAIAdapterError('Invalid JSON payload', 'PAYLOAD_INVALID_JSON', 'DEGRADED')
    );

    const ctx = createMockPipelineContext('lihat timeline');
    const result = await IntentResolver.resolve(ctx);

    // Matches deterministic fallback keywords for SHOW_TIMELINE
    expect(result.intent).toBe('SHOW_TIMELINE');
    expect(ctx.resolutionMetadata?.aiStatus).toBe('DEGRADED');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
    expect(ctx.resolutionMetadata?.failureClass).toBe('PAYLOAD_INVALID_JSON');
  });

  it('D. Unsupported / unclassifiable intent triggers UnknownIntentHandler', async () => {
    vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockResolvedValueOnce({
      intent: 'UNKNOWN',
      confidence: 0,
      entities: {},
      ambiguities: [],
      reasoning: 'Cannot understand request',
      language: 'id'
    });

    const ctx = createMockPipelineContext('halo apa kabar sentralogis');
    const result = await IntentResolver.resolve(ctx);

    expect(result.intent).toBe('UNKNOWN');
    expect(ctx.resolutionMetadata?.aiStatus).toBe('AVAILABLE');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('OPENAI');
  });

  it('E. Provider upstream failure maps to UNAVAILABLE and activates fallback', async () => {
    vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(
      new OpenAIAdapterError('Service Unavailable', 'CAPACITY_EXHAUSTED', 'UNAVAILABLE')
    );

    const ctx = createMockPipelineContext('cek status armada');
    const result = await IntentResolver.resolve(ctx);

    // Fallback matched SHOW_TIMELINE via 'status'
    expect(result.intent).toBe('SHOW_TIMELINE');
    expect(ctx.resolutionMetadata?.aiStatus).toBe('UNAVAILABLE');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
    expect(ctx.resolutionMetadata?.failureClass).toBe('CAPACITY_EXHAUSTED');
  });

  it('F. Provider error classification correctly categorizes 429 quota exhaustion', () => {
    const error429 = { status: 429, code: 'insufficient_quota', message: 'You exceeded your current quota' };
    const classified = OpenAIIntentAdapter.classifyError(error429);

    expect(classified.failureClass).toBe('QUOTA_EXHAUSTED');
    expect(classified.aiStatus).toBe('UNAVAILABLE');
  });

  it('G. Provider error classification correctly categorizes 401 auth failure', () => {
    const error401 = { status: 401, message: 'Incorrect API key provided' };
    const classified = OpenAIIntentAdapter.classifyError(error401);

    expect(classified.failureClass).toBe('AUTH_MISCONFIGURED');
    expect(classified.aiStatus).toBe('DEGRADED');
  });

  it('H. Provider error classification correctly categorizes timeout', () => {
    const errTimeout = { name: 'AbortError', message: 'The user aborted a request' };
    const classified = OpenAIIntentAdapter.classifyError(errTimeout);

    expect(classified.failureClass).toBe('TIMEOUT_EXCEEDED');
    expect(classified.aiStatus).toBe('UNAVAILABLE');
  });

  it('I. Zero Gemini invocation on active path', async () => {
    const openAiSpy = vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockResolvedValueOnce({
      intent: 'SHOW_TIMELINE',
      confidence: 0.9,
      entities: {},
      ambiguities: [],
      reasoning: 'OK',
      language: 'id'
    });
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    const ctx = createMockPipelineContext('tampilkan timeline');
    await IntentResolver.resolve(ctx);

    expect(openAiSpy).toHaveBeenCalledTimes(1);
    expect(geminiSpy).not.toHaveBeenCalled();
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('OPENAI');
  });

  it('J. No provider cascade: OpenAI failure falls through to deterministic fallback with zero Gemini invocation', async () => {
    vi.spyOn(OpenAIIntentAdapter, 'extractIntent').mockRejectedValueOnce(
      new OpenAIAdapterError('Upstream network drop', 'UPSTREAM_FAILURE', 'UNAVAILABLE')
    );
    const geminiSpy = vi.spyOn(GeminiIntentAdapter, 'extractIntent');

    const ctx = createMockPipelineContext('lihat timeline');
    const result = await IntentResolver.resolve(ctx);

    expect(geminiSpy).not.toHaveBeenCalled();
    expect(result.intent).toBe('SHOW_TIMELINE');
    expect(ctx.resolutionMetadata?.resolutionSource).toBe('DETERMINISTIC_FALLBACK');
  });
});
