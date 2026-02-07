import { PublicKey, StakeProgram, Transaction } from "@solana/web3.js";

export async function createDelegateTx(
  stakeAccount: PublicKey,
  user: PublicKey,
  validatorVote: PublicKey,
) {
  const tx = new Transaction();

  tx.add(
    StakeProgram.delegate({
      stakePubkey: stakeAccount,
      authorizedPubkey: user,
      votePubkey: validatorVote,
    }),
  );

  return tx;
}
