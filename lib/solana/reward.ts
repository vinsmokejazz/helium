import { PublicKey } from "@solana/web3.js";
import { connection } from "./connection";

//Get Total LST Supply
export async function getTotalLSTSupply(mint: PublicKey) {
  const supply = await connection.getTokenSupply(mint);

  return Number(supply.value.amount);
}

// Get Stake Balance
export async function getStakeBalance(stakePubKey: PublicKey) {
  const info = await connection.getParsedAccountInfo(stakePubKey);

  if (!info.value) return 0;

  const data: any = info.value.data;
  return data.parsed.info.stake.delegation.stake;
}

// Get Total Staked SOL (All Accounts)
export async function getTotalStakedSOL(stakeAccounts: PublicKey[]) {
  let total = 0;
  for (const acc of stakeAccounts) {
    total += await getStakeBalance(acc);
  }

  return total;
}

// Calculate Exchange Rate
export async function getExchangeRate(
  mint: PublicKey,
  stakeAccounts: PublicKey[],
) {
  const totalSOL = await getTotalStakedSOL(stakeAccounts);

  const supply = await getTotalLSTSupply(mint);
  return totalSOL / supply;
}
