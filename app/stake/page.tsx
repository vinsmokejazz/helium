"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createStakeTx } from "@/lib/solana/stake";
import { connection } from "@/lib/solana/connection";
import toast from "react-hot-toast";
import { createDelegateTx } from "@/lib/solana/delegate";
import { PublicKey } from "@solana/web3.js";
import { createLSTMint, mintLST } from "@/lib/solana/lst";

const quickAmounts = [0.1, 0.5, 1, 2];

function shortenKey(key: PublicKey | null) {
  if (!key) {
    return "Not connected";
  }

  const value = key.toBase58();
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export default function StakePage() {
  const { publicKey, sendTransaction } = useWallet();
  const [amount, setAmount] = useState(0);
  const [isStaking, setIsStaking] = useState(false);
  const [status, setStatus] = useState("Ready to stake");

  const validatorVote = process.env.NEXT_PUBLIC_VALIDATOR_VOTE;
  const amountInLamports = Math.max(amount, 0) * 1e9;

  async function stake() {
    if (!publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    if (!validatorVote) {
      toast.error("Validator vote address is not configured");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }

    setIsStaking(true);
    setStatus("Preparing stake transaction");

    try {
      // validator vote pubkey
      const validatorVoteKey = new PublicKey(validatorVote);

      // 1. Create stake
      setStatus("Creating stake account");
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
      setStatus("Delegating stake to validator");
      const delegateTx = await createDelegateTx(
        stakeAccount.publicKey,
        publicKey,
        validatorVoteKey,
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
      setStatus("Creating LST mint");
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
      setStatus("Minting LST to your wallet");
      const lstTx = await mintLST(
        lstMint.publicKey,
        publicKey,
        publicKey,
        amountInLamports,
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
      setStatus("Staking complete");
    } catch (error) {
      console.error("Staking failed:", error);
      setStatus("Staking failed");
      toast.error(
        `Staking failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsStaking(false);
    }
  }

  const estimatedLST = Number.isFinite(amount) && amount > 0 ? amount : 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#12211d_0%,#08110f_42%,#040806_100%)] px-6 py-12 text-slate-100 sm:px-10 lg:px-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-4xl border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/80">
            Helium staking
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Stake SOL and mint LST in one flow.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            Choose an amount, then let the app create the stake account,
            delegate it to the configured validator, and mint LST back to your
            wallet.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <label className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <span className="text-sm text-slate-400">Stake amount</span>
              <input
                className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-tight text-white outline-none placeholder:text-slate-500"
                type="number"
                min="0"
                step="0.1"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="1.0"
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Quick select</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-400/20"
                  >
                    {preset} SOL
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">
              1 stake account
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">
              1 validator delegation
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">
              1 LST mint
            </span>
          </div>

          <button
            onClick={stake}
            disabled={isStaking}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStaking ? "Staking..." : "Stake now"}
          </button>
        </section>

        <aside className="rounded-4xl border border-white/10 bg-black/20 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">Summary</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-400">Wallet</p>
              <p className="mt-1 break-all text-base font-medium text-white">
                {shortenKey(publicKey)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-400">Validator</p>
              <p className="mt-1 break-all text-base font-medium text-white">
                {validatorVote ?? "Not configured"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-400">Estimated output</p>
              <p className="mt-1 text-base font-medium text-white">
                {estimatedLST ? `${estimatedLST.toFixed(2)} LST` : "0.00 LST"}
              </p>
              <p className="mt-1 text-slate-400">
                The app mints the same numeric amount of LST as the SOL staked.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
              <p className="text-slate-300">Status</p>
              <p className="mt-1 text-base font-medium text-white">{status}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
