import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: "0.8.37",
  networks: { hardhat: { type: "edr-simulated", chainType: "l1" } },
});
