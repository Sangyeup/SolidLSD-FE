import React from "react";
import { Close } from "@mui/icons-material";
import { useAccount, useConnect } from "wagmi";
import { canto } from "viem/chains";

const Unlock = ({ closeModal }: { closeModal: () => void }) => {
  return (
    <div className="relative flex h-auto flex-[1]">
      <div
        className="absolute -right-2 -top-2 cursor-pointer"
        onClick={closeModal}
      >
        <Close />
      </div>
      <div className="m-auto flex w-full flex-wrap p-2 pt-40 text-center lg:pt-3">
        <Connectors closeModal={closeModal} />
      </div>
    </div>
  );
};

function Connectors({ closeModal }: { closeModal: () => void }) {
  const width = window.innerWidth;
  const { connector, isReconnecting, address } = useAccount();
  const { connect, connectors, isLoading, pendingConnector } = useConnect({
    chainId: canto.id,
    onSuccess: closeModal,
  });
  return (
    <div
      className={`flex w-full flex-col items-center gap-4 ${
        width > 576 ? "justify-between" : "justify-center"
      }`}
    >
      {address && <>Connected account: {address}</>}
      <div className="flex w-full flex-wrap items-center justify-center gap-4">
        {connectors.map((x) => (
          <button
            disabled={!x.ready || isReconnecting || connector?.id === x.id}
            key={x.name}
            onClick={() => connect({ connector: x })}
            className="rounded-md bg-[#272826] p-3 font-bold shadow-glow transition-colors hover:bg-green-900 disabled:pointer-events-none disabled:bg-slate-400 disabled:shadow-none"
          >
            {x.name}
            {!x.ready && " (unsupported)"}
            {isLoading && x.id === pendingConnector?.id && "…"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Unlock;

/* // if (name === "MetaMask") {
  //   url = "/connectors/icn-metamask.svg";
  //   descriptor = "Connect to your MetaMask wallet";
  // } else if (name === "WalletConnect") {
  //   url = "/connectors/walletConnectIcon.svg";
  //   descriptor = "Scan with WalletConnect to connect";
  // } else if (name === "TrustWallet") {
  //   url = "/connectors/trustWallet.png";
  //   descriptor = "Connect to your TrustWallet";
  // } else if (name === "Portis") {
  //   url = "/connectors/portisIcon.png";
  //   descriptor = "Connect with your Portis account";
  // } else if (name === "Fortmatic") {
  //   url = "/connectors/fortmaticIcon.png";
  //   descriptor = "Connect with your Fortmatic account";
  // } else if (name === "Ledger") {
  //   url = "/connectors/icn-ledger.svg";
  //   descriptor = "Connect with your Ledger Device";
  // } else if (name === "Squarelink") {
  //   url = "/connectors/squarelink.png";
  //   descriptor = "Connect with your Squarelink account";
  // } else if (name === "Trezor") {
  //   url = "/connectors/trezor.png";
  //   descriptor = "Connect with your Trezor Device";
  // } else if (name === "Torus") {
  //   url = "/connectors/torus.jpg";
  //   descriptor = "Connect with your Torus account";
  // } else if (name === "Authereum") {
  //   url = "/connectors/icn-aethereum.svg";
  //   descriptor = "Connect with your Authereum account";
  // } else if (name === "WalletLink") {
  //   display = "Coinbase Wallet";
  //   url = "/connectors/coinbaseWalletIcon.svg";
  //   descriptor = "Connect to your Coinbase wallet";
  // } else if (name === "Frame") {
  //   return "";
  // } */
