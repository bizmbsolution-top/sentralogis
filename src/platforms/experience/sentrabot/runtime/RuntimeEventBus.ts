import { ExperienceEvent, ExperienceEventType } from './ExperienceEvents';

type EventHandler = (event: ExperienceEvent) => void;

export class RuntimeEventBus {
  private listeners: Map<ExperienceEventType, Set<EventHandler>> = new Map();
  private wildcardListeners: Set<EventHandler> = new Set();

  subscribe(type: ExperienceEventType, handler: EventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    this.wildcardListeners.add(handler);
    return () => {
      this.wildcardListeners.delete(handler);
    };
  }

  publish(event: ExperienceEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
    this.wildcardListeners.forEach(handler => handler(event));
  }
}
