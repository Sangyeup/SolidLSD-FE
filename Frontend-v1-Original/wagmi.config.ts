import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import { erc20ABI } from "wagmi";

import { airdropClaimABI, oFlowABI } from "./stores/abis/abis";

export default defineConfig({
  out: "components/oFlow/lib/wagmiGen.ts",
  contracts: [
    {
      name: "WPLS",
      abi: erc20ABI,
      address: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    },
    {
      name: "oFLOW",
      abi: oFlowABI,
      address: "0x1Fc0A9f06B6E85F023944e74F70693Ac03fDC621",
    },
    {
      name: "AirdropClaim",
      abi: airdropClaimABI,
      address: "0x3339ab188839C31a9763352A5a0B7Fb05876BC44",
    },
  ],
  plugins: [react()],
});