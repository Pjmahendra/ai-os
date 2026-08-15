
export interface AutomationWorkflow {
  readonly key: string;
  readonly description: string;
  readonly webhookUrl: string;
}
export const automationWorkflows: readonly AutomationWorkflow[] = [
  {
    key: "ai-os-test",
    description:
      "Test AI-OS automation workflow.",
    webhookUrl:
      process.env.N8N_WEBHOOK_URL ?? ""
  },
  {
    key: "ai-os-notification",
    description:
      "Sends a notification through the AI-OS notification automation.",
    webhookUrl:
      process.env.N8N_NOTIFICATION_WEBHOOK_URL ?? ""
  }
];
export function getAutomationDescriptions(): string {
  return automationWorkflows
    .map(
      (workflow) =>
        `- ${workflow.key}: ${workflow.description}`
    )
    .join("\n");
}