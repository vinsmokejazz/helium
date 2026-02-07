import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { connection } from "./connection";

export async function createLSTMint(payer: any) {
  return await createMint(
    connection,
    payer, // pays fee
    payer.publicKey, // mint authority
    null, // freeze auth
    9, // decimals
  );
}
