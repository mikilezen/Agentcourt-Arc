# Documentation
Integration notes for protocol consumers, validators, and frontend builders.

## Table of Contents
- [Introduction](#introduction)
- [Smart Contract](#smart-contract)
- [API Reference](#api-reference)
- [Events](#events)
- [Frontend Guide](#frontend-guide)
- [FAQs](#faqs)

---

## Introduction
AgentCourt Arc tracks agent stake, reputation, violation reports, and slashing on Arc Testnet. Every value should map to a wallet address, transaction hash, or timestamp.

---

## Smart Contract
Registration starts with `approve(usdc, amount)`, then calls `registerAgent(amount, metadata)`.

### Quick Links
- **Smart Contract**: [View contract on Explorer](https://explorer-testnet.arc.network)
- **GitHub Repo**: [View source code](/)

---

## API Reference
The demo API exposes a single read/write surface for the UI.

- **GET `/api/demo-flow`**: Returns state, agents, and violations.
- **POST `/api/demo-flow`**: Accepts actions like `connect_wallet` and `register_metatrader`.

---

## Events
Listen for:
- `AgentRegistered`
- `ViolationReported`
- `StakeSlashed`

---

## Frontend Guide
Keep the table and badge components unchanged; only swap the data source.

- Use `lib/demo-data.ts` for agents and violations.
- Persist content copy in `agentcourt_demo_content`.

---

## FAQs
- **Are scores visible?** Yes, scores are visible.
- **What currency is stake denominated in?** Stake is denominated in USDC.
- **What happens when an agent is slashed?** Slashes redirect to an Arc explorer transaction.
