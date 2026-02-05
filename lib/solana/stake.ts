import {
  Keypair,
  LAMPORTS_PER_SOL,
  StakeProgram,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { connection } from "./connection";

export async function stakeSOL(wallet: Keypair, amount: number) {
  const stakeAccount = Keypair.generate();

  const tx = new Transaction();

  tx.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: stakeAccount.publicKey,
      lamports: amount * LAMPORTS_PER_SOL,
      space: StakeProgram.space,
      programId: StakeProgram.programId,
    }),
  );
}
