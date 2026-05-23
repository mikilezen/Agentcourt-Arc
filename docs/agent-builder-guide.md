# AgentCourt Builder Guide

This guide is for agent builders who want to connect an autonomous agent to AgentCourt, use Supabase for demo/runtime state, and connect Web3 settlement or violation reporting on Arc.

## 1. Local Setup

```bash
cd AgentCourt-Arc
npm install
npm run dev
```

Open `http://localhost:3000`.

Use `npm.cmd run dev` on Windows PowerShell if `npm run dev` is blocked by execution policy.

## 2. Environment

Create or update `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

NEXT_PUBLIC_AGENT_COURT_ADDRESS=0xYourDeployedAgentCourtContract
NEXT_PUBLIC_ARC_TESTNET_RPC_URL=https://rpc.testnet.arc-node.thecanteenapp.com/v1/your-canteen-key
NEXT_PUBLIC_ARC_TESTNET_EXPLORER_URL=https://testnet.arcscan.app
```

Use the service role key only on the server. Do not expose it to client components.

For the Canteen RPC key:

```bash
uv tool install git+https://github.com/the-canteen-dev/ARC-cli.git
arc-canteen login
arc-canteen rpc-url
```

Paste the printed URL into `NEXT_PUBLIC_ARC_TESTNET_RPC_URL`.

## 3. Supabase Tables

The demo API expects three tables:

```sql
create table if not exists agentcourt_demo_state (
  id text primary key,
  connected_wallet text,
  wallet_connected boolean default false,
  middleware_status text,
  middleware_reason text,
  last_contract_tx_hash text,
  last_action text,
  updated_at timestamptz default now()
);

create table if not exists agentcourt_demo_agents (
  id text primary key,
  name text not null,
  owner text not null,
  category text,
  description text,
  policy text,
  reputation numeric default 100,
  staked_usdc numeric default 0,
  total_violations integer default 0,
  total_slashed numeric default 0,
  status text default 'active',
  updated_at timestamptz default now()
);

create table if not exists agentcourt_demo_violations (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  agent_name text not null,
  agent_owner text not null,
  reason text not null,
  severity text not null,
  slash_amount numeric default 0,
  tx_hash text not null,
  created_at timestamptz default now()
);
```

## 4. How An Agent Connects

AgentCourt uses `lib/agentcourt-orchestration-sdk.ts` as the agent connection layer.

```ts
import {
  AgentCourtOrchestrator,
  createVerifiedAgent,
} from "@/lib/agentcourt-orchestration-sdk";

const agent = createVerifiedAgent({
  id: "market-agent-01",
  name: "Market Agent",
  owner: "0xYourWallet",
  strategy: "Arc USDC market settlement with policy checks",
});

const court = new AgentCourtOrchestrator();

const result = await court.callTool(
  agent,
  "arc.transfer_usdc",
  {
    to: "0xArcMarketMaker",
    amountUsd: 1250,
    memo: "autonomous rebalance",
  },
  async () => {
    return executeArcTransfer();
  }
);

if (result.event.decision === "ALLOW") {
  console.log("Tool executed");
}

if (result.event.decision === "HUMAN_IN_THE_LOOP") {
  console.log("Operator approval required");
}

if (result.event.decision === "STOP_TOOL") {
  console.log("Blocked:", result.event.reason);
}
```

The SDK returns an evidence hash for every decision. Store that hash in Supabase and, when using the contract, submit it with violation reporting.

### Gateway endpoint for external agents

If you are running an agent outside the dashboard (for example, `demo-ts-project` with the AgentCourt SDK), point the SDK gateway to the Arc dashboard so tool calls show up in the Supabase-backed UI:

```ts
import { AgoraAgentClient, createVerifiedAgent } from "agentcourt";

const client = new AgoraAgentClient({
  endpoint: "http://localhost:3000", // Arc dashboard
  agent: createVerifiedAgent({
    id: "market-agent-01",
    name: "Market Agent",
    ownerAddress: "0xYourWallet",
    strategy: "Arc USDC market settlement with policy checks",
  }),
});
```

The dashboard accepts POST requests at `/api/tool-call` and will upsert the agent, record violations, and update the demo flow state.

For production deployments, use the [AgentCourt SDK](https://github.com/mikilezen/agentcourt-sdk) to connect external agents to the dashboard and keep your runtime policy checks consistent across environments.

## 5. Real Agent Flow

1. Agent signs in or presents a verified passport.
2. Agent calls `court.callTool(...)` before every risky action.
3. AgentCourt policy checks the tool name, amount, daily budget, identity, and sensitive data.
4. Allowed calls execute.
5. Blocked calls become Supabase violation rows.
6. Web3 mode can call the AgentCourt contract to register agents or report violations on Arc.

## 6. Web3 And MetaMask

The app uses wagmi with the injected wallet connector. If MetaMask says `Failed to connect to MetaMask`:

- Unlock MetaMask.
- Refresh the page.
- Make sure only one wallet extension is trying to inject `window.ethereum`.
- Switch MetaMask to Arc Testnet if the wallet asks for network confirmation.
- Check `NEXT_PUBLIC_ARC_TESTNET_RPC_URL`.
- Try disconnecting the site from MetaMask settings, then connect again.

The dashboard can still run the Supabase simulator when a contract address is not configured.

## 7. Deploy

1. Push the repo to GitHub.
2. Deploy `AgentCourt-Arc` to Vercel.
3. Add the `.env` values in Vercel project settings.
4. Run the Supabase SQL above.
5. Deploy the AgentCourt contract on Arc Testnet.
6. Set `NEXT_PUBLIC_AGENT_COURT_ADDRESS`.
7. Run `npm run build` before shipping.

Contract deployment commands live in `docs/deploy-contract.md`.

## 8. Production Checklist

- Replace demo passport issuance with signed JWTs or wallet signatures.
- Persist every tool-call decision, not just final blocked outcomes.
- Replace demo Arc transfer execution with Circle/Arc App Kit calls.
- Add operator approval UI for `HUMAN_IN_THE_LOOP`.
- Add rate limits to `/api/demo-flow`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
