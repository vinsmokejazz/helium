import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { connection } from "./connection";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";

// create LST mint transaction
export async function createLSTMint(payer: PublicKey) {
  if (!payer) {
    throw new Error("Payer public key is required");
  }

  const mint = Keypair.generate();
  const tx = new Transaction();

  try {
    const rentExemption =
      await connection.getMinimumBalanceForRentExemption(82);
    // Create mint account
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint.publicKey,
        lamports: rentExemption, // Mint account size
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    // Initialize mint
    tx.add(
      createInitializeMintInstruction(
        mint.publicKey,
        9, // decimals
        payer, // mint authority
        null, // freeze authority
      ),
    );
  } catch (error) {
    throw new Error(
      `Failed to create LST mint transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return { tx, mint };
}

// mint LST to user transaction
export async function mintLST(
  mint: PublicKey,
  payer: PublicKey,
  user: PublicKey,
  amount: number,
) {
  if (!mint || !payer || !user) {
    throw new Error("Mint, payer, and user public keys are required");
  }
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const tx = new Transaction();

  try {
    const ata = await getAssociatedTokenAddress(mint, user);

    // Create ATA if needed
    tx.add(createAssociatedTokenAccountInstruction(payer, ata, user, mint));

    // Mint to ATA
    tx.add(
      createMintToInstruction(
        mint,
        ata,
        payer, // mint authority
        amount,
      ),
    );
  } catch (error) {
    throw new Error(
      `Failed to create LST mint transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return tx;
}
