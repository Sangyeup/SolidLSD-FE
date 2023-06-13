import BigNumber from "bignumber.js";

import * as contractsTestnet from "./contractsGoerli";
import * as contractsCanto from "./contractsCanto";
import * as contracts from "./contracts";
import * as actions from "./actions";

let network: "5";
network = "5";

const config = {
  "5": {
    scan: "https://goerli.etherscan.io/",
    contracts: contractsTestnet,
    nativeETH: {
      address: contractsTestnet.ETH_ADDRESS,
      decimals: contractsTestnet.ETH_DECIMALS,
      logoURI: contractsTestnet.ETH_LOGO,
      name: contractsTestnet.ETH_NAME,
      symbol: contractsTestnet.ETH_SYMBOL,
      chainId: 5,
    },
    wNativeAddress: contractsTestnet.WETH_ADDRESS,
    wNativeABI: contractsTestnet.WETH_ABI,
  },
};

export const ETHERSCAN_URL = config[network].scan;

export const CONTRACTS = config[network].contracts;
export const ACTIONS = actions;

export const MAX_UINT256 = new BigNumber(2).pow(256).minus(1).toFixed(0);
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const NATIVE_TOKEN = config[network].nativeETH;
export const W_NATIVE_ADDRESS = config[network].wNativeAddress;
export const W_NATIVE_ABI = config[network].wNativeABI;

export const PAIR_DECIMALS = 18;
