import BigNumber from "bignumber.js";
import type { NextApiRequest, NextApiResponse } from "next";
import { NATIVE_TOKEN } from "../../stores/constants/constants";
import { QuoteSwapPayload, QuoteSwapResponse } from "../../stores/types/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    payload: {
      content: { fromAsset, toAsset, fromAmount, slippage },
    },
    address,
  }: QuoteSwapPayload = JSON.parse(req.body);

  const sendFromAmount = BigNumber(fromAmount)
    .times(10 ** fromAsset.decimals)
    .toFixed();

  if (fromAsset.address === NATIVE_TOKEN.address) {
    fromAsset.address = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  }
  if (toAsset.address === NATIVE_TOKEN.address) {
    toAsset.address = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  }

  try {
    const data = await fetch(
      `https://router.firebird.finance/aggregator/v1/route?chainId=7700&from=${fromAsset.address}&to=${toAsset.address}&amount=${sendFromAmount}&slippage=${slippage}&receiver=${address}&source=velocimeter&dexes=velocimeterv1,velocimeterv2`,
      {
        method: "GET",
        headers: {
          "API-KEY": process.env.FIREBIRD_API_KEY!,
        },
      }
    );

    const resJson = (await data.json()) as QuoteSwapResponse;
    res.status(200).json(resJson);
  } catch (e) {
    res.status(400);
  }
}