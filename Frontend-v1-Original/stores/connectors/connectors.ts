import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { WalletLinkConnector } from "@web3-react/walletlink-connector";
import { NetworkConnector } from "@web3-react/network-connector";

const chainId = process.env.NEXT_PUBLIC_CHAINID ?? "7700";

const POLLING_INTERVAL = 12000;
const RPC_URLS: {
  [chainId: string]: string;
} = {
  740: "https://eth.plexnode.wtf/",
  7700: "https://d43d-219-73-56-235.ngrok.io/", //TODO set it to new node
  31337: "https://d43d-219-73-56-235.ngrok.io/", //TODO set it to new node
};

let obj: {
  [key: string]: string;
} = {
  7700: RPC_URLS[7700],
};

if (process.env.NEXT_PUBLIC_CHAINID === "740") {
  obj = { 740: RPC_URLS[740] };
}

export const network = new NetworkConnector({ urls: obj });

export const injected = new InjectedConnector({
  supportedChainIds: [parseInt(chainId)],
});

export const walletconnect = new WalletConnectConnector({
  rpc: obj,
  chainId: parseInt(chainId),
  bridge: "https://bridge.walletconnect.org",
  qrcode: true,
});

export const walletlink = new WalletLinkConnector({
  url: RPC_URLS[chainId],
  appName: "Velocimeter",
  supportedChainIds: [parseInt(chainId)],
});
