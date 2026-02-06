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
  const stakeAccount = Keypair.generate();

  const tx = new Transaction();

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

  return {
    tx,
    stakeAccount,
  };
}
