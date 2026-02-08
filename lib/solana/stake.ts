import {
  StakeProgram,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
} from "@solana/web3.js";

import { connection } from "./connection";

export async function createStakeTx(userPubkey: PublicKey, amount: number) {
  if (!userPubkey) {
    throw new Error("User public key is required");
  }
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const stakeAccount = Keypair.generate();

  const tx = new Transaction();

  try {
    // Create stake account
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: userPubkey,
        newAccountPubkey: stakeAccount.publicKey,
        lamports: amount * LAMPORTS_PER_SOL,
        space: StakeProgram.space,
        programId: StakeProgram.programId,
      }),
    );

    // Initialize
    tx.add(
      StakeProgram.initialize({
        stakePubkey: stakeAccount.publicKey,
        authorized: {
          staker: userPubkey,
          withdrawer: userPubkey,
        },
        lockup: {
          epoch: 0,
          custodian: userPubkey,
          unixTimestamp: 0,
        },
      }),
    );
  } catch (error) {
    throw new Error(
      `Failed to create stake transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return {
    tx,
    stakeAccount,
  };
}
