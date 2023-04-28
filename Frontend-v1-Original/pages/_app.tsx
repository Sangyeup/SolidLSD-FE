import { useState, useEffect } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import { WagmiConfig } from "wagmi";

// import lightTheme from "../theme/light";
import darkTheme from "../theme/dark";
import Layout from "../components/layout/layout";
import stores from "../stores/index";
import { wagmiClient } from "../stores/connectors/viem";
import { ACTIONS } from "../stores/constants/constants";
import createEmotionCache from "../utils/createEmotionCache";

import Configure from "./configure";

import "../styles/global.css";

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

console.log("<<<<<<<<<<<<< flow >>>>>>>>>>>>>");

export default function MyApp({
  Component,
  emotionCache = clientSideEmotionCache,
  pageProps,
}: MyAppProps) {
  const [themeConfig] = useState(darkTheme);
  const [accountConfigured, setAccountConfigured] = useState(false);

  const accountConfigureReturned = () => {
    setAccountConfigured(true);
  };

  useEffect(function () {
    stores.emitter.on(ACTIONS.ACCOUNT_CONFIGURED, accountConfigureReturned);

    stores.dispatcher.dispatch({ type: ACTIONS.CONFIGURE });

    return () => {
      stores.emitter.removeListener(
        ACTIONS.ACCOUNT_CONFIGURED,
        accountConfigureReturned
      );
    };
  }, []);

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>Velocimeter</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </Head>
      <ThemeProvider theme={themeConfig}>
        <WagmiConfig client={wagmiClient}>
          {accountConfigured ? (
            <Layout>
              <Component {...pageProps} />
            </Layout>
          ) : (
            <Configure {...pageProps} />
          )}
        </WagmiConfig>
      </ThemeProvider>
    </CacheProvider>
  );
}
