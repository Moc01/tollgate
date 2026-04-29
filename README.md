# Tollgate

> *The vending machine for AI agents.*
> *AI 智能体的自动售货机。*

**Tollgate** is a Solana-native HTTP 402 protocol that lets any API charge AI agents per call in USDC stablecoins, with one line of code.

**Tollgate** 是一个 Solana 原生的 HTTP 402 协议——任何 API 都能用一行代码向 AI 智能体按次收费（USDC 稳定币结算）。

---

## 🎯 What We're Building / 我们在做什么

A submission for [Solana Frontier Hackathon 2026](https://colosseum.com/frontier) (April 6 – May 11, 2026).

参赛项目：[Solana Frontier Hackathon 2026](https://colosseum.com/frontier)（2026 年 4 月 6 日 – 5 月 11 日）

### The Problem / 问题

Stripe doesn't fit AI agents — they have no SSN, no credit card, no Plaid account. The agentic web needs a payment layer where machines can pay machines, in micro-amounts, instantly, globally, without human intervention.

Stripe 不适合 AI 智能体——它们没有身份证、没有信用卡、没有银行账户。智能体网络需要一个支付层：让机器能付钱给机器，金额可以小到 $0.001，秒级到账，全球无国界，无需人类介入。

### The Solution / 解决方案

Tollgate is HTTP 402 done right for AI:

- **One line of code** to add a paywall to any HTTP API
- **One npm package** for AI agents to auto-pay 402 responses
- **USDC on Solana** for sub-cent fees and 400ms settlement
- **On-chain revenue splits** — multi-contributor APIs auto-split earnings

Tollgate 是为 AI 量身打造的 HTTP 402：

- **一行代码**给任何 HTTP API 加付费墙
- **一个 npm 包**让 AI 智能体自动处理 402 响应
- **Solana 上的 USDC**——亚分手续费、400 毫秒结算
- **链上自动分账**——多人维护的 API 可按比例自动分钱

---

## 📦 Packages / 包结构

This is a **pnpm monorepo**. / 这是一个 **pnpm monorepo**。

```
tollgate/
├── packages/
│   ├── middleware/      @tollgate/middleware  — API-side paywall
│   ├── agent/           @tollgate/agent       — Client-side auto-pay SDK
│   └── shared/          @tollgate/shared      — Shared types & utils
├── apps/
│   ├── settlement/      Settlement service (Vercel Edge)
│   ├── dashboard/       API provider dashboard (Next.js)
│   └── curio/           Demo app — AI search agent that pays per source
├── examples/
│   ├── news-api/        Mock news API with paywall
│   ├── github-search/   Mock GitHub search with paywall
│   ├── wiki-api/        Mock Wikipedia with paywall
│   ├── arxiv-api/       Mock ArXiv with paywall
│   └── solana-docs-api/ Mock Solana docs with paywall
├── scripts/             Setup & deployment scripts
└── docs/                Architecture, specs, and plans
    └── zh/              中文文档
```

---

## 🚀 Quick Start / 快速开始

```bash
# Clone / 克隆
git clone git@github.com:Moc01/tollgate.git
cd tollgate

# Install / 安装
pnpm install

# Set up env / 设置环境变量
cp .env.example .env.local
# Fill in keys for: ANTHROPIC, PRIVY, HELIUS

# Run dev / 启动开发
pnpm dev
```

Detailed setup: see [docs/SETUP.md](./docs/SETUP.md) / 详细配置：见 [docs/zh/配置指南.md](./docs/zh/配置指南.md)

---

## 📚 Documentation / 文档

### English

- [Product Vision](./docs/PRODUCT_VISION.md) — Why we exist
- [Architecture](./docs/ARCHITECTURE.md) — System design
- [Protocol Spec](./docs/PROTOCOL_SPEC.md) — Tollgate-402 protocol
- [Tech Stack](./docs/TECH_STACK.md) — Why these tools
- [Data Model](./docs/DATA_MODEL.md) — Schemas
- [Project Plan](./docs/PROJECT_PLAN.md) — 11-day execution
- [Security](./docs/SECURITY.md) — Threat model
- [Pitch Strategy](./docs/PITCH_STRATEGY.md) — How we win

### 中文

- [产品愿景](./docs/zh/产品愿景.md)
- [系统架构](./docs/zh/系统架构.md)
- [协议规范](./docs/zh/协议规范.md)
- [技术选型](./docs/zh/技术选型.md)
- [数据模型](./docs/zh/数据模型.md)
- [开发计划](./docs/zh/开发计划.md)
- [安全模型](./docs/zh/安全模型.md)
- [Pitch 策略](./docs/zh/Pitch策略.md)

---

## 🎬 Demo / 演示

**Curio** — *Ask anything. Watch your AI pay per source, in real time.*

Curio is a Perplexity-like search agent built on Tollgate. Every source it queries is a paid API. Every answer comes with a transparent cost breakdown — settled on Solana, auditable on-chain.

**Curio** 是一个建立在 Tollgate 之上的搜索智能体（类似 Perplexity）。它查询的每个数据源都是付费 API，每次回答都附带透明的成本明细——在 Solana 上结算，链上可审计。

Live demo: TBD / 在线演示：待部署

---

## 📜 License / 许可证

MIT (see [LICENSE](./LICENSE))

---

## 🏆 Hackathon / 黑客松

Built for **Solana Frontier Hackathon** organized by [Colosseum](https://colosseum.com).

为 [Colosseum](https://colosseum.com) 主办的 **Solana Frontier Hackathon** 而生。

Submission deadline: **2026-05-11** / 提交截止：**2026-05-11**

— Built by [@Moc01](https://github.com/Moc01)
