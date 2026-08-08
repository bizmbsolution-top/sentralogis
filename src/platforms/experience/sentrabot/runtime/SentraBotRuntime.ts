import { ExperienceEvent, ExperienceEventType } from './ExperienceEvents';
import { RuntimeEventBus } from './RuntimeEventBus';
import { SentraBotStateMachine } from './SentraBotStateMachine';
import { EmotionEngine } from './EmotionEngine';
import { PresenceEngine } from './PresenceEngine';
import { SpeechEngine } from './SpeechEngine';
import { ConfidenceEngine } from './ConfidenceEngine';
import { OperationalContext } from './OperationalContext';
import { OperationalMood } from './OperationalMood';
import { SpeechState } from './SpeechState';
import { EmotionProfile } from './EmotionProfile';
import { AnimationState, Emotion, PresenceMode, SentraBotConfig } from '../SentraBotState';

export interface RuntimeStateSnapshot {
  animationState: AnimationState;
  emotion: Emotion;
  profile: EmotionProfile;
  presence: PresenceMode;
  speech: SpeechState;
  mood: OperationalMood;
  confidence: number;
  context: OperationalContext;
  whyCurrentState: string;
}

export class SentraBotRuntime {
  private bus = new RuntimeEventBus();
  
  private currentState = AnimationState.IDLE;
  private currentMood = OperationalMood.CALM;
  private currentConfidence = 1.0;
  private currentContext: OperationalContext = {};
  private config: SentraBotConfig = { reducedMotion: false, voiceEnabled: false };
  private whyCurrentState = "Awaiting input.";

  constructor(initialConfig?: Partial<SentraBotConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
    
    // Internal subscriptions to drive state machine
    this.bus.subscribe('IntentCaptured', (e) => this.transition(AnimationState.LISTENING, e, "Captured user intent."));
    this.bus.subscribe('IntentResolved', (e) => this.transition(AnimationState.UNDERSTANDING, e, "Intent resolved, understanding entities."));
    this.bus.subscribe('ValidationStarted', (e) => this.transition(AnimationState.VALIDATING, e, "Validating business rules."));
    this.bus.subscribe('PlanningStarted', (e) => this.transition(AnimationState.PLANNING, e, "Formulating execution plan."));
    this.bus.subscribe('PlanningCompleted', (e) => this.transition(AnimationState.WAITING_CONFIRMATION, e, "Waiting for human confirmation."));
    this.bus.subscribe('ExecutionStarted', (e) => this.transition(AnimationState.EXECUTING, e, "Executing application service."));
    this.bus.subscribe('ExecutionSucceeded', (e) => this.transition(AnimationState.SUCCESS, e, "Execution succeeded."));
    this.bus.subscribe('ExecutionFailed', (e) => this.transition(AnimationState.ERROR, e, "Execution failed."));
    this.bus.subscribe('SystemOffline', (e) => this.transition(AnimationState.OFFLINE, e, "System offline."));
    this.bus.subscribe('UserIdle', (e) => this.transition(AnimationState.IDLE, e, "Awaiting input."));
  }

  public dispatch(event: ExperienceEvent): void {
    
    // Extract metadata from payloads if present
    if (event.payload) {
      if (event.payload.confidence !== undefined) {
        this.currentConfidence = ConfidenceEngine.parseConfidence(event.payload.confidence);
      }
      if (event.payload.riskLevel) {
        this.currentContext.currentRisk = event.payload.riskLevel;
      }
      if (event.payload.mood) {
        this.currentMood = event.payload.mood;
      }
    }

    this.bus.publish(event);
  }

  public subscribe(handler: (snapshot: RuntimeStateSnapshot) => void): () => void {
    return this.bus.subscribeAll(() => {
      handler(this.getSnapshot());
    });
  }

  private transition(targetState: AnimationState, event: ExperienceEvent, reason: string): void {
    if (SentraBotStateMachine.canTransition(this.currentState, targetState)) {
      this.currentState = targetState;
      this.whyCurrentState = reason;
    } else {
      console.warn(`[SentraBotRuntime] Illegal transition from ${this.currentState} to ${targetState} blocked.`);
    }
  }

  public getSnapshot(): RuntimeStateSnapshot {
    const emotion = EmotionEngine.deriveEmotion(this.currentState, this.currentConfidence, this.currentContext.currentRisk);
    const profile = EmotionEngine.getProfile(emotion);
    const presence = PresenceEngine.determinePresence(this.currentState, this.currentMood);
    const speech = SpeechEngine.deriveSpeechState(this.currentState, this.config.voiceEnabled);

    return {
      animationState: this.currentState,
      emotion,
      profile,
      presence,
      speech,
      mood: this.currentMood,
      confidence: this.currentConfidence,
      context: this.currentContext,
      whyCurrentState: this.whyCurrentState
    };
  }

  // Getters for specific subsystems if needed
  public getConfig() { return this.config; }
  public updateConfig(newConfig: Partial<SentraBotConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.dispatch({ type: 'ContextChanged', timestamp: Date.now() });
  }
}
