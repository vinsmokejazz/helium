"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createStakeTx } from "@/lib/solana/stake";
import { connection } from "@/lib/solana/connection";
import toast from "react-hot-toast";
import { createDelegateTx } from "@/lib/solana/delegate";
import { PublicKey } from "@solana/web3.js";
import { createLSTMint, mintLST } from "@/lib/solana/lst";

export default function StakePage() {
  const { publicKey, sendTransaction } = useWallet();
  const [amount, setAmount] = useState(0);

  async function stake() {
    if (!publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    if (amount <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }

    try {
      // validator vote pubkey
      const validatorVote = new PublicKey(
        process.env.NEXT_PUBLIC_VALIDATOR_VOTE!,
      );

      // 1. Create stake
      const { tx: stakeTx, stakeAccount } = await createStakeTx(
        publicKey,
        amount,
      );
      stakeTx.feePayer = publicKey;
      const latestBlockhash = await connection.getLatestBlockhash();
      stakeTx.recentBlockhash = latestBlockhash.blockhash;
      stakeTx.partialSign(stakeAccount);

      const stakeSig = await sendTransaction(stakeTx, connection);
      await connection.confirmTransaction({
        signature: stakeSig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });
      toast.success("Stake account created and funded!");

      // 2. Delegate
      const delegateTx = await createDelegateTx(
        stakeAccount.publicKey,
        publicKey,
        validatorVote,
      );
      delegateTx.feePayer = publicKey;
      delegateTx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const delegateSig = await sendTransaction(delegateTx, connection);
      await connection.confirmTransaction({
        signature: delegateSig,
        blockhash: delegateTx.recentBlockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash())
          .lastValidBlockHeight,
      });
      toast.success("Staked and delegated to validator!");

      // 3. Create LST mint
      const { tx: mintTx, mint: lstMint } = await createLSTMint(publicKey);
      mintTx.feePayer = publicKey;
      mintTx.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      mintTx.partialSign(lstMint); // Mint account signs the creation

      const mintSig = await sendTransaction(mintTx, connection);
      await connection.confirmTransaction({
        signature: mintSig,
        blockhash: mintTx.recentBlockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash())
          .lastValidBlockHeight,
      });
      toast.success("LST mint created!");

      // 4. Mint LST
      const lstTx = await mintLST(
        lstMint.publicKey,
        publicKey,
        publicKey,
        amount * 1e9,
      );
      lstTx.feePayer = publicKey;
      lstTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const lstSig = await sendTransaction(lstTx, connection);
      await connection.confirmTransaction({
        signature: lstSig,
        blockhash: lstTx.recentBlockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash())
          .lastValidBlockHeight,
      });

      toast.success("LST minted! Staking complete.");
    } catch (error) {
      console.error("Staking failed:", error);
      toast.error(
        `Staking failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return (
    <div>
      <h1>Stake SOL</h1>

      <input
        type="number"
        onChange={(e) => setAmount(Number(e.target.value))}
      />

      <button onClick={stake}>Stake</button>
    </div>
  );
}
