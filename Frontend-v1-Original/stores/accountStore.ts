import { Multicall as Multicall3 } from "ethereum-multicall";
import Multicall from "@dopex-io/web3-multicall";

import { Dispatcher } from "flux";
import EventEmitter from "events";

import { ACTIONS, CONTRACTS } from "./constants/constants";

import {
  injected,
  walletconnect,
  walletlink,
  network,
} from "./connectors/connectors";

import Web3 from "web3";

type EthWindow = Window &
  typeof globalThis & {
    ethereum?: any;
  };

class Store {
  dispatcher: Dispatcher<any>;
  emitter: EventEmitter;
  store: {
    account: null | { address: string };
    chainInvalid: boolean;
    web3context: null | { library: { provider: any } };
    tokens: any[];
    connectorsByName: {
      MetaMask: typeof injected;
      TrustWallet: typeof injected;
      WalletConnect: typeof walletconnect;
      WalletLink: typeof walletlink;
    };
    currentBlock: number;
    gasPrices: {
      standard: number;
      fast: number;
      instant: number;
    };
    gasSpeed: string;
  };

  constructor(dispatcher: Dispatcher<any>, emitter: EventEmitter) {
    this.dispatcher = dispatcher;
    this.emitter = emitter;

    this.store = {
      account: null,
      chainInvalid: false,
      web3context: null,
      tokens: [],
      connectorsByName: {
        MetaMask: injected,
        TrustWallet: injected,
        WalletConnect: walletconnect,
        WalletLink: walletlink,
      },
      currentBlock: 12906197,
      gasPrices: {
        standard: 90,
        fast: 100,
        instant: 130,
      },
      gasSpeed: "fast",
    };

    dispatcher.register(
      function (this: Store, payload) {
        switch (payload.type) {
          case ACTIONS.CONFIGURE:
            this.configure();
            break;
          default: {
          }
        }
      }.bind(this)
    );
  }

  getStore = <K extends keyof Store["store"]>(index: K) => {
    return this.store[index];
  };

  setStore(obj: { [key: string]: any }) {
    this.store = { ...this.store, ...obj };
    return this.emitter.emit(ACTIONS.STORE_UPDATED);
  }

  configure = async () => {
    // this.getGasPrices();
    injected.isAuthorized().then((isAuthorized) => {
      const { supportedChainIds } = injected;

      // fall back to canto mainnet if chainId undefined
      const { chainId = process.env.NEXT_PUBLIC_CHAINID } =
        (window as EthWindow).ethereum || {};
      const parsedChainId = parseInt(chainId, 16);
      const isChainSupported = supportedChainIds.includes(parsedChainId);

      if (!isChainSupported) {
        this.setStore({ chainInvalid: true });
        this.emitter.emit(ACTIONS.ACCOUNT_CHANGED);
      }

      if (isAuthorized && isChainSupported) {
        injected
          .activate()
          .then((a) => {
            this.setStore({
              account: { address: a.account },
              web3context: { library: { provider: a.provider } },
            });
            this.emitter.emit(ACTIONS.ACCOUNT_CONFIGURED);
          })
          .then(() => {
            this.dispatcher.dispatch({
              type: ACTIONS.CONFIGURE_SS,
              content: { connected: true },
            });
          })
          .catch((e) => {
            this.emitter.emit(ACTIONS.ERROR, e);
            this.emitter.emit(ACTIONS.ACCOUNT_CONFIGURED);

            this.dispatcher.dispatch({
              type: ACTIONS.CONFIGURE_SS,
              content: { connected: false },
            });
          });
      } else {
        //we can ignore if not authorized.
        this.emitter.emit(ACTIONS.ACCOUNT_CONFIGURED);
        this.emitter.emit(ACTIONS.CONFIGURE_RETURNED);
      }
    });

    if ((window as EthWindow).ethereum) {
      this.updateAccount();
    } else {
      window.removeEventListener("ethereum#initialized", this.updateAccount);
      window.addEventListener("ethereum#initialized", this.updateAccount, {
        once: true,
      });
    }
  };

  updateAccount = () => {
    const that = this;
    const res = (window as EthWindow).ethereum.on(
      "accountsChanged",
      function (accounts) {
        that.setStore({
          account: { address: accounts[0] },
          web3context: {
            library: { provider: (window as EthWindow).ethereum },
          },
        });
        that.emitter.emit(ACTIONS.ACCOUNT_CHANGED);
        that.emitter.emit(ACTIONS.ACCOUNT_CONFIGURED);

        that.dispatcher.dispatch({
          type: ACTIONS.CONFIGURE_SS,
          content: { connected: true },
        });
      }
    );

    (window as EthWindow).ethereum.on("chainChanged", function (chainId) {
      const supportedChainIds = [process.env.NEXT_PUBLIC_CHAINID];
      const parsedChainId = parseInt(chainId + "", 16) + "";
      const isChainSupported = supportedChainIds.includes(parsedChainId);
      that.setStore({ chainInvalid: !isChainSupported });
      that.emitter.emit(ACTIONS.ACCOUNT_CHANGED);
      that.emitter.emit(ACTIONS.ACCOUNT_CONFIGURED);

      that.configure();
    });
  };

  // getGasPrices = async (payload) => {
  //   const gasPrices = await this._getGasPrices();
  //   let gasSpeed = localStorage.getItem("yearn.finance-gas-speed");

  //   if (!gasSpeed) {
  //     gasSpeed = "fast";
  //     localStorage.setItem("yearn.finance-gas-speed", "fast");
  //   }

  //   this.setStore({ gasPrices: gasPrices, gasSpeed: gasSpeed });
  //   this.emitter.emit(ACTIONS.GAS_PRICES_RETURNED);
  // };

  // _getGasPrices = async () => {
  //   try {
  //     const web3 = await this.getWeb3Provider();
  //     const gasPrice = await web3.eth.getGasPrice();
  //     const gasPriceInGwei = web3.utils.fromWei(gasPrice, "gwei");
  //     return {
  //       standard: gasPriceInGwei,
  //       fast: gasPriceInGwei,
  //       instant: gasPriceInGwei,
  //     };
  //   } catch (e) {
  //     console.log(e);
  //     return {};
  //   }
  // };

  /**
   * @returns gas price in gwei
   */
  getGasPrice = async (): Promise<string | null> => {
    try {
      const web3 = await this.getWeb3Provider();
      const gasPrice = await web3.eth.getGasPrice();
      const gasPriceInGwei = web3.utils.fromWei(gasPrice, "gwei");
      return gasPriceInGwei;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  getWeb3Provider = async () => {
    let web3context = this.getStore("web3context");
    let provider = null;

    if (!web3context) {
      provider = network.getProvider();
    } else {
      provider = web3context.library.provider;
    }

    if (!provider) {
      return null;
    }
    return new Web3(provider);
  };

  getMulticall = async () => {
    const web3 = await this.getWeb3Provider();
    const multicall = new Multicall({
      multicallAddress: CONTRACTS.MULTICALL_ADDRESS,
      provider: web3.currentProvider,
    });
    return multicall;
  };

  getMulticall3 = async (tryAggregate: boolean) => {
    const web3 = await this.getWeb3Provider();
    const multicall = new Multicall3({
      web3Instance: web3,
      tryAggregate,
      multicallCustomContractAddress:
        "0xcA11bde05977b3631167028862bE2a173976CA11",
    });
    return multicall;
  };

  getGasPriceEIP1559 = async () => {
    const web3 = await this.getWeb3Provider();
    const blocksBack = 10;
    const feeHistory = await web3.eth.getFeeHistory(blocksBack, "pending", [
      10,
    ]);
    const blocks = this._formatFeeHistory(feeHistory, false, blocksBack);

    const firstPercentialPriorityFees = blocks.map(
      (b) => b.priorityFeePerGas[0]
    );
    const sum = firstPercentialPriorityFees.reduce((a, v) => a + v);
    const priorityFeePerGasEstimate = Math.round(
      sum / firstPercentialPriorityFees.length
    );
    let priorityFee = priorityFeePerGasEstimate;
    if (priorityFee === 0) {
      priorityFee = 100_000_000;
    }
    const block = await web3.eth.getBlock("pending");
    return [Number(block.baseFeePerGas) + priorityFee, priorityFee];
  };

  _formatFeeHistory(
    result: Awaited<ReturnType<Web3["eth"]["getFeeHistory"]>>,
    includePending: boolean,
    historicalBlocks: number
  ) {
    let blockNum = result.oldestBlock;
    let index = 0;
    const blocks: {
      number: number | "pending";
      baseFeePerGas: number;
      gasUsedRatio: number;
      priorityFeePerGas: number[];
    }[] = [];
    while (blockNum < result.oldestBlock + historicalBlocks) {
      blocks.push({
        number: blockNum,
        baseFeePerGas: Number(result.baseFeePerGas[index]),
        gasUsedRatio: Number(result.gasUsedRatio[index]),
        priorityFeePerGas: result.reward[index].map((x) => Number(x)),
      });
      blockNum += 1;
      index += 1;
    }
    if (includePending) {
      blocks.push({
        number: "pending",
        baseFeePerGas: Number(result.baseFeePerGas[historicalBlocks]),
        gasUsedRatio: NaN,
        priorityFeePerGas: [],
      });
    }
    return blocks;
  }
}

export default Store;
