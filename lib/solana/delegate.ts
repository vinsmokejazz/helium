import { PublicKey, StakeProgram, Transaction } from "@solana/web3.js";

export async function createDelegateTx(
  stakeAccount: PublicKey,
  user: PublicKey,
  validatorVote: PublicKey,
) {
  if (!stakeAccount || !user || !validatorVote) {
    throw new Error(
      "Stake account, user, and validator vote public keys are required",
    );
  }

  const tx = new Transaction();

  try {
    tx.add(
      StakeProgram.delegate({
        stakePubkey: stakeAccount,
        authorizedPubkey: user,
        votePubkey: validatorVote,
      }),
    );
  } catch (error) {
    throw new Error(
      `Failed to create delegate transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return tx;
}
