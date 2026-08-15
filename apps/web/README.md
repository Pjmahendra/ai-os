# AI-OS Web

The frontend for the AI-OS automation platform — chat with the AI planner, and manage automations, memory, and settings directly.

## Pages

- **Chat** (`/`) — talk to the AI-OS agent. Threaded by conversation, with history in the sidebar.
- **Automations** (`/automations`) — create/list/enable/disable/delete automations, run one on demand, view execution history.
- **Memory** (`/memory`) — save, search, edit, and forget long-term memories.
- **Settings** (`/settings`) — name and timezone (drives when scheduled automations actually run).

## Running locally

```bash
cp .env.example .env   # point VITE_API_URL at your running API
npm run dev             # from this directory, or `npx turbo run dev --filter=@ai-os/web` from the repo root
```

Requires the API (`apps/api`) running and reachable at `VITE_API_URL` (defaults to `http://localhost:3000`).

## Build

```bash
npm run build
```
