# Deploy AgentCourt On Arc Testnet

`AgentCourt.sol` constructor:

```solidity
constructor(IERC20 usdcToken, address treasuryAddress, address initialReporter)
```

You need:

- `PRIVATE_KEY`: deployer wallet private key.
- `RPC_URL`: Arc RPC URL, preferably from Canteen.
- `USDC_TOKEN`: ERC-20 USDC token address on Arc testnet.
- `TREASURY`: wallet that receives slashed stake.
- `REPORTER`: wallet allowed to report violations. For demo, this can be your deployer wallet.

## 1. Get Arc RPC

```bash
uv tool install git+https://github.com/the-canteen-dev/ARC-cli.git
arc-canteen login
arc-canteen rpc-url
```

Copy the printed URL.

## 2. Set Env In PowerShell

```powershell
$env:RPC_URL="https://rpc.testnet.arc-node.thecanteenapp.com/v1/YOUR_KEY"
$env:PRIVATE_KEY="0xyour_private_key"
$env:TREASURY="0xyour_treasury_wallet"
$env:REPORTER="0xyour_reporter_wallet"
$env:USDC_TOKEN="0xarc_testnet_erc20_usdc_address"
```

Do not commit your private key.

## 3. Build

```powershell
forge build
```

## 4. Deploy AgentCourt

```powershell
forge create src/AgentCourt.sol:AgentCourt `
  --rpc-url $env:RPC_URL `
  --private-key $env:PRIVATE_KEY `
  --broadcast `
  --constructor-args $env:USDC_TOKEN $env:TREASURY $env:REPORTER
```

Copy the deployed contract address from the output.

## 5. Update `.env`

```env
NEXT_PUBLIC_AGENT_COURT_ADDRESS=0xYourDeployedAgentCourt
NEXT_PUBLIC_ARC_TESTNET_RPC_URL=https://rpc.testnet.arc-node.thecanteenapp.com/v1/YOUR_KEY
NEXT_PUBLIC_ARC_TESTNET_EXPLORER_URL=https://testnet.arcscan.app
```

Restart the app:

```powershell
npm.cmd run dev
```

## Demo Token Option

If you do not have an Arc testnet ERC-20 USDC address yet, deploy the mock token for a local/test demo:

```powershell
forge create test/mocks/MockUSDC.sol:MockUSDC `
  --rpc-url $env:RPC_URL `
  --private-key $env:PRIVATE_KEY `
  --broadcast
```

Then use the deployed `MockUSDC` address as `USDC_TOKEN` when deploying `AgentCourt`.

After that, mint demo stake to your wallet:

```powershell
cast send 0xMockUSDCAddress "mint(address,uint256)" 0xYourWallet 1000000000 `
  --rpc-url $env:RPC_URL `
  --private-key $env:PRIVATE_KEY
```

`MockUSDC` uses 6 decimals, so `1000000000` is `1000 mUSDC`.

## Verify Deployment

```powershell
cast call 0xAgentCourtAddress "usdc()(address)" --rpc-url $env:RPC_URL
cast call 0xAgentCourtAddress "treasury()(address)" --rpc-url $env:RPC_URL
cast call 0xAgentCourtAddress "authorizedReporters(address)(bool)" $env:REPORTER --rpc-url $env:RPC_URL
```

If these calls return data, the app can use the contract.
