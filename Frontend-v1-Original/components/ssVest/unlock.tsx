import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Paper,
  Typography,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

import stores from "../../stores";
import { ACTIONS } from "../../stores/constants";
import { GovToken, VestNFT, VeToken } from "../../stores/types/types";

import VestingInfo from "./vestingInfo";
import classes from "./ssVest.module.css";

export default function Unlock({
  nft,
  govToken,
  veToken,
}: {
  nft: VestNFT;
  govToken: GovToken | null;
  veToken: VeToken | null;
}) {
  const router = useRouter();

  const [lockLoading, setLockLoading] = useState(false);

  useEffect(() => {
    const lockReturned = () => {
      setLockLoading(false);
      router.push("/vest");
    };
    const errorReturned = () => {
      setLockLoading(false);
    };

    stores.emitter.on(ACTIONS.ERROR, errorReturned);
    stores.emitter.on(ACTIONS.WITHDRAW_VEST_RETURNED, lockReturned);
    return () => {
      stores.emitter.removeListener(ACTIONS.ERROR, errorReturned);
      stores.emitter.removeListener(
        ACTIONS.WITHDRAW_VEST_RETURNED,
        lockReturned
      );
    };
  }, [router]);

  const onWithdraw = () => {
    setLockLoading(true);
    stores.dispatcher.dispatch({
      type: ACTIONS.WITHDRAW_VEST,
      content: { tokenID: nft.id },
    });
  };

  const onBack = () => {
    router.push("/vest");
  };

  return (
    <Paper elevation={0} className={classes.container2}>
      <div className={classes.titleSection}>
        <IconButton className={classes.backButton} onClick={onBack}>
          <ArrowBack className={classes.backIcon} />
        </IconButton>
        <Typography className={classes.titleText}>
          Manage Existing Lock
        </Typography>
      </div>
      <VestingInfo currentNFT={nft} veToken={veToken} govToken={govToken} />
      <div className={classes.contentBox}>
        <Typography className={classes.para}>
          Your lock has expired. Please withdraw your lock before you can
          re-lock.
        </Typography>
      </div>
      <div className={classes.actionsContainer}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          color="primary"
          disabled={lockLoading}
          onClick={onWithdraw}
          className={classes.buttonOverride}
        >
          <Typography className={classes.actionButtonText}>
            {lockLoading ? `Withrawing` : `Withdraw`}
          </Typography>
          {lockLoading && (
            <CircularProgress size={10} className={classes.loadingCircle} />
          )}
        </Button>
      </div>
    </Paper>
  );
}
