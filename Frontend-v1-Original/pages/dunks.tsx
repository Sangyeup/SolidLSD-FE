import { useState } from "react";
import { pulsechain } from "viem/chains";
import { useAccount, useContractWrite, usePrepareContractWrite } from "wagmi";
import { isAddress } from "viem";

import { mintTankABI } from "../stores/abis/mintTankABI";
import {
  useAirdropClaimSetOwner,
  usePrepareAirdropClaimSetOwner,
} from "../components/oFlow/lib/wagmiGen";
import { fairAuctionABI } from "../stores/abis/fairAuctionABI";

export default function Dunks() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [d, setD] = useState("");

  const { address } = useAccount();

  const { config } = usePrepareContractWrite({
    chainId: pulsechain.id,
    account: address,
    address: "0xbB7bbd0496c23B7704213D6dbbe5C39eF8584E45",
    abi: mintTankABI,
    functionName: "mintFor",
    args: [BigInt(a), BigInt(b), c as `0x${string}`],
    enabled: a !== "" && b !== "" && c !== "" && isAddress(c),
  });
  const { write } = useContractWrite(config);

  const { config: tokensBackConfig } = usePrepareContractWrite({
    chainId: pulsechain.id,
    address: "0x54Ea937e12a4011d69FE1200DFBfF36d0E7A4C64",
    abi: fairAuctionABI,
    functionName: "returnUnsoldTokens",
  });
  const { write: returnUnsoldTokens } = useContractWrite(tokensBackConfig);

  const { config: setOwnerConfig } = usePrepareAirdropClaimSetOwner({
    chainId: pulsechain.id,
    args: [d as `0x${string}`],
    enabled: isAddress(d),
  });
  const { write: setOwner } = useAirdropClaimSetOwner(setOwnerConfig);
  return (
    <div className="flex max-w-lg flex-col items-center justify-center gap-5">
      <input
        className="w-full border border-cantoGreen bg-transparent p-4 text-left text-base focus:outline focus:outline-1 focus:outline-secondary focus-visible:outline-secondary"
        value={a}
        onChange={(e) => setA(e.target.value)}
      />
      <input
        className="w-full border border-cantoGreen bg-transparent p-4 text-left text-base focus:outline focus:outline-1 focus:outline-secondary focus-visible:outline-secondary"
        value={b}
        onChange={(e) => setB(e.target.value)}
      />
      <input
        className="w-full border border-cantoGreen bg-transparent p-4 text-left text-base focus:outline focus:outline-1 focus:outline-secondary focus-visible:outline-secondary"
        value={c}
        onChange={(e) => setC(e.target.value)}
      />
      <button onClick={() => write?.()}>Click</button>
      <input
        className="w-full border border-cantoGreen bg-transparent p-4 text-left text-base focus:outline focus:outline-1 focus:outline-secondary focus-visible:outline-secondary"
        value={d}
        onChange={(e) => setD(e.target.value)}
      />
      <button onClick={() => setOwner?.()}>Set owner</button>
      <button onClick={() => returnUnsoldTokens?.()}>Return tokens</button>
    </div>
  );
}
