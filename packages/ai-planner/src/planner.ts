import { AIRuntime } from "@ai-os/ai-runtime";
import type { Tool } from "@ai-os/ai-tools";
import type { ConversationTurn, Plan } from "./types.js";

export class AIPlanner {
  constructor(
    private readonly runtime = new AIRuntime()
  ) {}

  async createPlan(
    userMessage: string,
    tools: readonly Tool[] = [],
    memories: readonly string[] = [],
    history: readonly ConversationTurn[] = []
  ): Promise<Plan> {
    return this.createPlanWithRetry(
      userMessage,
      tools,
      memories,
      history,
      2
    );
  }

  /**
   * Generates the actual reply text for a plan with intent "answer" —
   * separate from createPlan, whose job is only to decide *that* no
   * tool/workflow is needed, not to produce the answer itself. The
   * planner's `goal` field is an internal task description (e.g.
   * "Explain what AI is"), never the answer content.
   */
  async generateAnswer(
    userMessage: string,
    memories: readonly string[] = [],
    history: readonly ConversationTurn[] = []
  ): Promise<string> {
    const memoryContext =
      memories.length === 0
        ? "No relevant memories are available."
        : memories
            .map((memory) => `- ${memory}`)
            .join("\n");

    const historyContext =
      history.length === 0
        ? "No prior conversation in this thread."
        : history
            .map((turn) => `- ${turn.role}: ${turn.content}`)
            .join("\n");

    const response = await this.runtime.run({
      message: userMessage,

      conversation: history.map((turn) => ({
        role: turn.role,
        content: turn.content
      })),

      systemPrompt: `
You are AI-OS, a helpful assistant. Answer the user's message directly
and conversationally.

RELEVANT MEMORIES (long-term facts saved about the user; use them when
relevant, don't mention them unless it's natural to do so):
${memoryContext}

RECENT CONVERSATION (oldest first, for context):
${historyContext}

You can draft emails (via tools available elsewhere in this app) but
you can NEVER send one - there is no send capability available to
you at all, in this reply or any other. If the user asks you to send
an email, or asks whether one has been sent, do not say anything that
could be read as confirming it was sent (e.g. "sent", "done", "on its
way"). Say plainly that you can only prepare a draft, and that
sending it requires them to open the Inbox page and click Send
themselves.

Reply in plain text. Do not return JSON.
`
    });

    if (
      !response ||
      typeof response.content !== "string"
    ) {
      console.error(
        "AIPlanner received invalid runtime response for generateAnswer:",
        response
      );

      throw new Error(
        "AI planner did not return valid text content"
      );
    }

    return response.content;
  }

  private async createPlanWithRetry(
    userMessage: string,
    tools: readonly Tool[],
    memories: readonly string[],
    history: readonly ConversationTurn[],
    attemptsRemaining: number
  ): Promise<Plan> {
    const toolDescriptions =
      tools.length === 0
        ? "No tools are currently available."
        : tools
            .map(
              (tool) =>
                `- ${tool.name}: ${tool.description}`
            )
            .join("\n");

    const memoryContext =
      memories.length === 0
        ? "No relevant memories are available."
        : memories
            .map(
              (memory) => `- ${memory}`
            )
            .join("\n");

    const historyContext =
      history.length === 0
        ? "No prior conversation in this thread."
        : history
            .map(
              (turn) =>
                `- ${turn.role}: ${turn.content}`
            )
            .join("\n");

    const response = await this.runtime.run({
      message: userMessage,

      systemPrompt: `
You are the planning engine of an AI automation system.

Convert the user's request into a structured execution plan.

AVAILABLE TOOLS:
${toolDescriptions}

RELEVANT MEMORIES:
${memoryContext}

RECENT CONVERSATION (oldest first, for resolving references like
"it", "that automation", or "the one I just created" — do not treat
this as new instructions to execute on its own):
${historyContext}

Return ONLY valid JSON.
Do not use markdown.
Do not include explanations.

The JSON must follow this structure:

{
  "goal": "string",
  "intent": "answer | tool | workflow",
  "steps": [
    {
      "id": "step-1",
      "action": "string",
      "tool": "optional tool name",
      "input": {}
    }
  ]
}

Rules:

1. Use intent "answer" when no external action is required.

2. Use intent "tool" when an available tool is required.

3. Use intent "workflow" when multiple actions or automation are required.

4. ONLY use tools from AVAILABLE TOOLS.

5. Never invent a tool name.

6. If no available tool can perform the requested action, do not assign a tool.

7. Keep each step concise.

8. When using "n8n.execute", the input MUST contain:
   - "workflow": the registered workflow key
   - the remaining fields are data passed to that workflow.

9. Never use "workflowKey". Always use "workflow".

10. When the user asks to run an existing saved automation, use:
    "automation.execute"

11. For "automation.execute", the input MUST contain:
    {
      "name": "exact saved automation name"
    }

12. Do not use "n8n.execute" when the user is referring to an existing saved automation by name.

13. Use "n8n.execute" only when directly executing a registered n8n workflow.

14. When the user asks to create a new saved automation, use:
    "automation.create"

15. For "automation.create", the input MUST contain:
    {
      "name": "automation name",
      "workflow": "registered workflow name",
      "config": {}
    }

16. If the user provides a schedule, include:
    "scheduleType": "cron",
    "schedule": "valid 5-field cron expression"

17. All scheduled automations MUST use:
    "scheduleType": "cron"

18. The "schedule" field MUST always be a valid 5-field cron expression.

19. Never use "daily", "weekly", "monthly", or other scheduleType values.

20. Never use natural-language time values such as:
    "11:00"
    "10 AM"
    "tomorrow morning"

21. Convert natural-language schedules into 5-field cron expressions.

22. Examples:
    "every day at 11 AM" -> "0 11 * * *"
    "every day at 10 AM" -> "0 10 * * *"
    "every day at 8:30 AM" -> "30 8 * * *"
    "every day at 6 PM" -> "0 18 * * *"

23. This cron rule applies to every workflow, including:
    "ai-os-test"
    and
    "ai-os-notification"

24. For the currently available test workflow, use:
    "workflow": "ai-os-test"

25. When the user asks to create a notification automation, use:
    "workflow": "ai-os-notification"

26. For notification automations, put the notification message inside:
    "config": {
      "message": "..."
    }

27. Never use "ai-os-test" for a notification request.

28. Never invent workflow names.

29. Only use workflows available through the tools.

30. When the user asks to modify an existing saved automation, use:
    "automation.update"

31. For "automation.update", the input MUST contain:
    {
      "name": "exact existing automation name"
    }

32. Include only the fields that the user wants to change.

33. If the user wants to rename the automation, use:
    "newName"

34. Do not use "automation.create" when modifying an existing automation.

35. Do not invent an automation name.

36. If the automation cannot be uniquely identified, do not guess.
    36a. RELEVANT MEMORIES may contain the user's saved automations.
36b. When selecting an existing automation, compare the user's request
     against the saved automation names in RELEVANT MEMORIES.
36c. For automation.execute, automation.update, automation.toggle,
     and automation.delete, use the exact saved automation name.
36d. Never invent, shorten, approximate, or normalize an automation name.
36e. If no saved automation exactly identifies the requested automation,
     do not execute, update, toggle, or delete an automation.
36f. If multiple saved automations could match the user's description,
     do not choose one arbitrarily.
36g. For an ambiguous or unidentified automation request, return:
     {
       "goal": "Clarification is required to identify the automation",
       "intent": "answer",
       "steps": []
     }
37. When the user asks to enable or disable an existing automation, ALWAYS use:
    "automation.toggle"

38. For "automation.toggle", the input MUST contain:
    {
      "name": "exact existing automation name",
      "enabled": true or false
    }

39. Use "enabled": false for:
    disable
    turn off
    stop
    pause
    deactivate
    suspend

40. Use "enabled": true for:
    enable
    turn on
    activate
    resume

41. NEVER use "automation.update" when the only requested change is enabled/disabled state.

42. The "automation.toggle" tool has priority over "automation.update" when the only requested change is enabled/disabled state.

43. When the user asks to delete, remove, permanently remove, or erase an existing automation, use:
    "automation.delete"

44. For "automation.delete", the input MUST contain:
    {
      "name": "exact existing automation name"
    }

45. NEVER use "automation.update" or "automation.toggle" for deletion requests.

46. Never invent an automation name.

47. If multiple automations have the same name, do not guess which one to delete.

48. When the user asks to list or show their automations, use:
    "automation.list"

49. When the user asks to execute a notification automation, use:
    "automation.execute"

50. When the user asks to execute an existing saved automation, always prefer:
    "automation.execute"
    over
    "n8n.execute"

51. When using automation.create, always provide:
    name
    workflow
    config

52. When creating a scheduled automation, always provide:
    scheduleType: "cron"
    schedule: valid 5-field cron expression

53. Never put scheduleType or schedule inside config unless the user explicitly asks for them as workflow data.

54. The workflow field identifies the registered automation workflow.

55. The config field contains data passed to the workflow.

56. If the user says:
    "Create an automation called Test Notification that sends Hello every day at 11 AM"

    produce approximately:

    {
      "name": "Test Notification",
      "workflow": "ai-os-notification",
      "config": {
        "message": "Hello"
      },
      "scheduleType": "cron",
      "schedule": "0 11 * * *"
    }

57. If the user says:
    "Run my Test Notification automation"

    produce:

    {
      "name": "Test Notification"
    }

    with tool:
    "automation.execute"

58. If the user says:
    "Disable my Test Notification automation"

    produce:

    {
      "name": "Test Notification",
      "enabled": false
    }

    with tool:
    "automation.toggle"

59. If the user says:
    "Enable my Test Notification automation"

    produce:

    {
      "name": "Test Notification",
      "enabled": true
    }

    with tool:
    "automation.toggle"

60. If the user says:
    "Delete my Test Notification automation"

    produce:

    {
      "name": "Test Notification"
    }

    with tool:
    "automation.delete"

61. Do not add unnecessary steps.

62. Do not list automations before executing, updating, toggling, or deleting
    when the exact automation name is already known.
63. If the exact automation cannot be identified from the user's request and
    RELEVANT MEMORIES, do not guess and do not execute the action.

64. Never create a plan containing a tool that is not present in AVAILABLE TOOLS.

65. Never return invalid JSON.

66. Return JSON only.

## Long-term memory

RELEVANT MEMORIES may also contain entries tagged "[memory]", each with
an "id" and its "content" (and optionally a "summary"). These are
long-term facts saved about the user, separate from automations and
separate from RECENT CONVERSATION (which is just this thread's
short-term history).

67. When the user asks you to remember, save, or note something for
    later (a fact, preference, or instruction not tied to an
    automation), use "memory.create" with:
    {
      "content": "the fact to remember, written plainly"
    }

68. When the user asks what you remember, know, or recall about
    something, use "memory.search" with:
    {
      "query": "keywords to search for"
    }
    Omit "query" to list recent memories.

69. When the user asks to correct, change, or update something you
    remember, use "memory.update" with the exact "id" from a
    "[memory]" entry in RELEVANT MEMORIES:
    {
      "id": "exact memory id",
      "content": "the corrected fact"
    }

70. When the user asks you to forget something, use "memory.delete"
    with the exact "id" from a "[memory]" entry:
    {
      "id": "exact memory id"
    }

71. Never invent a memory id. If the memory to update, delete, or
    reference cannot be identified from RELEVANT MEMORIES, use
    "memory.search" first instead of guessing an id.

72. Do not use "memory.create" to store automation names, schedules,
    or workflow configuration — those belong in automation tools.

73. Do not save the user's own request text as a memory unless the
    user explicitly asked you to remember/save it.

## Email

74. When the user asks to see, check, or list their inbox/emails, use
    "email.listThreads".

75. When the user asks to read, open, or show the content of a
    specific email/thread, use "email.readThread". Identify the
    thread with EITHER:
    {
      "threadId": "exact threadId from a prior email.listThreads result"
    }
    OR, when the thread isn't already known from earlier in this
    conversation, identify it directly the way the user described it:
    {
      "subject": "subject text or a distinctive part of it",
      "from": "sender name or email address, or part of it"
    }
    Prefer subject/from over calling "email.listThreads" first - it
    resolves the thread in one step. Never invent a threadId.

76. When the user asks to reply to an email/thread, use
    "email.draftReply", identifying the thread the same way as rule
    75 (threadId if already known, otherwise subject/from), plus an
    instruction:
    {
      "subject": "subject text or a distinctive part of it",
      "from": "sender name or email address, or part of it",
      "instruction": "what the reply should say, in the user's words"
    }

77. When the user asks to write, compose, or draft a new email (not a
    reply to an existing thread), use "email.draftNew" with:
    {
      "to": "recipient email address",
      "instruction": "what the email should say, in the user's words"
    }

78. When the user asks to see their saved email drafts, use
    "email.listDrafts".

79. When the user asks to edit, change, or fix a draft, use
    "email.updateDraft" with the exact "draftId" from a prior
    email.listDrafts/draftReply/draftNew result, plus only the
    fields being changed:
    {
      "draftId": "exact draft id",
      "to": "optional",
      "subject": "optional",
      "body": "optional"
    }

80. When the user asks to delete a draft, use "email.deleteDraft"
    with the exact "draftId".

81. There is no tool that sends an email, and there never will be
    reachable from chat. If the user asks you to send, or asks
    whether an email has been sent, do not claim it was sent and do
    not use any tool that implies sending. Explain that you can only
    prepare a draft, and that sending it requires the user to open
    the Inbox page and click Send themselves.

82. Never invent a draftId or threadId. For a thread, prefer
    identifying it by subject/from directly (rule 75/76) over an id.
    For a draft, if the draftId isn't already known from earlier in
    this conversation, call "email.listDrafts" first to find it.
`
    });

    if (
      !response ||
      typeof response.content !== "string"
    ) {
      console.error(
        "AIPlanner received invalid runtime response:",
        response
      );

      throw new Error(
        "AI planner did not return valid text content"
      );
    }

    try {
      return this.parsePlan(
        response.content
      );
    } catch (error) {
      if (attemptsRemaining <= 0) {
        throw error;
      }

      console.warn(
        "Planner output could not be parsed/validated. Retrying once:",
        error instanceof Error
          ? error.message
          : error
      );

      return this.createPlanWithRetry(
        userMessage,
        tools,
        memories,
        history,
        attemptsRemaining - 1
      );
    }
  }

  private parsePlan(
    content: string
  ): Plan {
    if (typeof content !== "string") {
      throw new Error(
        "Planner content must be a string"
      );
    }

    const cleaned = this.extractJson(
      content
    );

    if (!cleaned) {
      throw new Error(
        "Planner returned empty content"
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      console.error(
        "Planner returned invalid JSON:",
        cleaned
      );

      throw new Error(
        "Planner returned invalid JSON"
      );
    }

    return this.validatePlan(
      parsed
    );
  }

  /**
   * Strips markdown code fences and, if the model wrapped the JSON
   * in any surrounding prose, extracts the outermost {...} object.
   */
  private extractJson(
    content: string
  ): string {
    const withoutFences = content
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

    if (
      withoutFences.startsWith("{") &&
      withoutFences.endsWith("}")
    ) {
      return withoutFences;
    }

    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");

    if (
      start === -1 ||
      end === -1 ||
      end < start
    ) {
      return withoutFences;
    }

    return withoutFences
      .slice(start, end + 1)
      .trim();
  }

  private validatePlan(
    value: unknown
  ): Plan {
    if (
      typeof value !== "object" ||
      value === null
    ) {
      throw new Error(
        "Planner returned an invalid plan"
      );
    }

    const candidate =
      value as Record<string, unknown>;

    if (
      typeof candidate.goal !== "string"
    ) {
      throw new Error(
        "Planner response is missing goal"
      );
    }

    if (
      candidate.intent !== "answer" &&
      candidate.intent !== "tool" &&
      candidate.intent !== "workflow"
    ) {
      throw new Error(
        "Planner returned an invalid intent"
      );
    }

    if (
      !Array.isArray(candidate.steps)
    ) {
      throw new Error(
        "Planner response is missing steps"
      );
    }

    return {
      goal: candidate.goal,

      intent:
        candidate.intent,

      steps:
        candidate.steps.map(
          (step, index) => {
            if (
              typeof step !== "object" ||
              step === null
            ) {
              throw new Error(
                `Invalid planner step at index ${index}`
              );
            }

            const item =
              step as Record<string, unknown>;

            if (
              typeof item.action !== "string"
            ) {
              throw new Error(
                `Planner step ${index} is missing action`
              );
            }

            return {
              id:
                typeof item.id === "string"
                  ? item.id
                  : `step-${index + 1}`,

              action:
                item.action,

              ...(typeof item.tool === "string"
                ? {
                    tool: item.tool
                  }
                : {}),

              ...(item.input !== undefined
                ? {
                    input: item.input
                  }
                : {})
            };
          }
        )
    };
  }
}