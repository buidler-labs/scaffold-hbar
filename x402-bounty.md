# Build the Internet's Payment Layer: Micropayments with x402 on Hedera

x402 turns the `402 Payment Required` status code into a working payment standard for autonomous commerce. Build on it with Hedera rails for a chance at one of **five $1,000 prizes**.

The bounty runs **Monday, July 13 to Sunday, July 19**. Submissions close at **11:59 PM ET on July 19**.

**[Submit your build →](https://forms.gle/Ff7UPLc5ZKZ4VC5P8)**

> Get build support on Discord → https://hedera.com/discord

## What you're building

x402 is an open-source payment standard built on the `402 Payment Required` status code. It lets software pay software directly, with stablecoins, so autonomous agents and machine-to-machine systems can transact without a human in the loop.

Stablecoins are tokens pegged to a real-world currency that live on a blockchain like Hedera. On Hedera they settle in seconds at a fixed fee of $0.001 per transfer. That fixed, predictable cost is what makes per-use payments viable: real-time data, pay-per-call APIs, and agent-to-agent commerce, where high fees, slow settlement, and chargeback risk rule out traditional rails.

Build a payment solution on the x402 standard using Hedera rails. The two reference architectures below are starting points, not requirements.

## What you'll need to get started

Build on Hedera testnet. Payments can settle in HBAR or USDC, whichever suits your design. HBAR transfers cost $0.0001 each and stablecoin transfers $0.001, both fixed and predictable, so per-use pricing stays viable down to fractions of a cent.

### Reference architecture 1: an agent that pays per query

An AI agent manages a portfolio and buys live market data per call as it needs it, paying for each query through x402 and settling on Hedera. Per-use access replaces a flat annual data subscription, so the agent only pays for what it actually reads.

Start from this reference repo: https://github.com/matevszm/x402-hedera-example

### Reference architecture 2: a pay-to-read data marketplace

A platform where a publisher uploads files to S3 and sets a read price. Consumers pay through x402 to unlock each file, and every read settles on Hedera as its own micropayment. No accounts, no invoices, no minimum spend.

Start from this reference repo: https://github.com/hedera-dev/scaffold-hbar/tree/templates/x402-pay-per-use

## How to enter

1. Build your solution on the x402 standard using Hedera rails, in a public open-source GitHub repo.
2. Make real on-chain transactions on Hedera testnet and keep the HashScan links.
3. Record a demo under five minutes showing the end-to-end flow, focused on the tech and the on-chain payments.
4. [Submit through the form](https://forms.gle/Ff7UPLc5ZKZ4VC5P8) before 11:59 PM ET on July 19.

## What counts as a valid submission

- A public, open-source GitHub repo.
- A demo video under five minutes showing the full end-to-end flow and the on-chain transactions.
- HashScan links to the relevant transactions.
- The completed submission form.

## Prizes and timeline

Five prizes of $1,000, one for each of the top five submissions. The bounty runs Monday, July 13 to Sunday, July 19. Submissions close at 11:59 PM ET on July 19.

## Need help while you build

Hedera's Discord has developers and support to unblock you on x402, stablecoins, and the network. Drop in while you build.

Join the Discord → https://hedera.com/discord

## FAQ

**Who can enter?** Anyone, online. Catching the bounty at WeAreDevelopers in Berlin is optional, everything runs online.

**Do teams work?** Yes, team size is flexible. Each prize is paid to one nominated payer per team, who handles the split.

**Do you have to sign up first?** No. Everything needed is captured in the submission form, so you can submit without any prior sign-up.

**How are winners chosen?** The top five submissions win, judged on a working end-to-end flow, real on-chain payments through x402, and how well the build uses Hedera rails.

---

The x402 standard is open and the rails are live. Build a payment solution, show it working on-chain, and submit before the July 19 deadline.

**[Submit your build →](https://forms.gle/Ff7UPLc5ZKZ4VC5P8)**
