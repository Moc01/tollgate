# Submission Checklist

Final checks before clicking "Submit" on colosseum.com.

## 24 hours before deadline

### Code

- [ ] All packages build clean (`pnpm -r build`)
- [ ] All tests pass (`pnpm -r test`)
- [ ] No secrets in repo (`git log -p | grep -i 'api[_-]key\|secret\|private'` returns nothing surprising)
- [ ] `.env.local` is in `.gitignore` and not committed
- [ ] CI on GitHub Actions is green for the latest commit
- [ ] README has live URLs and "Try Curio" link
- [ ] License is MIT and in repo root
- [ ] Contributors graph shows Moc01 (verified earlier in development)

### Deployment

- [ ] `apps/settlement` deployed at known URL
- [ ] `apps/examples` deployed at known URL
- [ ] `apps/curio` deployed at known URL
- [ ] All Vercel projects connected to the GitHub repo (auto-deploy on push)
- [ ] Custom domain or stable Vercel preview URL noted in README
- [ ] Helius webhook configured to point at settlement deployment
- [ ] Solana devnet wallet funded with USDC for Curio demo
- [ ] End-to-end smoke test on the live deployment

### Pitch materials

- [ ] Pitch video recorded, ≤3:00, uploaded to unlisted YouTube + public Loom
- [ ] Technical demo video recorded, 2:30-ish, uploaded
- [ ] Both videos have captions
- [ ] Pitch deck PDF (5 slides) prepared as backup

### Side tracks

- [ ] Privy bounty submission (if applicable)
- [ ] Helius bounty submission
- [ ] Phantom integration submission (if applicable)
- [ ] Geographic side track (Superteam UAE / China / etc.)
- [ ] Public goods award submission (Tollgate is open-source)

## At submission time

### Colosseum form fields

- [ ] **Project name**: Tollgate
- [ ] **Tagline**: The vending machine for AI agents
- [ ] **Description**: First 150 chars must hook — see drafts in `docs/PITCH_STRATEGY.md`
- [ ] **GitHub repo**: https://github.com/Moc01/tollgate
- [ ] **Pitch video URL**: (Loom or YouTube unlisted)
- [ ] **Technical demo URL**: (Loom or YouTube unlisted)
- [ ] **Live demo URL**: https://curio.tollgate.dev (or Vercel default)
- [ ] **Team members**: Moc01 (solo) or co-founder list
- [ ] **Country**: User's country
- [ ] **Solana integration**: Cite the 5 Solana primitives we depend on
- [ ] **Business model**: 5-10% platform fee on settled volume
- [ ] **Why now**: Agentic web 2026 megatrend; HTTP 402 finally has a use case
- [ ] **Permissions**: Grant judges access to all linked Loom/YouTube videos and GitHub repo
- [ ] **Photo / logo**: Upload Tollgate logo SVG/PNG
- [ ] **Twitter/X handle**: @tollgate_dev (if created)

### After clicking Submit

- [ ] Confirmation email received
- [ ] Submit to applicable Superteam Earn side tracks immediately
- [ ] Tweet "submitted!" with thread of build journey
- [ ] Notify any pre-existing community / Telegram of submission
- [ ] Continue posting on Twitter through judging period (judges look for momentum)

## Post-submission first 48 hours

- [ ] Reach out to potential beta users for the live npm packages
- [ ] Publish protocol spec on Hacker News / Lobsters
- [ ] Schedule 1:1 demos with anyone who responds
- [ ] Continue iterating; the accelerator interview will ask about progress

## Things to NOT do

- ❌ Force-push to main during judging period
- ❌ Take down the live demo (judges may revisit)
- ❌ Argue with judges in public if results are not what you hoped
- ❌ Promise features to judges in interviews that you can't ship
- ❌ Compare unfavorably to other Colosseum winners
