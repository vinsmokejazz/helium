"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createStakeTx } from "@/lib/solana/stake";
import { connection } from "@/lib/solana/connection";
import toast from "react-hot-toast";

export default function StakePage() {
  const { publicKey, sendTransaction } = useWallet();
  const [amount, setAmount] = useState(0);

  async function stake() {
    if (!publicKey) {
      toast.error("connect wallet first");
      return;
    }

    const { tx, stakeAccount } = await createStakeTx(publicKey, amount);

    // User signs here
    tx.feePayer = publicKey;
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;

    tx.partialSign(stakeAccount);

    const sig = await sendTransaction(tx, connection);

    await connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    toast.success("Staked! Account: " + stakeAccount.publicKey);
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
