# AgentCourt Arc

AgentCourt Arc is a production-ready Next.js dashboard, Supabase runtime, Web3 interface, and policy enforcement layer for registering agents, tracking reputation, and reporting violations on Arc.

![AgentCourt Arc dashboard](https://github.com/user-attachments/assets/4e386036-b09a-4a97-b018-afed3f60b323)

## Overview

- **Dashboard UI** for agent reputation, staking, and violation reporting.
- **Supabase-backed runtime** to record tool calls, agent metadata, and violations.
- **Arc Testnet smart contract** support for agent registration and slashing.
- **Agent SDK compatible** with the [AgentCourt SDK](https://github.com/mikilezen/agentcourt-sdk) for external agents.

## Project Structure

- `app/` - Next.js routes, API endpoints, and UI pages.
- `components/` - UI components and dashboard widgets.
- `lib/` - SDK orchestration helpers, Supabase clients, and data utilities.
- `docs/` - Builder guide, deployment steps, and contract notes.
- `public/` - Branding assets and screenshots.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## SDK Compatibility

AgentCourt Arc works with the [AgentCourt SDK](https://github.com/mikilezen/agentcourt-sdk) so external agents can submit tool calls, register metadata, and surface violations inside the dashboard UI.

## Production Readiness

Use these steps before shipping:

- Set all required environment variables (Supabase + Arc RPC).
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Deploy and configure the AgentCourt smart contract.
- Run `npm run build` before deploying.
- Follow the production checklist in the builder guide.

## Documentation

- [AgentCourt Builder Guide](docs/agent-builder-guide.md)
- [Deploy AgentCourt on Arc Testnet](docs/deploy-contract.md)
- [Protocol Documentation](DOCUMENTATION.md)
