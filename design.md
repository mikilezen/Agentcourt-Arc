# AgentCourt Arc - Design Document

This design document outlines the interface and functional architecture for **AgentCourt Arc**, an on-chain reputation and security layer for autonomous AI agents.

---

## 1. Project Vision: Agent Reputation
**AgentCourt Arc** is designed as a trustless system where agents stake collateral (USDC) to establish a reputation. The system emphasizes **runtime enforcement**—monitoring what an agent actually does—over simple content filtering. 

### Core Value Proposition
*   **On-chain Accountability:** All agent reputations and violations are recorded on the Arc Testnet.
*   **Economic Security:** Agents must stake USDC to participate; misbehavior leads to "slashing" of their stake.
*   **Transparent Governance:** A public ledger of violations ensures that developers can vet agents before delegation.

---

## 2. Interface Analysis: Dashboard
The primary dashboard utilizes a high-contrast dark theme with a purple and blue neon aesthetic to signify a modern, "cyber-secure" environment.

### Key Metrics and Modules
*   **Network Stats:** Tracks Total Agents (156), Total Staked (15,230 USDC), Violations Reported (342), and Total Slashed (2,816 USDC).
*   **Top Agents:** A ranking of the most reliable agents based on their Reputation Score (e.g., MetaTrader AI at 98/100) and total staked amount.
*   **Recent Violations:** A real-time feed of security breaches, such as:
    *   Attempted exfiltration of private keys.
    *   Unauthorized data access.
    *   Attempted prompt injections.

---

## 3. User Flow and Navigation
The complete application structure showcases eight distinct views:

| View | Purpose | Key Element |
| :--- | :--- | :--- |
| **1. Dashboard** | High-level network health. | Summary tiles and Top/Recent lists. |
| **2. Agents** | Directory of all registered agents. | Status indicators (Active, At Risk, Slashed). |
| **3. Register Agent** | Onboarding for agent developers. | A 3-step process: Stake USDC, Earn Reputation, Maintain Trust. |
| **4. Agent Details** | Deep-dive into a specific agent profile. | Detailed metadata and transaction history. |
| **5. Violations** | Full audit log of network infractions. | Severity filters (High, Medium, Low). |
| **6. Leaderboards** | Competitive ranking of agents. | **Trust Score Formula** based on Reputation, Stability, Stake, and History. |
| **7. About** | Platform mission and mechanics. | Visuals explaining decentralized reputation. |
| **8. Docs** | Technical integration guides. | API reference and smart contract links. |

---

## 4. Technical Specifications
The system is built to support a developer-centric workflow, optimized for integrating robust policy-as-code frameworks into complex machine learning pipelines.

*   **Network:** Arc Testnet (Altar).
*   **Chain ID:** 11155422.
*   **Security Focus:** Direct runtime enforcement integration, ensuring that agent actions are governed by strict, verifiable rules before execution.
*   **Recommended Stack Context:** Interfaces effectively with environments using Python, Next.js, and TypeScript.