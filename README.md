# Yesglance

Glanceable Polymarket odds for Even Realities G2. One market, one price, one paper tap.

**Track:** Crypto & DeFi  
**Hackathon:** [Heads Up — Even Realities](https://dorahacks.io/hackathon/even-realities/detail)  
**Built for:** a 576×288 monochrome glasses display. No wallet. No user funds.

## What it does

The lens shows the busiest open Polymarket contract: a two-line question, the YES price in cents, the one-day move, and 24h volume. NEXT cycles the board. YES or NO asks for one confirm. CONFIRM writes a paper fill at the live price ($5, $10, or $25). The book marks those fills against the next quote.

Reads use the public Gamma API. Nothing here can place a real order.

## Disclosure

This HUD prototype, including the paper book and the Gamma reader, existed before the hackathon build week (23–29 Nov 2026). Built 18 Nov 2026 as a design lock. Even Hub SDK wiring, simulator packaging, and the `.ehpk` are for build week. No secrets, no pre-existing private trading code.

## Data

`GET https://gamma-api.polymarket.com/markets?closed=false&active=true&order=volume24hr`

No API key. Prices between 2¢ and 98¢ only, so a tap cannot divide by a dead contract.

## Controls

| Control | Action |
| --- | --- |
| NEXT | Next market. Leaves a confirm. |
| YES / NO | Arm a paper buy of that side. |
| CONFIRM | Fill at the quoted price. |
| BACK | Drop the confirm. |
| Y / N / → / Enter / Esc | Same actions from a keyboard. |
