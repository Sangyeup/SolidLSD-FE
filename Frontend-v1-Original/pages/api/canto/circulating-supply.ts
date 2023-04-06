import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http, fallback, formatUnits } from "viem";
import { canto } from "viem/chains";
import { CONTRACTS, NATIVE_TOKEN } from "../../../stores/constants/constants";
import Cors from "cors";

const cors = Cors({
  methods: ["GET"],
});

const dexvaults = http("https://canto.dexvaults.com");
const plexnode = http("https://mainnode.plexnode.org:8545");
const nodestake = http("https://jsonrpc.canto.nodestake.top");
const slingshot = http("https://canto.slingshot.finance");
const neobase = http("https://canto.neobase.one");

const publicClient = createPublicClient({
  chain: canto,
  transport: fallback([dexvaults, plexnode, nodestake, slingshot, neobase], {
    rank: {
      interval: 30_000,
    },
  }),
});

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  const flowContract = {
    // inlining the abi here to enable type inference for typescript
    // see https://viem.sh/docs/typescript.html#type-inference
    // TODO change to `import` after pr 24 is merged
    abi: [
      {
        inputs: [{ internalType: "address", name: "_router", type: "address" }],
        stateMutability: "nonpayable",
        type: "constructor",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
        ],
        name: "Approval",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "oldVault",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "newVault",
            type: "address",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "effectiveTime",
            type: "uint256",
          },
        ],
        name: "LogChangeVault",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "address",
            name: "from",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "to",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
        ],
        name: "Transfer",
        type: "event",
      },
      {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "PERMIT_TYPEHASH",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "", type: "address" },
          { internalType: "address", name: "", type: "address" },
        ],
        name: "allowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "_spender", type: "address" },
          { internalType: "uint256", name: "_value", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "account", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "burn",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "_pendingRouter", type: "address" },
        ],
        name: "changeVault",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "account", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "mint",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "minter",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "name",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "nonces",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "pendingRouter",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "pendingRouterDelay",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "address", name: "spender", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint8", name: "v", type: "uint8" },
          { internalType: "bytes32", name: "r", type: "bytes32" },
          { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "router",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ internalType: "address", name: "_minter", type: "address" }],
        name: "setMinter",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "symbol",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "_to", type: "address" },
          { internalType: "uint256", name: "_value", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "_from", type: "address" },
          { internalType: "address", name: "_to", type: "address" },
          { internalType: "uint256", name: "_value", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    address: CONTRACTS.GOV_TOKEN_ADDRESS as `0x${string}`,
  } as const;

  const [
    totalSupply,
    lockedSupply,
    flowInMinter,
    flowInMsig,
    flowInRewardsDistributor,
    flowInTimelockerController,
  ] = await publicClient.multicall({
    allowFailure: false,
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    contracts: [
      {
        ...flowContract,
        functionName: "totalSupply",
      },
      {
        ...flowContract,
        functionName: "balanceOf",
        args: [CONTRACTS.VE_TOKEN_ADDRESS as `0x${string}`],
      },
      {
        ...flowContract,
        functionName: "balanceOf",
        args: [CONTRACTS.MINTER_ADDRESS as `0x${string}`],
      },
      {
        ...flowContract,
        functionName: "balanceOf",
        args: [CONTRACTS.MSIG_ADDRESS as `0x${string}`],
      },
      {
        ...flowContract,
        functionName: "balanceOf",
        args: [CONTRACTS.VE_DIST_ADDRESS as `0x${string}`],
      },
      {
        ...flowContract,
        functionName: "balanceOf",
        args: ["0xd0cC9738866cd82B237A14c92ac60577602d6c18"],
      },
    ],
  });

  const circulatingSupply = formatUnits(
    totalSupply -
      lockedSupply -
      flowInMinter -
      flowInMsig -
      flowInRewardsDistributor -
      flowInTimelockerController,
    NATIVE_TOKEN.decimals
  );

  res.setHeader("Cache-Control", "max-age=0, s-maxage=900");

  res.status(200).json(parseFloat(circulatingSupply));
}