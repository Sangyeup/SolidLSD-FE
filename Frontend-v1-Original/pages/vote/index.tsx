import { useAccount } from "wagmi";
import { Typography, Paper } from "@mui/material";

import Gauges from "../../components/ssVotes/ssVotes";

function Vote() {
  const { address } = useAccount();

  return (
    <div className="relative mt-0 flex h-full w-full flex-col pt-8">
      {address ? (
        <div>
          <Gauges />
        </div>
      ) : (
        <Paper className="fixed top-0 flex h-[calc(100%-150px)] w-[calc(100%-80px)] flex-col flex-wrap items-center justify-center bg-[rgba(17,23,41,0.2)] p-12 text-center shadow-none max-lg:my-auto max-lg:mt-24 max-lg:mb-0 lg:h-[100vh] lg:w-full">
          <div className="relative z-10">
            <Typography
              className="text-center font-['Monument'] text-2xl font-thin text-white sm:text-3xl"
              variant="h1"
            >
              Vote
            </Typography>
            <Typography
              className="color-[#7e99b0] my-7 mx-auto max-w-3xl text-center text-base sm:text-lg"
              variant="body2"
            >
              Use your veFlow to vote for your selected liquidity pair&apos;s
              rewards distribution or create a bribe to encourage others to do
              the same.
            </Typography>
          </div>
        </Paper>
      )}
    </div>
  );
}

export default Vote;
