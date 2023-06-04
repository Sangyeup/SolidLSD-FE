import { useQuery } from "@tanstack/react-query";
import { Address, useAccount } from "wagmi";
import {
  formatEther,
  formatUnits,
  getContract,
  isAddress,
  parseEther,
  parseUnits,
} from "viem";
import BigNumber from "bignumber.js";

import viemClient from "../../../stores/connectors/viem";
import { usePairsWithGauges } from "../../../lib/global/queries";
import { BaseAsset, Pair, RouteAsset } from "../../../stores/types/types";
import {
  CONTRACTS,
  NATIVE_TOKEN,
  PAIR_DECIMALS,
  W_NATIVE_ADDRESS,
  ZERO_ADDRESS,
} from "../../../stores/constants/constants";

import { useAmounts } from "./useAmounts";

const KEYS = {
  PAIR_EXISTANCE: "pairExistance",
  PAIR_BY_ADDRESS: "pairByAddress",
  QUOTE_ADD_LIQUIDITY: "quoteAddLiquidity",
  QUOTE_REMOVE_LIQUIDITY: "quoteRemoveLiquidity",
};

export function usePairsWithGaugesOnlyWithBalance() {
  return usePairsWithGauges(getOnlyWithBalance);
}

export function usePairExistance(pairParams: {
  token0Address: Address | undefined;
  token1Address: Address | undefined;
  stable: boolean;
}) {
  return useQuery({
    queryKey: [KEYS.PAIR_EXISTANCE, pairParams],
    queryFn: () => checkIfPairExists(pairParams),
  });
}

export function useGetPair(pairAddress: string | string[] | undefined) {
  const { address } = useAccount();
  return useQuery({
    queryKey: [KEYS.PAIR_BY_ADDRESS, address, pairAddress],
    queryFn: () => getPairByAddress(address, pairAddress as Address),
    enabled:
      !!address &&
      !!pairAddress &&
      !Array.isArray(pairAddress) &&
      isAddress(pairAddress),
  });
}

export function useQuoteAddLiquidity(
  pairAddress: string | string[] | undefined
) {
  const { address } = useAccount();
  const { amount0, amount1, setAmount0, setAmount1, activeInput } =
    useAmounts();
  const { data: pair } = useGetPair(pairAddress);

  const preQuoteAddLiquidity = () => {
    if (!pair) {
      throw new Error("no pair");
    }

    const { token0, token1 } = pair;

    if (!token0 || !token1) {
      throw new Error("no tokens");
    }

    let invert = false;

    let addy0 = token0.address;
    let addy1 = token1.address;
    // @ts-expect-error workaround for CANTO
    if (token0.address === "CANTO") {
      // @ts-expect-error workaround for CANTO
      addy0 = W_NATIVE_ADDRESS;
    }
    // @ts-expect-error workaround for CANTO
    if (token1.address === "CANTO") {
      // @ts-expect-error workaround for CANTO
      addy1 = W_NATIVE_ADDRESS;
    }

    if (
      addy1.toLowerCase() === pair.token0.address.toLowerCase() &&
      addy0.toLowerCase() === pair.token1.address.toLowerCase()
    ) {
      invert = true;
    }
    if (activeInput === "0") {
      if (amount0 === "") {
        setAmount1("");
      } else {
        let newAmount1: string;
        if (invert) {
          newAmount1 = BigNumber(amount0)
            .times(pair.reserve0)
            .div(pair.reserve1)
            .toFixed(pair.token0.decimals);
        } else {
          newAmount1 = BigNumber(amount0)
            .times(pair.reserve1)
            .div(pair.reserve0)
            .toFixed(pair.token1.decimals);
        }
        setAmount1(newAmount1);
      }
    }
    if (activeInput === "1") {
      if (amount1 === "") {
        setAmount0("");
      } else {
        let newAmount0: string;
        if (invert) {
          newAmount0 = BigNumber(amount1)
            .times(pair.reserve1)
            .div(pair.reserve0)
            .toFixed(pair.token1.decimals);
        } else {
          newAmount0 = BigNumber(amount1)
            .times(pair.reserve0)
            .div(pair.reserve1)
            .toFixed(pair.token0.decimals);
        }
        setAmount0(newAmount0);
      }
    }
  };

  return useQuery({
    queryKey: [
      KEYS.QUOTE_ADD_LIQUIDITY,
      address,
      pair,
      amount0,
      amount1,
      pair?.token0,
      pair?.token1,
    ],
    queryFn: () => {
      preQuoteAddLiquidity();
      return quoteAddLiquidity(address, {
        pair,
        token0: pair?.token0,
        token1: pair?.token1,
        amount0,
        amount1,
      });
    },
    enabled: !!pair && (amount0 !== "" || amount1 !== "") && !!address,
  });
}

export function useQuoteRemoveLiquidity(
  amount: string,
  pairAddress: string | string[] | undefined
) {
  const { address } = useAccount();
  const { data: pair } = useGetPair(pairAddress);
  return useQuery({
    queryKey: [
      KEYS.QUOTE_REMOVE_LIQUIDITY,
      address,
      pair,
      amount,
      pair?.token0,
      pair?.token1,
    ],
    queryFn: () =>
      quoteRemoveLiquidity(address, {
        pair,
        token0: pair?.token0,
        token1: pair?.token1,
        withdrawAmount: amount,
      }),
    enabled:
      !!amount &&
      !isNaN(+amount) &&
      parseFloat(amount) > 0 &&
      !!pair &&
      !!address,
  });
}

const getOnlyWithBalance = (data: Pair[]) => {
  return data.filter((ppp) => {
    return (
      (ppp.balance && BigNumber(ppp.balance).gt(0)) ||
      (ppp.gauge?.balance && BigNumber(ppp.gauge.balance).gt(0))
    );
  });
};

const quoteAddLiquidity = async (
  account: Address | undefined,
  options: {
    pair: Pair | undefined;
    token0: BaseAsset | RouteAsset | undefined;
    token1: BaseAsset | RouteAsset | undefined;
    amount0: string;
    amount1: string;
  }
) => {
  if (!account) {
    console.warn("account not found");
    throw new Error("account not found");
  }

  const { pair, token0, token1, amount0, amount1 } = options;

  if (!pair || !token0 || !token1 || amount0 == "" || amount1 == "") {
    throw new Error("options invalid");
  }

  const sendAmount0 = parseUnits(amount0 as `${number}`, token0.decimals);
  const sendAmount1 = parseUnits(amount1 as `${number}`, token1.decimals);

  let addy0 = token0.address;
  let addy1 = token1.address;

  if (token0.address === NATIVE_TOKEN.symbol) {
    addy0 = W_NATIVE_ADDRESS as `0x${string}`;
  }
  if (token1.address === NATIVE_TOKEN.symbol) {
    addy1 = W_NATIVE_ADDRESS as `0x${string}`;
  }

  const [, liquidity] = await viemClient.readContract({
    address: CONTRACTS.ROUTER_ADDRESS,
    abi: CONTRACTS.ROUTER_ABI,
    functionName: "quoteAddLiquidity",
    args: [addy0, addy1, pair.stable, sendAmount0, sendAmount1],
  });

  return formatUnits(liquidity, PAIR_DECIMALS);
};

const checkIfPairExists = async (pairParams: {
  token0Address: Address | undefined;
  token1Address: Address | undefined;
  stable: boolean;
}) => {
  const { token0Address, token1Address, stable } = pairParams;

  if (!token0Address || !token1Address) {
    return { pairExists: false, pairAddress: undefined };
  }

  const pairFor = await viemClient.readContract({
    address: CONTRACTS.ROUTER_ADDRESS,
    abi: CONTRACTS.ROUTER_ABI,
    functionName: "pairFor",
    args: [token0Address, token1Address, stable],
  });

  const isPair = await viemClient.readContract({
    address: CONTRACTS.FACTORY_ADDRESS,
    abi: CONTRACTS.FACTORY_ABI,
    functionName: "isPair",
    args: [pairFor],
  });

  return { pairExists: isPair, pairAddress: pairFor };
};

export const getPairByAddress = async (
  account: Address | undefined,
  pairAddress: Address | undefined
) => {
  if (!account) {
    console.warn("account not found");
    throw new Error("account not found");
  }
  if (!pairAddress) {
    console.warn("account not found");
    throw new Error("pair not found");
  }

  const pairContract = {
    abi: CONTRACTS.PAIR_ABI,
    address: pairAddress,
  } as const;
  const gaugesContract = {
    abi: CONTRACTS.VOTER_ABI,
    address: CONTRACTS.VOTER_ADDRESS,
  } as const;

  const totalWeight = await viemClient.readContract({
    ...gaugesContract,
    functionName: "totalWeight",
  });

  const [
    token0,
    token1,
    totalSupply,
    symbol,
    reserve0,
    reserve1,
    decimals,
    balanceOf,
    stable,
    gaugeAddress,
    gaugeWeight,
  ] = await viemClient.multicall({
    allowFailure: false,
    multicallAddress: CONTRACTS.MULTICALL_ADDRESS,
    contracts: [
      {
        ...pairContract,
        functionName: "token0",
      },
      {
        ...pairContract,
        functionName: "token1",
      },
      {
        ...pairContract,
        functionName: "totalSupply",
      },
      {
        ...pairContract,
        functionName: "symbol",
      },
      {
        ...pairContract,
        functionName: "reserve0",
      },
      {
        ...pairContract,
        functionName: "reserve1",
      },
      {
        ...pairContract,
        functionName: "decimals",
      },
      {
        ...pairContract,
        functionName: "balanceOf",
        args: [account],
      },
      {
        ...pairContract,
        functionName: "stable",
      },
      {
        ...gaugesContract,
        functionName: "gauges",
        args: [pairAddress],
      },
      {
        ...gaugesContract,
        functionName: "weights",
        args: [pairAddress],
      },
    ],
  });

  const token0Contract = {
    abi: CONTRACTS.ERC20_ABI,
    address: token0,
  } as const;

  const token1Contract = {
    abi: CONTRACTS.ERC20_ABI,
    address: token1,
  } as const;

  const [
    token0Symbol,
    token0Decimals,
    token0Balance,
    token1Symbol,
    token1Decimals,
    token1Balance,
  ] = await viemClient.multicall({
    allowFailure: false,
    multicallAddress: CONTRACTS.MULTICALL_ADDRESS,
    contracts: [
      {
        ...token0Contract,
        functionName: "symbol",
      },
      {
        ...token0Contract,
        functionName: "decimals",
      },
      {
        ...token0Contract,
        functionName: "balanceOf",
        args: [account],
      },
      {
        ...token1Contract,
        functionName: "symbol",
      },
      {
        ...token1Contract,
        functionName: "decimals",
      },
      {
        ...token1Contract,
        functionName: "balanceOf",
        args: [account],
      },
    ],
  });

  const thePair: Pair = {
    address: pairAddress,
    symbol: symbol,
    decimals: decimals,
    stable,
    token0: {
      address: token0,
      symbol: token0Symbol,
      balance: formatUnits(token0Balance, parseInt(token0Decimals.toString())),
      decimals: parseInt(token0Decimals.toString()),
      name: "",
      logoURI: "",
      local: false,
    },
    token1: {
      address: token1,
      symbol: token1Symbol,
      balance: formatUnits(token1Balance, parseInt(token1Decimals.toString())),
      decimals: parseInt(token1Decimals.toString()),
      name: "",
      logoURI: "",
      local: false,
    },
    apr: 0,
    oblotr_apr: 0,
    total_supply: 0,
    token0_address: token0,
    token1_address: token1,
    balance: formatUnits(balanceOf, decimals),
    totalSupply: formatUnits(totalSupply, decimals),
    reserve0: formatUnits(reserve0, parseInt(token0Decimals.toString())),
    reserve1: formatUnits(reserve1, parseInt(token1Decimals.toString())),
    tvl: 0,
    gauge_address: gaugeAddress,
    isStable: stable,
  };

  if (gaugeAddress !== ZERO_ADDRESS) {
    const gaugeContract = {
      abi: CONTRACTS.GAUGE_ABI,
      address: gaugeAddress,
    } as const;

    const external_bribe = await viemClient.readContract({
      ...gaugeContract,
      functionName: "external_bribe",
    });

    const wrapped_bribe_address = await viemClient.readContract({
      address: CONTRACTS.WXB_ADDRESS,
      abi: CONTRACTS.BRIBE_FACTORY_ABI,
      functionName: "oldBribeToNew",
      args: [external_bribe],
    });
    const x_wrapped_bribe_address = await viemClient.readContract({
      address: CONTRACTS.X_WXB_ADDRESS,
      abi: CONTRACTS.BRIBE_FACTORY_ABI,
      functionName: "oldBribeToNew",
      args: [external_bribe],
    });
    const xx_wrapped_bribe_address = await viemClient.readContract({
      address: CONTRACTS.XX_WXB_ADDRESS,
      abi: CONTRACTS.BRIBE_FACTORY_ABI,
      functionName: "oldBribeToNew",
      args: [external_bribe],
    });

    //wrapped bribe address is coming from api. if the api doesnt work this will break
    const bribeContract = {
      abi: CONTRACTS.BRIBE_ABI,
      address: wrapped_bribe_address,
    } as const;
    const bribeContractInstance = getContract({
      ...bribeContract,
      publicClient: viemClient,
    });
    const x_bribeContract = {
      abi: CONTRACTS.BRIBE_ABI,
      address: x_wrapped_bribe_address,
    } as const;
    const x_bribeContractInstance = getContract({
      ...x_bribeContract,
      publicClient: viemClient,
    });
    const xx_bribeContract = {
      abi: CONTRACTS.BRIBE_ABI,
      address: xx_wrapped_bribe_address,
    } as const;
    const xx_bribeContractInstance = getContract({
      ...xx_bribeContract,
      publicClient: viemClient,
    });

    const [totalSupply, gaugeBalance, bribeAddress] =
      await viemClient.multicall({
        allowFailure: false,
        multicallAddress: CONTRACTS.MULTICALL_ADDRESS,
        contracts: [
          {
            ...gaugeContract,
            functionName: "totalSupply",
          },
          {
            ...gaugeContract,
            functionName: "balanceOf",
            args: [account],
          },
          {
            ...gaugesContract,
            functionName: "external_bribes",
            args: [gaugeAddress],
          },
        ],
      });

    const tokensLength = await bribeContractInstance.read.rewardsListLength();
    const x_tokensLength =
      await x_bribeContractInstance.read.rewardsListLength();
    const xx_tokensLength =
      await xx_bribeContractInstance.read.rewardsListLength();

    const arry = Array.from(
      { length: parseInt(tokensLength.toString()) },
      (v, i) => i
    );
    const x_arry = Array.from(
      { length: parseInt(x_tokensLength.toString()) },
      (v, i) => i
    );
    const xx_arry = Array.from(
      { length: parseInt(xx_tokensLength.toString()) },
      (v, i) => i
    );

    const bribes = await Promise.all(
      arry.map(async (idx) => {
        const tokenAddress = await bribeContractInstance.read.rewards([
          BigInt(idx),
        ]);

        const token = await getBaseAsset(account, tokenAddress);
        if (!token) {
          throw new Error("No token found. getPairByAddress");
        }

        const rewardRate = await viemClient.readContract({
          ...gaugeContract,
          functionName: "rewardRate",
          args: [tokenAddress],
        });

        return {
          token: token,
          rewardAmount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
          reward_ammount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
          rewardAmmount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
        };
      })
    );
    const x_bribes = await Promise.all(
      x_arry.map(async (idx) => {
        const tokenAddress = await x_bribeContractInstance.read.rewards([
          BigInt(idx),
        ]);

        const token = await getBaseAsset(account, tokenAddress);
        if (!token) {
          throw new Error("No token found. getPairByAddress");
        }

        const rewardRate = await viemClient.readContract({
          ...gaugeContract,
          functionName: "rewardRate",
          args: [tokenAddress],
        });

        return {
          token: token,
          rewardAmount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
          reward_ammount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
          rewardAmmount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
        };
      })
    );
    const xx_bribes = await Promise.all(
      xx_arry.map(async (idx) => {
        const tokenAddress = await xx_bribeContractInstance.read.rewards([
          BigInt(idx),
        ]);

        const token = await getBaseAsset(account, tokenAddress);
        if (!token) {
          throw new Error("No token found. getPairByAddress");
        }

        const rewardRate = await viemClient.readContract({
          ...gaugeContract,
          functionName: "rewardRate",
          args: [tokenAddress],
        });

        return {
          token: token,
          rewardAmount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
          reward_ammount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
          rewardAmmount: Number(
            formatUnits(rewardRate * BigInt(604800), token.decimals)
          ),
        };
      })
    );

    const weightPercent = (
      (Number(gaugeWeight) * 100) /
      Number(totalWeight)
    ).toFixed(2);

    thePair.gauge = {
      address: gaugeAddress,
      apr: 0,
      votes: 0,
      tbv: 0,
      reward: 0,
      bribeAddress: bribeAddress,
      bribe_address: bribeAddress,
      decimals: 18,
      balance: formatEther(gaugeBalance),
      totalSupply: formatEther(totalSupply),
      total_supply: Number(formatEther(totalSupply)),
      weight: formatEther(gaugeWeight),
      weightPercent,
      bribes: bribes,
      x_bribes: x_bribes,
      xx_bribes: xx_bribes,
      wrapped_bribe_address,
      x_wrapped_bribe_address,
      xx_wrapped_bribe_address,
    };
  }

  return thePair;
};

const getBaseAsset = async (account: Address | undefined, address: Address) => {
  const baseAssetContract = {
    abi: CONTRACTS.ERC20_ABI,
    address: address,
  } as const;

  const [symbol, decimals, name] = await viemClient.multicall({
    allowFailure: false,
    multicallAddress: CONTRACTS.MULTICALL_ADDRESS,
    contracts: [
      {
        ...baseAssetContract,
        functionName: "symbol",
      },
      {
        ...baseAssetContract,
        functionName: "decimals",
      },
      {
        ...baseAssetContract,
        functionName: "name",
      },
    ],
  });

  const newBaseAsset: BaseAsset = {
    address: address,
    symbol: symbol,
    name: name,
    decimals: parseInt(decimals.toString()),
    logoURI: null,
    local: true,
    balance: null,
    isWhitelisted: undefined,
    listingFee: undefined,
  };

  if (account) {
    const balanceOf = await viemClient.readContract({
      ...baseAssetContract,
      functionName: "balanceOf",
      args: [account],
    });
    newBaseAsset.balance = formatUnits(balanceOf, newBaseAsset.decimals);
  }

  return newBaseAsset;
};

const quoteRemoveLiquidity = async (
  account: Address | undefined,
  options: {
    pair: Pair | undefined;
    token0: BaseAsset | RouteAsset | undefined;
    token1: BaseAsset | RouteAsset | undefined;
    withdrawAmount: string;
  }
) => {
  if (!account) {
    console.warn("account not found");
    throw new Error("account not found");
  }

  const { pair, token0, token1, withdrawAmount } = options;

  if (
    !pair ||
    !token0 ||
    !token1 ||
    withdrawAmount === "" ||
    isNaN(+withdrawAmount)
  ) {
    throw new Error("quote remove liq error");
  }

  const routerContract = {
    abi: CONTRACTS.ROUTER_ABI,
    address: CONTRACTS.ROUTER_ADDRESS,
  } as const;

  const sendWithdrawAmount = parseEther(withdrawAmount as `${number}`);

  const [amountA, amountB] = await viemClient.readContract({
    ...routerContract,
    functionName: "quoteRemoveLiquidity",
    args: [token0.address, token1.address, pair.stable, sendWithdrawAmount],
  });

  return {
    amount0: formatUnits(amountA, token0.decimals),
    amount1: formatUnits(amountB, token1.decimals),
  };
};