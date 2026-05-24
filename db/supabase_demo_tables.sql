-- Supabase tables for AgentCourt Arc
-- Run this in Supabase SQL editor or via psql using your connection string.

-- Enable pgcrypto for gen_random_uuid() if not already enabled
create extension if not exists pgcrypto;

-- State table: per-wallet session state (replaces global singleton)
create table if not exists public.agentcourt_demo_state (
  id text primary key,
  wallet_address text unique,
  connected_wallet text,
  wallet_connected boolean default false,
  middleware_status text,
  middleware_reason text,
  last_contract_tx_hash text,
  last_action text,
  updated_at timestamptz default now()
);

-- Add wallet_address column if upgrading from old schema
alter table public.agentcourt_demo_state add column if not exists wallet_address text;

-- Enable RLS and add policies for the state table
alter table public.agentcourt_demo_state enable row level security;
-- Drop old wide-open policies
drop policy if exists demo_state_select_all on public.agentcourt_demo_state;
drop policy if exists demo_state_service_modify on public.agentcourt_demo_state;
drop policy if exists demo_state_modify_all on public.agentcourt_demo_state;
-- New policies: read own state, write via service role only
create policy demo_state_select_own on public.agentcourt_demo_state
  for select using (true);
create policy demo_state_insert_service on public.agentcourt_demo_state
  for insert with check (false); -- only service role bypasses RLS
create policy demo_state_update_service on public.agentcourt_demo_state
  for update using (false);
create policy demo_state_delete_service on public.agentcourt_demo_state
  for delete using (false);

-- Agents table: stores agents and balances
create table if not exists public.agentcourt_demo_agents (
  id text primary key,
  name text not null,
  owner text,
  category text,
  description text,
  policy text,
  reputation integer default 0,
  staked_usdc numeric(24,6) default 0,
  total_violations integer default 0,
  total_slashed numeric(24,6) default 0,
  status text,
  updated_at timestamptz default now()
);

alter table public.agentcourt_demo_agents add column if not exists category text;
alter table public.agentcourt_demo_agents add column if not exists description text;
alter table public.agentcourt_demo_agents add column if not exists policy text;

-- Enable RLS and add policies for agents
alter table public.agentcourt_demo_agents enable row level security;
-- Drop old wide-open policies
drop policy if exists demo_agents_select_all on public.agentcourt_demo_agents;
drop policy if exists demo_agents_service_modify on public.agentcourt_demo_agents;
drop policy if exists demo_agents_modify_all on public.agentcourt_demo_agents;
-- New policies: public reads (transparency), writes via service role only
create policy demo_agents_select_all on public.agentcourt_demo_agents
  for select using (true);
create policy demo_agents_insert_service on public.agentcourt_demo_agents
  for insert with check (false); -- only service role bypasses RLS
create policy demo_agents_update_owner on public.agentcourt_demo_agents
  for update using (false); -- only service role bypasses RLS
create policy demo_agents_delete_service on public.agentcourt_demo_agents
  for delete using (false);

-- Violations table: records individual violations
create table if not exists public.agentcourt_demo_violations (
  id uuid primary key default gen_random_uuid(),
  agent_id text references public.agentcourt_demo_agents(id) on delete cascade,
  agent_name text,
  agent_owner text,
  reason text,
  severity text,
  slash_amount numeric(24,6) default 0,
  tx_hash text,
  created_at timestamptz default now()
);

-- Enable RLS and add policies for violations
alter table public.agentcourt_demo_violations enable row level security;
-- Drop old wide-open policies
drop policy if exists demo_violations_select_all on public.agentcourt_demo_violations;
drop policy if exists demo_violations_service_modify on public.agentcourt_demo_violations;
drop policy if exists demo_violations_modify_all on public.agentcourt_demo_violations;
-- New policies: public reads, writes via service role only
create policy demo_violations_select_all on public.agentcourt_demo_violations
  for select using (true);
create policy demo_violations_insert_service on public.agentcourt_demo_violations
  for insert with check (false); -- only service role bypasses RLS
create policy demo_violations_update_service on public.agentcourt_demo_violations
  for update using (false);
create policy demo_violations_delete_service on public.agentcourt_demo_violations
  for delete using (false);

-- Useful indexes
create index if not exists idx_agentcourt_demo_agents_reputation on public.agentcourt_demo_agents (reputation desc);
create index if not exists idx_agentcourt_demo_violations_created_at on public.agentcourt_demo_violations (created_at desc);
-- Index foreign key for faster joins and to address unindexed foreign key warning
create index if not exists idx_agentcourt_demo_violations_agent_id on public.agentcourt_demo_violations (agent_id);

-- Content table: stores copy for static pages like Register and Docs
create table if not exists public.agentcourt_demo_content (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table public.agentcourt_demo_content enable row level security;
-- Drop old wide-open policies
drop policy if exists demo_content_select_all on public.agentcourt_demo_content;
drop policy if exists demo_content_modify_all on public.agentcourt_demo_content;
-- New policies: public reads, writes via service role only
create policy demo_content_select_all on public.agentcourt_demo_content
  for select using (true);
create policy demo_content_insert_service on public.agentcourt_demo_content
  for insert with check (false);
create policy demo_content_update_service on public.agentcourt_demo_content
  for update using (false);
create policy demo_content_delete_service on public.agentcourt_demo_content
  for delete using (false);

insert into public.agentcourt_demo_content (key, data)
values
  (
    'register_page',
    '{"title":"Register Your Agent","subtitle":"Stake USDC to activate onchain reputation for an autonomous agent.","steps":[{"title":"Stake USDC","description":"Lock collateral as a bond against agent behavior."},{"title":"Earn Reputation","description":"Build score through verified safe execution."},{"title":"Maintain Trust","description":"Violations slash stake and lower reputation."}],"form":{"defaultStake":100,"minimumStake":10,"stakeLabel":"Stake Amount","stakeUnit":"USDC","approveLabel":"Approve USDC","registerLabel":"Register Agent"}}'::jsonb
  ),
  (
    'docs_page',
    '{"title":"Documentation","subtitle":"Integration notes for protocol consumers, validators, and frontend builders.","sections":[{"id":"introduction","title":"Introduction","body":"AgentCourt Arc tracks agent stake, reputation, violation reports, and slashing on Arc Testnet. Every value should map to a wallet address, transaction hash, or timestamp."},{"id":"smart-contract","title":"Smart Contract","parts":[{"type":"text","value":"Registration starts with "},{"type":"code","value":"approve(usdc, amount)"},{"type":"text","value":", then calls "},{"type":"code","value":"registerAgent(amount, metadata)"},{"type":"text","value":"."}]},{"id":"api-reference","title":"API Reference","body":"The demo API exposes a single read/write surface for the UI.","bullets":["GET /api/demo-flow returns state, agents, and violations.","POST /api/demo-flow accepts actions like connect_wallet and register_metatrader."]},{"id":"events","title":"Events","parts":[{"type":"text","value":"Listen for "},{"type":"code","value":"AgentRegistered"},{"type":"text","value":", "},{"type":"code","value":"ViolationReported"},{"type":"text","value":", and "},{"type":"code","value":"StakeSlashed"},{"type":"text","value":"."}]},{"id":"frontend-guide","title":"Frontend Guide","body":"Keep the table and badge components unchanged; only swap the data source.","bullets":["Use lib/demo-data.ts for agents and violations.","Persist content copy in agentcourt_demo_content."]},{"id":"faqs","title":"FAQs","body":"Scores are visible, stake is denominated in USDC, and slashes redirect to an Arc explorer transaction."}],"quickLinks":[{"title":"Smart Contract","label":"View contract on Explorer","href":"http://testnet.arcscan.app/","icon":"ExternalLink"},{"title":"GitHub Repo","label":"View source code","href":"https://github.com/mikilezen/agentcourt-arc","icon":"Code2"}]}'::jsonb
  )
on conflict (key) do update
  set data = excluded.data,
      updated_at = now();
