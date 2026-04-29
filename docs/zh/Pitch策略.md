# Pitch 策略

如何赢 Frontier Hackathon。

## 评委

评判团包括生态领袖。Frontier 推广里确认的名字：

- Anatoly Yakovenko（Solana 联合创始人）
- Lily Liu（Solana 基金会主席）
- Phantom 团队
- Arcium 团队
- Metaplex 团队
- Superteam 各地区负责人

含义：
- 他们都是技术创始人。他们想看到*工程深度*和*真实分销意图*，不是消费 flash
- 他们都做过 infra。Tollgate 的"HTTP 的 404 页面终于被修好了"叙事打中他们
- 他们会在 pitch video 上花 30-60 秒，决定要不要深入研究

## 30 秒钩子

pitch video 用这段开场：

```
[0:00] 显示终端：
       $ npm install @tollgate/middleware
       $ # 一行代码加到 Next.js API
       $ git push

[0:08] 切到 Claude tool-use trace：
       Agent: Searching paid sources...
              ✓ NewsAPI       paid $0.002 USDC
              ✓ ArXiv         paid $0.003 USDC  
              ✓ Wikipedia     paid $0.0005 USDC
              ✓ Solana Docs   paid $0.0005 USDC

[0:18] 最终答案带成本明细，
       Solana Explorer 链接，看得到真实链上 tx

[0:25] 切到创始人脸：
       "We just made HTTP 402 work, on Solana, for AI agents.
        It took 30 lines of code per side. Here's why this is
        the next billion-dollar API economy."

[0:30] Logo: Tollgate
```

钩子击中评委的先验知识：HTTP 402 是每个开发者都知道存在但从来没用过的"段子"状态码。修好它*又好笑又必然*。Solana 是显然的链选择，因为手续费。

## 3 分钟 pitch video

节拍表：

| 时间 | 节拍 | 视觉 |
|---|---|---|
| 0:00 – 0:30 | 30 秒钩子（如上） | 终端 → trace → 答案 |
| 0:30 – 1:00 | 问题：AI agent 没法付钱给 API | 白板风格说明 |
| 1:00 – 1:45 | 解决方案：实时 Curio demo | 屏幕录制，干净流畅 |
| 1:45 – 2:15 | 为什么是 Solana（5 个特性的 slide） | 动画 slide |
| 2:15 – 2:45 | 商业模式 + 早期 traction | 图表：真实调用在发生 |
| 2:45 – 3:00 | Ask + 团队 + 收尾 | 创始人脸 |

## 要避免的常见错误

往届 Colosseum 评论（[来自 workshop 博客](https://blog.colosseum.com/perfecting-your-hackathon-submission/)）：

- ❌ 超过 3 分钟
- ❌ 流行词（"revolutionary blockchain AI"）而不是具体内容
- ❌ 模糊描述
- ❌ 没有团队 slide
- ❌ 忘了给评委授权访问 GitHub repo / Loom

我们提前对应：
- 严格 3:00 计时
- 到处都是数字（$0.001、400ms、5 个源等）
- 前 10 秒就能看到具体代码
- 接近结尾的 30 秒团队 slide
- Repo 公开；视频是未列出的 YouTube + 公开 Loom

## 要钉死的差异化点

这些是我们想让评委对同事重复的原话：

1. *"They built Stripe for AI agents."*
2. *"One line of code. That's the whole integration."*
3. *"Programmable splits — multiple maintainers can monetize one API atomically."*
4. *"Native HTTP. Not a new protocol layer."*
5. *"They shipped the demo as a real product. Curio is on the App Store, basically."*

## 与往届获奖的差异化

| 往届获奖 | 他们的角度 | 我们的角度 |
|---|---|---|
| Latinum（Breakout AI 第 1） | MCP 专属支付中间件 | 通用 HTTP、AI tool 包装器、splits、dashboard |
| MCPay（Cypherpunk 稳定币） | MCP 专属支付基础设施 | 同上 |
| Vanish（Breakout DeFi 第 1） | Solana 上的隐私 | 不同类目；互补 |

我们不需要攻击它们。我们定位是：*"专业化没问题；我们做了通用层，因为最终每个 API 都需要它，不只是 MCP。"*

## Technical Demo Video（2-3 分钟）

与 pitch 不同。technical demo 回答：*这是怎么搭的？*

结构：

| 时间 | 内容 |
|---|---|
| 0:00 – 0:30 | Repo 巡视：monorepo 布局、packages、apps、examples |
| 0:30 – 1:00 | 代码 walkthrough：middleware 的 10 行核心、agent 的 402 → pay → retry loop |
| 1:00 – 1:45 | 现场集成：开一个全新 Hono 服务、npm install、加中间件、部署、agent 调用 |
| 1:45 – 2:30 | 用系统图讲架构，重点说基于 JWT 的链下验证 |
| 2:30 – 3:00 | 后续路线：签名 402 body、Confidential SPL Token、MoonPay 提现 |

## 创始人故事

我们没有 founder-market 故事（用户是 Web2 dev，无创作者背景）。所以我们不假装。改成讲：

> *"我是个 Web2 开发者。第一次给 AI agent 一个 OpenAI API key 让它代表我行动时，我意识到不对劲：我的 agent 的支出限制就是我的限制。它没办法在我不亲手帮它的情况下发现和使用新 API。我看了 HTTP 402，看了 Solana，答案显而易见。"*

诚实、技术、刚好打中 builder 评委。

## Build-in-Public 计划

11 条每日推文，从 `@tollgate_dev` 或用户已有 handle 发。

模板：

```
Day N/11 of building Tollgate at #SolanaFrontier.

Today: <一行进展>

[gif 或截图]

GitHub → github.com/Moc01/tollgate
```

目标：
- 提交时累计 100+ followers
- 1 条生态转推（目标：Anatoly、Helius、Phantom、Privy 任一）
- 向加速器审查证明动能

## 侧赛道提交

主提交后立刻提交可申请的 Superteam Earn 侧赛道：

- Privy bounty（如有）
- Helius bounty
- Phantom 集成
- 地区侧赛道（用户符合资格的）
- 公共物品奖（Tollgate 是 MIT 开源——符合）

每个侧赛道 $1K-$10K。叠加是现实的。

## 我们不会说的

- "Disrupt traditional payments" — 没意义
- "Web3 native" — 每个项目都说
- "10× better than [X]" — 让评委自己得出
- "AI revolution" — 流行词
- 任何 memecoin、JEET 等引用

## 后续

赢或不赢，继续建。Tollgate 是真正的基础设施——即使没赢，npm 包也可以发布。加速器面试会问，*"你会全职做吗？"* 答案必须是 yes，证据是黑客松后继续 ship 迭代。
