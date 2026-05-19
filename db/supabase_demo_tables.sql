-- Supabase demo tables for AgentCourt demo flow
-- Run this in Supabase SQL editor or via psql using your connection string.

-- Enable pgcrypto for gen_random_uuid() if not already enabled
create extension if not exists pgcrypto;

-- State table: single-row state used by the demo API
create table if not exists public.agentcourt_demo_state (
  id text primary key,
  connected_wallet text,
  wallet_connected boolean default false,
  middleware_status text,
  middleware_reason text,
  last_contract_tx_hash text,
  last_action text,
  updated_at timestamptz default now()
);

-- Agents table: stores demo agents and balances
create table if not exists public.agentcourt_demo_agents (
  id text primary key,
  name text not null,
  owner text,
  reputation integer default 0,
  staked_usdc numeric(24,6) default 0,
  total_violations integer default 0,
  total_slashed numeric(24,6) default 0,
  status text,
  updated_at timestamptz default now()
);

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

-- Useful indexes
create index if not exists idx_agentcourt_demo_agents_reputation on public.agentcourt_demo_agents (reputation desc);
create index if not exists idx_agentcourt_demo_violations_created_at on public.agentcourt_demo_violations (created_at desc);
