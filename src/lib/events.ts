import { EventEmitter } from "events";
import { logger } from "@/lib/logger";

export type AppEvent =
  | "issue:created"
  | "issue:updated"
  | "issue:status_changed"
  | "issue:assignee_changed"
  | "issue:comment_added"
  | "issue:board_moved"
  | "project:created"
  | "project:updated"
  | "sprint:created"
  | "sprint:started"
  | "sprint:completed"
  | "sprint:updated";

export interface EventPayload {
  organizationId: string;
  projectId?: string;
  issueId?: string;
  actorId: string;
  data: Record<string, any>;
  timestamp: string;
}

class RealtimeEventBus extends EventEmitter {
  emitEvent(event: AppEvent, payload: Omit<EventPayload, "timestamp">) {
    const fullPayload: EventPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Realtime Event Dispatched: [${event}]`, {
      event: "REALTIME_EVENT",
      type: event,
      organizationId: fullPayload.organizationId,
      projectId: fullPayload.projectId,
      issueId: fullPayload.issueId,
    });

    this.emit(event, fullPayload);
    this.emit("*", { event, ...fullPayload });
  }
}

export const eventBus = new RealtimeEventBus();
