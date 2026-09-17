import { site } from "./site";

export type DocSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  formula?: string;
};

export type Doc = {
  slug: string;
  title: string;
  category: DocCategory;
  description: string;
  minutes: number;
  sections: DocSection[];
  sources?: Array<{ title: string; url: string }>;
};

export const docCategories = ["Get started", "Liquidity", "Rewards", "Protocol", "Reference"] as const;
export type DocCategory = (typeof docCategories)[number];

const N = site.name;
const T = site.ticker;

export const docs: Doc[] = [
  {
    slug: "introduction",
    title: `Welcome to ${N}`,
    category: "Get started",
    description: "One token, protocol-owned liquidity and three ways to participate.",
    minutes: 4,
    sections: [
      {
        id: "idea",
        title: "Liquidity that works for the community",
        paragraphs: [
          `${N} is building a liquidity network on Robinhood Chain around ${T}. Two-thirds of collected creator fees fund protocol liquidity; one-third funds the team treasury. Fees earned by protocol-owned liquidity then fund holder and staking rewards.`,
          "Users can also supply their own liquidity to eligible secondary pools. Their positions and fees belong to their own wallets.",
        ],
      },
      {
        id: "participate",
        title: "Three ways to participate",
        table: {
          headers: ["Path", "Contribution", "Reward source"],
          rows: [
            ["Liquidity provider", "Both tokens in a selected pool", "Fees earned by your own active liquidity"],
            [`${T} holder`, "An eligible wallet balance", "Funded holder allocations from protocol LP revenue"],
            [`${T} staker`, `${T} deposited in the staking contract`, "Funded staking allocations from protocol LP revenue"],
          ],
        },
      },
      {
        id: "status",
        title: "Current availability",
        paragraphs: [
          "Real wallet connection is available. Financial contracts have not been activated for public use. The interface shows launch status and unavailable balances until verified deployment data is available.",
          "No token contract address or live pool is implied by the planned ticker and market names. Verified addresses will be published with activation.",
        ],
      },
      {
        id: "start",
        title: "Where to start",
        bullets: [
          "Connect your wallet using the button in the header.",
          "Read the pool rollout before choosing a market.",
          "After activation, manage your wallet-owned positions, stake and rewards through the dapp.",
          "Review the wallet’s network, recipient and token amounts before confirming any transaction.",
        ],
      },
    ],
  },
  {
    slug: "wallets",
    title: "Connect your wallet",
    category: "Get started",
    description: "WalletConnect, browser wallets, network selection and disconnecting.",
    minutes: 4,
    sections: [
      {
        id: "connect",
        title: "Connect through Reown",
        paragraphs: [
          "Select Connect wallet in the header. Choose a supported browser wallet, or use WalletConnect to connect a mobile wallet with its QR code or deep link. Approve the connection in your wallet.",
          `Connecting shares your public account with ${N}. It does not stake tokens, approve a spender, transfer assets or create a liquidity position. ${N} never asks for your recovery phrase or private key.`,
        ],
      },
      {
        id: "network",
        title: "Use Robinhood Chain",
        paragraphs: [
          `${N} uses Robinhood Chain mainnet, chain ID 4663, with ETH for gas. The wallet selector supports this network; if your wallet is connected elsewhere, switch networks before submitting a ${N} transaction.`,
          `An address can be connected before the token launches. ${T} balances, positions and claimable amounts appear only after the relevant contracts are activated and read successfully.`,
        ],
      },
      {
        id: "session",
        title: "Account changes and disconnecting",
        paragraphs: [
          "Open the connected-address button to manage or disconnect your session. Changing the account or network resets pending transaction reviews and the account data shown by the dapp.",
          `Disconnecting ends the app connection. It does not revoke token allowances previously granted onchain. ${N} requests exact amounts for new approvals when an allowance is insufficient.`,
        ],
      },
      {
        id: "review",
        title: "Every action needs your approval",
        bullets: [
          "Token approvals and the final action can require separate wallet confirmations.",
          "No signed login message is required simply to connect.",
          "Rejecting a transaction leaves that proposed action unexecuted. Approvals already confirmed before rejection remain onchain.",
          "The interface rechecks account and network before requesting a transaction.",
        ],
      },
    ],
    sources: [
      { title: "Reown AppKit wallet connection", url: "https://docs.reown.com/appkit/react/core/installation" },
      { title: "Robinhood Chain network configuration", url: "https://docs.robinhood.com/chain/connecting/" },
    ],
  },
  {
    slug: "tokenomics",
    title: "Token & fee model",
    category: "Get started",
    description: "The creator fee, the liquidity/team split and the difference between launch and pool revenue.",
    minutes: 5,
    sections: [
      {
        id: "token",
        title: T,
        paragraphs: [
          `${T} is ${N}’s planned participation token. The token will be launched through the native Degen launch path on Robinhood Chain. Supply, initial allocation and launch terms must be published before launch.`,
        ],
      },
      {
        id: "split",
        title: "The 2:1 creator-fee split",
        paragraphs: [
          "The intended creator allocation is 3% of eligible launch-venue trading volume. Once collected, two-thirds of that amount goes to protocol liquidity and one-third goes to the team treasury. This corresponds to two percentage points for liquidity and one for the team.",
        ],
        formula: "Received creator fees × 2/3 → liquidity; received creator fees × 1/3 → team",
      },
      {
        id: "cost",
        title: "A 3% creator allocation means 3.35% venue fees",
        paragraphs: [
          "The verified native Degen tier combines the 3% creator allocation with 0.35 percentage points of platform/referral fees. Traders also pay network gas and can incur price impact.",
          `This is a fee on the eligible venue. It is not a universal transfer tax and does not automatically apply to every secondary ${T} market.`,
        ],
      },
      {
        id: "revenue",
        title: "Secondary LP fees are a separate revenue source",
        paragraphs: [
          `${N}’s first planned secondary pool has a 0.30% swap fee. Each liquidity position earns its own share of pool fees. Personal LP fees belong to the user; only fees earned by protocol-owned positions fund holder and staking rewards.`,
          "The native launch pool is the source of creator fees. It is not presented as an ordinary fee-earning community LP position.",
        ],
      },
      {
        id: "yield",
        title: "No fixed yield",
        paragraphs: [
          "Rewards depend on actual collected pool fees and funding. Low volume can mean low or zero rewards. Asset purchases, conversions and gas have costs; internal trades can also incur launch-venue fees. None of these flows guarantees a profit.",
        ],
      },
    ],
    sources: [{ title: "Degen fee schedule", url: "https://degen.zone/docs/fees" }],
  },
  {
    slug: "liquidity",
    title: "Pools & ownership",
    category: "Liquidity",
    description: "How protocol liquidity and user-owned positions share a market without sharing principal.",
    minutes: 5,
    sections: [
      {
        id: "owners",
        title: "One market, separate positions",
        table: {
          headers: ["Owner", "Capital source", "Fee recipient"],
          rows: [
            ["Protocol", "Seed funding and the liquidity share of creator fees", "Protocol reward accounting"],
            ["User", "Both tokens supplied by the user", "The user’s wallet-owned LP position"],
          ],
        },
      },
      {
        id: "nft",
        title: "Your wallet owns its position",
        paragraphs: [
          `A direct deposit creates a V3 position NFT owned by your wallet. ${N} does not take ownership of that NFT or turn your deposit into protocol capital. You can manage it through the position manager independently of this website.`,
          "The first implementation uses full-range positions. Fee attribution is based on the DEX’s actual position accounting, including price changes and fee growth.",
        ],
      },
      {
        id: "markets",
        title: "The approved market rollout",
        paragraphs: [
          `The approved sequence is ${T} / USDG, then ${T} / SPY, followed by ${T} / NVDA and ${T} / AAPL. The initial preparation policy seeds USDG and SPY in that order; all remain unavailable until production activation.`,
          "The target split for new liquidity capital is 50% USDG, 25% SPY, 15% NVDA and 10% AAPL. Both assets in each position are funded from its allocation. Earlier phases normalize these weights across the selected markets: initially about 67% USDG and 33% SPY. Existing liquidity is not automatically sold to match a target.",
        ],
      },
      {
        id: "volume",
        title: "Where trading fees come from",
        paragraphs: [
          `Pool income requires swaps through that pool. ${N} can attract external flow with useful swap access, competitive liquidity and integration into routing systems. A router should use a ${N} path only when its final quote, including fees and gas, is competitive.`,
          "Trading between protocol-controlled wallets is not new external revenue. Protocol treasury purchases, reward conversions and rebalancing have real costs and should be reported separately from external user activity. Higher displayed volume does not establish profitability.",
          "Arbitrage trades can align prices across venues and pay pool fees, but liquidity providers may lose value to arbitrageurs. Compare fee income with inventory losses, execution costs and any incentives when assessing a market.",
        ],
      },
      {
        id: "capital",
        title: "Capital and income stay separate",
        paragraphs: [
          "The protocol liquidity contract separately records spendable principal, collected fee inventory and pending reward allocations. Removing protocol liquidity must not label returned principal as new revenue.",
          "Your own NFT’s fees remain yours. They do not enter the protocol’s holder or staking budget.",
        ],
      },
    ],
    sources: [{ title: "Canonical Robinhood Chain token contracts", url: "https://docs.robinhood.com/chain/contracts/" }],
  },
  {
    slug: "swapping",
    title: "Swapping & routing",
    category: "Liquidity",
    description: "Compare live routes, understand costs and sign a protected swap.",
    minutes: 5,
    sections: [
      {
        id: "quotes",
        title: "Real quotes before you trade",
        paragraphs: [
          "The Swap page reads live liquidity on Robinhood Chain. Enter the asset you want to sell, the asset you want to receive and an amount. Quotes are available before protocol activation; signing opens only after the protocol and selected markets have been verified.",
          `ETH, WETH, USDG, SPY, NVDA and AAPL can be quoted. ${T} appears after its verified contract address is activated. Quoting a stock token does not mean its ${N} pool is already live or that the asset is eligible for every wallet.`,
        ],
      },
      {
        id: "routes",
        title: "How routes are compared",
        paragraphs: [
          `${N} checks direct V3 pools and paths through one intermediate token, using up to two pools. Pool fee tiers checked are 0.01%, 0.05%, 0.3% and 1%. Enabled ${N} pools participate once they exist and have active liquidity.`,
          "The list favors estimated output after network costs when those costs are available for every route. If a cost cannot be estimated, all routes are sorted by quoted output and a warning explains that gas is additional. You can choose any executable route. This comparison is limited to checked paths; it does not claim the best price across every exchange.",
          "Wider 0x quotes require an enabled integration and a connected wallet. When that service is unavailable, real pool quotes still work. Public token and pool feeds support external integrations, but publishing a feed does not confirm an aggregator listing.",
        ],
      },
      {
        id: "costs",
        title: "Output, fees and network costs",
        paragraphs: [
          "Quoted output already reflects pool trading fees. Estimated network costs are paid in ETH and can change before the wallet signs. Gas for token approvals is additional. The minimum received amount is the onchain lower bound for the swap output, not your output after gas.",
          "Network-cost comparisons use an execution estimate and the chain’s calldata-cost estimate. ETH costs are translated into the output token using a small live pool quote. These estimates are not guaranteed wallet charges or an independent asset valuation.",
        ],
      },
      {
        id: "review",
        title: "Review and sign",
        bullets: [
          "Connect your wallet and switch to Robinhood Chain. Keep ETH available for network fees.",
          "Request a fresh quote and choose a route. Quotes expire after 45 seconds.",
          "Choose slippage between 0.1% and 1%. V3 routes with estimated price impact above 3%, or an unavailable impact estimate, cannot execute here.",
          "Review the input amount, minimum output and route. Approve only the exact input amount if an ERC20 approval is needed. An existing allowance may need resetting first.",
          "If approval takes longer than the quote lifetime, request a new quote and review again. The app simulates the swap before asking for a signature.",
          "Confirm the separate swap transaction in your wallet. The interface reports the actual transaction result and links to the explorer. An unsuccessful transaction can still consume network gas.",
        ],
      },
      {
        id: "native",
        title: "Using ETH",
        paragraphs: [
          "When you pay ETH, the V3 router wraps it for the pool trade. When you receive ETH, it unwraps WETH and sends ETH to your wallet in the same transaction. ETH-to-WETH wrapping by itself is not a supported trading pair on this page.",
        ],
      },
      {
        id: "revenue",
        title: `When a trade earns ${N} fees`,
        paragraphs: [
          `${N} earns LP fees only when a trade actually uses a pool in which the protocol owns active liquidity. The protocol receives its proportional share; other liquidity providers retain theirs. Those protocol LP earnings can then fund the configured holder and staking allocations.`,
          `A swap interface and routing integrations make the pools easier to use. They do not guarantee demand, fee revenue or rewards. ${N} does not automatically trade against itself to manufacture volume.`,
        ],
      },
    ],
    sources: [
      { title: `Public ${N} token list`, url: `${site.url}/api/swap/tokens` },
      { title: `Public ${N} pool feed`, url: `${site.url}/api/swap/pools` },
    ],
  },
  {
    slug: "deposits",
    title: "Add & withdraw liquidity",
    category: "Liquidity",
    description: "Quotes, exact approvals, wallet-owned NFTs and full withdrawals.",
    minutes: 5,
    sections: [
      {
        id: "before",
        title: "Before depositing",
        bullets: [
          "Wait for the pool to be verified and opened in the dapp.",
          "Connect a wallet on Robinhood Chain.",
          "Hold both pool assets and enough ETH for transaction gas.",
          "Understand the changing token exposure and potential loss of value from providing liquidity.",
        ],
      },
      {
        id: "deposit",
        title: "Add liquidity",
        bullets: [
          `Open a pool and enter a ${T} amount.`,
          "Request a quote. The paired-asset amount is calculated from the onchain price and the position’s tick range.",
          "Review token amounts, position owner, approval spender and 1% slippage tolerance.",
          "Approve exact token amounts if required, then confirm the deposit in your wallet.",
          "Wait for confirmation before the position is included in your balances.",
        ],
      },
      {
        id: "quotes",
        title: "Quotes expire",
        paragraphs: [
          "A transaction review expires after 60 seconds. If separate approvals take longer, request a fresh quote before the deposit. Confirmed approvals remain valid even when a quote expires.",
          "Balances are not credited optimistically as though a pending action had already succeeded. Failed reads are shown as unavailable rather than as estimated earnings.",
        ],
      },
      {
        id: "exit",
        title: "Withdraw a position",
        paragraphs: [
          "The live interface supports full withdrawal of a selected NFT’s liquidity. It combines the liquidity decrease and token collection in one position-manager multicall, with minimum amounts for the returned principal.",
          "Claiming without withdrawing collects tokens owed to the NFT. This can include principal left uncollected through another app as well as trading fees. The transaction review labels these as claimable tokens.",
        ],
      },
    ],
  },
  {
    slug: "fee-claims",
    title: "LP fees & reward accounting",
    category: "Liquidity",
    description: "How fees are harvested, converted and funded without paying the same revenue twice.",
    minutes: 5,
    sections: [
      {
        id: "personal",
        title: "Personal LP fees",
        paragraphs: [
          "Your LP position earns tokens from swaps that use its liquidity. The claim amount comes from the position manager’s actual accounting and can be paid in either or both pool tokens.",
          "Claiming your position’s fees does not fund another person’s holder or staking rewards. Your principal remains in the position unless you also withdraw liquidity.",
        ],
      },
      {
        id: "protocol",
        title: "Protocol fee processing",
        bullets: [
          "Collect fees from the protocol-owned NFT positions.",
          "Track collected fee tokens separately from principal.",
          "Convert fee inventory to USDG through the configured routes, subject to output minimums and limits.",
          "Allocate funded USDG between holder and staking pots.",
          "Make holder epochs and staking streams claimable only after their contracts receive funding.",
        ],
      },
      {
        id: "split",
        title: "Reward allocation",
        paragraphs: [
          "The preparation policy currently proposes 50% of protocol LP reward revenue for holders and 50% for stakers. The owner has not yet finalized this allocation. The deployed liquidity contract fixes the selected split at construction.",
          "The full USDG reward allocation excludes user-owned LP fees and returned liquidity principal. Conversion costs affect the amount available; gas needs a separately funded operator wallet.",
        ],
      },
      {
        id: "claim",
        title: "Claiming rewards",
        paragraphs: [
          "Use My positions for personal LP claims and Rewards for holder or staking claims. Review the destination and amount, then confirm in your wallet. Each claim is verified by its corresponding onchain contract.",
          "The interface does not present a fixed APR, inferred dollar value or seeded reward balance as an earned amount.",
        ],
      },
    ],
  },
  {
    slug: "staking",
    title: `Stake & unstake ${T}`,
    category: "Rewards",
    description: "Funded USDG streams, independent principal withdrawals and no staking lock.",
    minutes: 5,
    sections: [
      {
        id: "deposit",
        title: `Stake ${T}`,
        paragraphs: [
          `After activation, enter an amount no larger than your available ${T}, review the staking contract and approve the exact amount if needed. Confirm the stake with your wallet.`,
          "Staking rewards use checkpointed reward-per-token accounting. A new stake does not receive rewards earned before its deposit.",
        ],
      },
      {
        id: "stream",
        title: "How rewards accrue",
        paragraphs: [
          "The staking contract streams USDG that it has actually received. The current preparation policy proposes a one-day funding period. The selected duration is fixed when the contract is deployed.",
          "When nobody is staked, unearned stream time is queued for a later funded period. Small rounding amounts can remain in the contract. Funding is variable and does not imply a guaranteed return.",
        ],
      },
      {
        id: "withdraw",
        title: "Withdraw principal independently",
        paragraphs: [
          `There is no staking lock, cooldown or exit fee in the prepared contract. Withdrawals return ${T} principal without requiring a successful USDG reward transfer. Earned rewards remain available to claim separately.`,
          "A protocol pause prevents new stakes but does not block existing principal withdrawals or funded claims.",
        ],
      },
      {
        id: "eligibility",
        title: "Staking and holder eligibility",
        paragraphs: [
          `The prepared holder snapshot excludes the staking contract’s ${T} balance. Tokens cannot earn a wallet-holder allocation simply by also being counted in staking custody. The final exclusion list will be published before launch.`,
        ],
      },
    ],
  },
  {
    slug: "holder-rewards",
    title: "Holder rewards & eligibility",
    category: "Rewards",
    description: "Time-weighted wallet balances, published allocations and funded claims.",
    minutes: 5,
    sections: [
      {
        id: "weight",
        title: "Holding time matters",
        paragraphs: [
          `The worker reconstructs confirmed token transfers and weights eligible ${T} balances by the time they were held during the epoch. The preparation policy proposes daily epochs.`,
          "Tokens moved into and out of an address at the same timestamp do not receive holding-time weight for that instant. Time weighting does not eliminate every possible borrowing strategy.",
        ],
      },
      {
        id: "excluded",
        title: "Excluded balances",
        paragraphs: [
          "Known protocol, staking and DEX custody addresses are excluded together with the approved address list. Unknown custodial addresses are not automatically recognized. Eligibility applies to the configured wallet-balance model rather than to every indirect beneficial owner.",
        ],
      },
      {
        id: "publication",
        title: "Funded, immutable reward epochs",
        paragraphs: [
          "The publisher calculates allocations, publishes snapshot evidence and commits a funded Merkle root. Each claim is bound to the chain, distributor contract, epoch, account and amount.",
          "The publisher is trusted to calculate honest allocations. Once published, a root cannot be rewritten, a claim cannot repeat and the epoch cannot pay more than its funded budget. The contract does not itself replay every token transfer.",
        ],
      },
      {
        id: "claim",
        title: "Claim your allocation",
        paragraphs: [
          "Connect the eligible wallet and open Rewards. Each available epoch shows its funded USDG amount. Review and confirm the claim. Holder claims have no expiry, and older epochs are available through pagination.",
          "Rounding dust stays uncommitted for a later allocation. Missing or invalid proof data is reported as unavailable; it does not create a substitute balance.",
        ],
      },
    ],
  },
  {
    slug: "stock-tokens",
    title: "Stock tokens & Robinhood Chain",
    category: "Protocol",
    description: "How future asset selection works and why stock tickers are not enough.",
    minutes: 4,
    sections: [
      {
        id: "network",
        title: "Robinhood Chain",
        paragraphs: [
          `${N} targets Robinhood Chain mainnet, chain ID 4663, with ETH for gas. ${N} is independent of Robinhood and does not claim a partnership or endorsement.`,
        ],
      },
      {
        id: "assets",
        title: "Verify the actual asset",
        paragraphs: [
          "A stock-token pool needs the issuer’s canonical contract address, token decimals, transfer compatibility and a liquid acquisition route. Issuer terms and eligibility requirements must be checked for each asset before it is enabled.",
          "A tokenized stock is not automatically the same legal instrument as a share held in a brokerage account. Consult the issuer’s disclosures for its rights and restrictions.",
        ],
      },
      {
        id: "selection",
        title: "Approved stock-token sequence",
        paragraphs: [
          "SPY is the first selected stock-token market, followed by NVDA and AAPL. The final target weights for new liquidity are USDG 50%, SPY 25%, NVDA 15% and AAPL 10%. TSLA is a possible future candidate with no current allocation.",
          "Selection is approved, but expansion is not automatic. Each phase needs verified acquisition and exit routes, a sufficient seed budget, approved spending limits and governance configuration. NVDA and AAPL also require evidence of external trading demand before expansion; numerical milestones are not set yet. Token pricing must account for relevant corporate actions.",
        ],
      },
    ],
    sources: [
      { title: "Building with Robinhood Stock Tokens", url: "https://docs.robinhood.com/chain/building-with-stock-tokens/" },
      { title: "Canonical contracts", url: "https://docs.robinhood.com/chain/contracts/" },
    ],
  },
  {
    slug: "architecture",
    title: "Contracts & architecture",
    category: "Protocol",
    description: "Fee collection, liquidity custody, wallet-owned positions and the launch gate.",
    minutes: 6,
    sections: [
      {
        id: "modules",
        title: "The protocol modules",
        table: {
          headers: ["Module", "Responsibility"],
          rows: [
            ["Configuration", "One-time token binding, governance and activation"],
            ["Fee router", "Two-thirds liquidity / one-third team split"],
            ["Liquidity vault", "Protocol NFTs, typed swaps, budgets and separate fee inventory"],
            ["Holder distributor", "Immutable funded epochs and replay-protected claims"],
            ["Staking contract", `${T} principal and checkpointed USDG streams`],
            ["Combined worker", "Creator claims, allocation, harvesting, funding and snapshots"],
          ],
        },
      },
      {
        id: "wallet",
        title: "User ownership",
        paragraphs: [
          "Reown connects the wallet. The dapp reads verified contracts and uses the connected provider to request user-approved transactions. A user’s V3 position NFT is created with the wallet as its owner.",
          "The website does not receive the protocol signer’s private key. Private worker journals and public reward-proof data use separate server storage.",
        ],
      },
      {
        id: "controls",
        title: "Operator controls and their limits",
        paragraphs: [
          "Protocol spending is restricted to configured assets, typed operations, fixed DEX destinations and daily token budgets. Quotes use deadlines and minimum outputs; acquisition checks bound route impact and pool-price deviation.",
          "These checks are not an independent oracle or comprehensive protection against adverse trading. The operator is trusted within its permitted limits. Governance can change operators, asset policy and pause new operations; there is no timelock in the prepared implementation.",
        ],
      },
      {
        id: "recovery",
        title: "Recovery and verification",
        paragraphs: [
          "The worker records signed transaction bytes before sending them. Recovery reconciles the same transaction hash, and a reverted transaction blocks subsequent spending until investigated.",
          "The prepared flow has passed local-fork tests covering fee claims, secondary pools, funded rewards, user-owned LP exits and activation commands. These tests are not an independent security audit or proof of production readiness.",
        ],
      },
    ],
  },
  {
    slug: "risks",
    title: "Risks & assumptions",
    category: "Protocol",
    description: "Price exposure, execution costs, custody permissions and software risks.",
    minutes: 4,
    sections: [
      {
        id: "liquidity",
        title: "Liquidity can lose value",
        paragraphs: [
          "A liquidity position holds a changing mix of tokens. Relative price moves can leave it worth less than holding the original amounts. Trading fees may not offset that loss. Thin markets and price impact can also make acquiring or rebalancing assets costly.",
        ],
      },
      {
        id: "income",
        title: "Revenue is uncertain",
        paragraphs: [
          "Secondary trades can bypass the creator-fee venue. More secondary volume does not necessarily create more creator fees. Holder and staking rewards depend on the protocol’s own actual LP income.",
          "Token purchases and conversions incur costs, including fees on internal trades. The existence of a fee mechanism or a stablecoin pair does not guarantee a positive return.",
        ],
      },
      {
        id: "control",
        title: "Software and privileged roles",
        paragraphs: [
          "Bugs or failures in the launch hook, DEX, tokens, protocol contracts, worker or frontend can cause losses or affect availability. Operators and reward publishers have disclosed trusted responsibilities.",
          "No independent security review or production financial deployment has been completed. Users should review verified addresses, permissions and release documentation before committing assets.",
        ],
      },
      {
        id: "assets",
        title: "Asset and network conditions",
        paragraphs: [
          "Stablecoins and tokenized assets carry issuer and market risks. RPC availability, sequencer conditions, finality and gas balances affect transaction processing. Wallet connection alone does not establish a user’s eligibility for a particular asset.",
        ],
      },
    ],
  },
  {
    slug: "launch",
    title: "Launch status & pool rollout",
    category: "Reference",
    description: "The actual configured order and the prerequisites for opening transactions.",
    minutes: 5,
    sections: [
      {
        id: "status",
        title: "Current status",
        table: {
          headers: ["Area", "Status"],
          rows: [
            ["Wallet connection", "Reown and WalletConnect integration"],
            ["Token and public financial operations", "Awaiting launch and activation"],
            ["Initial secondary market", "USDG then SPY selected; budgets and full release approval pending"],
            ["Stock-token pool order", "SPY → NVDA → AAPL; selection approved"],
            ["Independent security review", "Not completed"],
          ],
        },
      },
      {
        id: "order",
        title: "The configured sequence",
        bullets: [
          `First, the native Degen launch creates ETH / ${T}, the venue that produces eligible creator fees.`,
          `Next, ${N} activation uses the separately funded seed budget to seed ${T} / USDG and then ${T} / SPY as V3 pools, after route and budget verification.`,
          "Afterwards, two-thirds of received creator fees deepen the selected pools according to the current stage weights. One-third goes to the team.",
          "NVDA follows SPY; AAPL follows NVDA. The final target is USDG 50%, SPY 25%, NVDA 15% and AAPL 10% of new liquidity capital. Phase changes require funding, verified routes, external demand and governance configuration.",
        ],
      },
      {
        id: "cadence",
        title: "When liquidity is added",
        paragraphs: [
          "The current worker policy checks for work every five minutes. It defers an allocation below its minimum capital threshold, currently 0.001 ETH unless configured otherwise, and respects per-cycle and daily spending limits.",
          "The worker acquires both sides of liquidity, checks the pool price and adds to the existing protocol position. A price deviation can delay an addition while the fee-harvesting and reward process continues. Creator fees, not gross volume alone, are the spendable budget.",
        ],
      },
      {
        id: "before",
        title: "Before token launch",
        bullets: [
          "Approve the reward policy, eligible markets and holder exclusions.",
          "Configure governance, team and creator/operator addresses and spending limits.",
          "Fund seed liquidity and transaction gas, and configure a production archive RPC.",
          "Complete independent review, production deployment, monitoring and a rehearsal of the intended configuration.",
        ],
      },
      {
        id: "activation",
        title: "Fast token binding",
        paragraphs: [
          "The prepared commands verify the new token and creator-fee registration, bind the address once, seed the selected market and publish an active deployment manifest. The website detects activation without a rebuild.",
          "The exact activation command took about 43 seconds in a local-fork rehearsal. That is a measured test result, not a production timing guarantee. Wallet connection does not bypass any activation gate.",
        ],
      },
    ],
  },
];

export const findDoc = (slug: string) => docs.find((doc) => doc.slug === slug);
