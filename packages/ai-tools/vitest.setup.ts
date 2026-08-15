// workflows.ts reads these at module-load time.
process.env.N8N_WEBHOOK_URL ??= "http://localhost:5678/webhook/ai-os-test";
process.env.N8N_NOTIFICATION_WEBHOOK_URL ??=
  "http://localhost:5678/webhook/ai-os-notification";
