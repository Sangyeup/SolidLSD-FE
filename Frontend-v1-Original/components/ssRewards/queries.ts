import { useQuery } from "@tanstack/react-query";
import { deserialize, serialize, useAccount } from "wagmi";
import {
  type Address,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from "viem";

import viemClient, {
  chunkArray,
  multicallChunks,
} from "../../stores/connectors/viem";
import stores from "../../stores";
import {
  CONTRACTS,
  ACTIONS,
  QUERY_KEYS,
} from "../../stores/constants/constants";
import {
  hasGauge,
  VeDistReward,
  Gauge,
  GovToken,
  VeToken,
  VestNFT,
  Pair,
} from "../../stores/types/types";
import { useGovToken, useVeToken, usePairs } from "../../lib/global/queries";
import { useVestNfts } from "../ssVests/queries";

const CANTO_OPTION_TOKEN = "0x9f9A1Aa08910867F38359F4287865c4A1162C202";

export const getRewardBalances = async (
  address: Address | undefined,
  tokenID: string | undefined,
  govToken: GovToken | undefined,
  veToken: VeToken | undefined,
  vestNfts: string,
  pairs: Pair[] | undefined
) => {
  if (!address) {
    console.warn("account not found");
    throw new Error("No address");
  }

  if (!govToken || !veToken) {
    throw new Error("govToken or veToken not found");
  }

  if (!pairs) {
    throw new Error("pairs not found");
  }

  const gauges = pairs.filter(hasGauge);

  if (typeof window.structuredClone === "undefined") {
    throw new Error(
      "Your browser does not support structuredClone. Please use a different browser."
    );
  }

  const x_filteredPairs = structuredClone(gauges);
  const xx_filteredPairs = structuredClone(gauges);
  const filteredPairs2 = structuredClone(gauges);
  const filteredPairs3 = structuredClone(gauges);

  let veDistReward: VeDistReward[] = [];
  let x_filteredBribes: Gauge[] = []; // Pair with gauge rewardType set to "XBribe"
  let xx_filteredBribes: Gauge[] = []; // Pair with gauge rewardType set to "XBribe"

  if (tokenID && tokenID !== "0") {
    const x_calls = x_filteredPairs.flatMap((pair) =>
      pair.gauge.x_bribes.map(
        (bribe) =>
          ({
            address: pair.gauge.x_wrapped_bribe_address,
            abi: CONTRACTS.BRIBE_ABI,
            functionName: "earned",
            args: [bribe.token.address, BigInt(tokenID)],
          } as const)
      )
    );
    const x_callsChunks = chunkArray(x_calls, 100);

    const x_earnedBribesAllPairs = await multicallChunks(x_callsChunks);

    const xx_calls = x_filteredPairs.flatMap((pair) =>
      pair.gauge.xx_bribes.map(
        (bribe) =>
          ({
            address: pair.gauge.xx_wrapped_bribe_address,
            abi: CONTRACTS.BRIBE_ABI,
            functionName: "earned",
            args: [bribe.token.address, BigInt(tokenID)],
          } as const)
      )
    );
    const xx_callsChunks = chunkArray(xx_calls, 100);

    const xx_earnedBribesAllPairs = await multicallChunks(xx_callsChunks);

    x_filteredPairs.forEach((pair) => {
      const x_earnedBribesPair = x_earnedBribesAllPairs.splice(
        0,
        pair.gauge.x_bribes.length
      );
      pair.gauge.x_bribesEarned = pair.gauge.x_bribes.map((bribe, i) => {
        return {
          ...bribe,
          earned: formatUnits(
            x_earnedBribesPair[i],
            bribe.token.decimals
          ) as `${number}`,
        };
      });
    });

    xx_filteredPairs.forEach((pair) => {
      const xx_earnedBribesPair = xx_earnedBribesAllPairs.splice(
        0,
        pair.gauge.xx_bribes.length
      );
      pair.gauge.xx_bribesEarned = pair.gauge.xx_bribes.map((bribe, i) => {
        return {
          ...bribe,
          earned: formatUnits(
            xx_earnedBribesPair[i],
            bribe.token.decimals
          ) as `${number}`,
        };
      });
    });

    x_filteredBribes = x_filteredPairs
      .filter((pair) => {
        if (pair.gauge.x_bribesEarned && pair.gauge.x_bribesEarned.length > 0) {
          let shouldReturn = false;

          for (let i = 0; i < pair.gauge.x_bribesEarned.length; i++) {
            if (
              pair.gauge.x_bribesEarned[i].earned &&
              parseUnits(
                pair.gauge.x_bribesEarned[i].earned as `${number}`,
                pair.gauge.x_bribes[i].token.decimals
              ) > 0
            ) {
              shouldReturn = true;
            }
          }

          return shouldReturn;
        }

        return false;
      })
      .map((pair) => {
        pair.rewardType = "XBribe";
        return pair;
      });

    xx_filteredBribes = xx_filteredPairs
      .filter((pair) => {
        if (
          pair.gauge.xx_bribesEarned &&
          pair.gauge.xx_bribesEarned.length > 0
        ) {
          let shouldReturn = false;

          for (let i = 0; i < pair.gauge.xx_bribesEarned.length; i++) {
            if (
              pair.gauge.xx_bribesEarned[i].earned &&
              parseUnits(
                pair.gauge.xx_bribesEarned[i].earned as `${number}`,
                pair.gauge.xx_bribes[i].token.decimals
              ) > 0
            ) {
              shouldReturn = true;
            }
          }

          return shouldReturn;
        }

        return false;
      })
      .map((pair) => {
        pair.rewardType = "XXBribe";
        return pair;
      });

    const veDistEarned = await viemClient.readContract({
      address: CONTRACTS.VE_DIST_ADDRESS,
      abi: CONTRACTS.VE_DIST_ABI,
      functionName: "claimable",
      args: [BigInt(tokenID)],
    });

    const vestNFTs = deserialize(vestNfts) as VestNFT[] | undefined;

    const theNFT = vestNFTs?.filter((vestNFT) => {
      return vestNFT.id === tokenID;
    });

    if (veDistEarned > 0) {
      veDistReward.push({
        // FIXME
        // @ts-ignore
        token: theNFT[0],
        lockToken: veToken,
        rewardToken: govToken,
        earned: formatUnits(veDistEarned, govToken.decimals),
        rewardType: "Distribution",
      });
    }
  }

  const rewardsCalls = filteredPairs2.map((pair) => {
    return {
      address: pair.gauge.address,
      abi: CONTRACTS.GAUGE_ABI,
      functionName: "earned",
      args: [CONTRACTS.GOV_TOKEN_ADDRESS, address],
    } as const;
  });

  const oBlotrRewardsCalls = filteredPairs2.map((pair) => {
    return {
      address: pair.gauge.address,
      abi: CONTRACTS.GAUGE_ABI,
      functionName: "earned",
      args: [CANTO_OPTION_TOKEN, address],
    } as const;
  });

  const rewardsEarnedCallResult = await viemClient.multicall({
    allowFailure: false,
    multicallAddress: CONTRACTS.MULTICALL_ADDRESS,
    contracts: rewardsCalls,
  });

  const oBlotrRewardsEarnedCallResult = await viemClient.multicall({
    allowFailure: false,
    multicallAddress: CONTRACTS.MULTICALL_ADDRESS,
    contracts: oBlotrRewardsCalls,
  });

  const rewardsEarned = [...filteredPairs2];

  const oBlotrRewardsEarned = [...filteredPairs3];

  for (let i = 0; i < rewardsEarned.length; i++) {
    rewardsEarned[i].gauge.rewardsEarned = formatEther(
      rewardsEarnedCallResult[i]
    );
  }

  for (let i = 0; i < oBlotrRewardsEarned.length; i++) {
    oBlotrRewardsEarned[i].gauge.BLOTR_rewardsEarned = formatEther(
      oBlotrRewardsEarnedCallResult[i]
    );
  }

  const filteredRewards: Gauge[] = []; // Pair with rewardType set to "Reward"
  const oBlotrFilteredRewards: Gauge[] = []; // Pair with rewardType set to "oBLOTR_Reward"

  for (let j = 0; j < rewardsEarned.length; j++) {
    let pair = Object.assign({}, rewardsEarned[j]);
    if (
      pair.gauge &&
      pair.gauge.rewardsEarned &&
      parseEther(pair.gauge.rewardsEarned as `${number}`) > 0
    ) {
      pair.rewardType = "Reward";
      filteredRewards.push(pair);
    }
  }

  for (let j = 0; j < oBlotrRewardsEarned.length; j++) {
    let pair = Object.assign({}, oBlotrRewardsEarned[j]);
    if (
      pair.gauge &&
      pair.gauge.BLOTR_rewardsEarned &&
      parseEther(pair.gauge.BLOTR_rewardsEarned as `${number}`) > 0
    ) {
      pair.rewardType = "oBLOTR_Reward";
      oBlotrFilteredRewards.push(pair);
    }
  }

  const rewards: {
    xBribes: Gauge[];
    xxBribes: Gauge[];
    rewards: Gauge[];
    oBlotrRewards: Gauge[];
    veDist: VeDistReward[];
  } = {
    xBribes: x_filteredBribes,
    xxBribes: xx_filteredBribes,
    rewards: filteredRewards,
    oBlotrRewards: oBlotrFilteredRewards,
    veDist: veDistReward,
  };

  return rewards;
};

export const useRewards = (
  tokenID: string | undefined,
  onSuccess:
    | ((
        _data:
          | {
              xBribes: Gauge[];
              xxBribes: Gauge[];
              rewards: Gauge[];
              oBlotrRewards: Gauge[];
              veDist: VeDistReward[];
            }
          | undefined
      ) => void)
    | undefined
) => {
  const { address } = useAccount();
  const { data: veToken } = useVeToken();
  const { data: govToken } = useGovToken();
  const { data: vestNFTs } = useVestNfts();
  const { data: pairs } = usePairs();
  const serialised_vestNFTs = serialize(vestNFTs);
  return useQuery({
    queryKey: [
      QUERY_KEYS.REWARDS,
      address,
      tokenID,
      govToken,
      veToken,
      serialised_vestNFTs,
      pairs,
    ],
    queryFn: () =>
      getRewardBalances(
        address,
        tokenID,
        govToken,
        veToken,
        serialised_vestNFTs,
        pairs
      ),
    enabled: !!address && !!govToken && !!veToken && !!pairs,
    onSuccess,
    refetchOnWindowFocus: false,
    onError: (e) => {
      stores.emitter.emit(ACTIONS.ERROR, e);
    },
  });
};