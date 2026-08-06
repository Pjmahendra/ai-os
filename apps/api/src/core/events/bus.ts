import { EventEmitter } from "node:events";
import { Event } from "./event.js";

class EventBus extends EventEmitter {
  publish<T>(event: Event<T>) {
    this.emit(event.type, event);
  }

  subscribe<T>(
    type: string,
    handler: (event: Event<T>) => void
  ) {
    this.on(type, handler);
  }
}

export const eventBus = new EventBus();
