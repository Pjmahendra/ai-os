import type { Plan } from "@ai-os/ai-planner";

import {
  EchoTool,
  N8NExecuteTool,
  ToolRegistry
} from "@ai-os/ai-tools";
import {
  AutomationExecuteTool
} from "./automation.tool.js";
import {
  AutomationCreateTool
} from "./automation-create.tool.js";
import {
  AutomationUpdateTool
} from "./automation-update.tool.js";
import {
  AutomationListTool
} from "./automation-list.tool.js";
import { AutomationToggleTool } from "./automation-toggle.tool.js";
import {
  AutomationDeleteTool
} from "./automation-delete.tool.js";
import {
  MemoryCreateTool
} from "./memory-create.tool.js";
import {
  MemorySearchTool
} from "./memory-search.tool.js";
import {
  MemoryUpdateTool
} from "./memory-update.tool.js";
import {
  MemoryDeleteTool
} from "./memory-delete.tool.js";
import { EmailListThreadsTool } from "./email-list-threads.tool.js";
import { EmailReadThreadTool } from "./email-read-thread.tool.js";
import { EmailDraftReplyTool } from "./email-draft-reply.tool.js";
import { EmailDraftNewTool } from "./email-draft-new.tool.js";
import { EmailListDraftsTool } from "./email-list-drafts.tool.js";
import { EmailUpdateDraftTool } from "./email-update-draft.tool.js";
import { EmailDeleteDraftTool } from "./email-delete-draft.tool.js";
export interface ExecutionResult {
  readonly success: boolean;
  readonly results: readonly unknown[];
}

export const toolRegistry = new ToolRegistry();

toolRegistry.register(new EchoTool());
toolRegistry.register(new N8NExecuteTool());
toolRegistry.register(
  new AutomationExecuteTool()
);
toolRegistry.register(
  new AutomationCreateTool()
);
toolRegistry.register(
  new AutomationUpdateTool()
);
toolRegistry.register(
  new AutomationListTool()
);
toolRegistry.register(new AutomationToggleTool());
toolRegistry.register(
  new AutomationDeleteTool()
);
toolRegistry.register(new MemoryCreateTool());
toolRegistry.register(new MemorySearchTool());
toolRegistry.register(new MemoryUpdateTool());
toolRegistry.register(new MemoryDeleteTool());

// Deliberately no email.send tool here - see email-draft-reply.tool.ts
// for why sending stays a human-only action through the Inbox UI.
toolRegistry.register(new EmailListThreadsTool());
toolRegistry.register(new EmailReadThreadTool());
toolRegistry.register(new EmailDraftReplyTool());
toolRegistry.register(new EmailDraftNewTool());
toolRegistry.register(new EmailListDraftsTool());
toolRegistry.register(new EmailUpdateDraftTool());
toolRegistry.register(new EmailDeleteDraftTool());
export async function executePlan(
  plan: Plan,
  userId?: string
): Promise<ExecutionResult> {
  const results: unknown[] = [];

  for (const step of plan.steps) {
    if (step.tool === undefined) {
      results.push({
        stepId: step.id,
        action: step.action,
        status: "skipped",
        reason: "No tool specified"
      });

      continue;
    }

    try {
      const result = await toolRegistry.execute(
        step.tool,
        step.input ?? {},
        {
          userId
        }
      );

      results.push({
        stepId: step.id,
        tool: step.tool,
        input: step.input,
        status: "success",
        result
      });
    } catch (error) {
      results.push({
        stepId: step.id,
        tool: step.tool,
        input: step.input,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Tool execution failed"
      });

      return {
        success: false,
        results
      };
    }
  }

  return {
    success: true,
    results
  };
}