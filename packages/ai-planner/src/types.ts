export type PlanIntent =
  | "answer"
  | "tool"
  | "workflow";

export interface PlanStep {
  readonly id: string;
  readonly action: string;
  readonly tool?: string;
  readonly input?: unknown;
}

export interface Plan {
  readonly goal: string;
  readonly intent: PlanIntent;
  readonly steps: readonly PlanStep[];
}

export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
}
