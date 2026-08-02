import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Deposit() {
  const [coin, setCoin] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Voorbeeld adressen (pas aan naar jouw eigen wallets)
  const walletAddresses = {
    USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    BTC: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    ETH: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage("User not authenticated.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("deposits").insert([
      {
        user_id: user.id,
        coin: coin,
        network: network,
        amount: parseFloat(amount),
        status: "Pending"
      }
    ]);

    setLoading(false);

    if (error) {
      setMessage("Error submitting recharge: " + error.message);
    } else {
      setMessage("Recharge request submitted successfully! Pending admin approval.");
      setAmount("");
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl mt-6">
      <h2 className="text-2xl font-bold mb-2">Recharge Account</h2>
      <p className="text-slate-400 text-xs mb-6">Select your preferred cryptocurrency and deposit funds to your account.</p>

      {message && (
        <div className={`p-3 rounded-xl text-sm mb-4 border ${message.includes("Error") ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleDeposit} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Select Asset</label>
          <select
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white"
          >
            <option value="USDT">USDT (Tether)</option>
            <option value="BTC">BTC (Bitcoin)</option>
            <option value="ETH">ETH (Ethereum)</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Network</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white"
          >
            <option value="TRC20">TRC20 (Tron Network)</option>
            <option value="ERC20">ERC20 (Ethereum Network)</option>
            <option value="BEP20">BEP20 (BNB Smart Chain)</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Deposit Address</label>
          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-3 text-xs font-mono text-amber-400 break-all select-all flex justify-between items-center">
            <span>{walletAddresses[coin] || walletAddresses.USDT}</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Amount ($)</label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-xl transition mt-4 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Confirm Recharge"}
        </button>
      </form>
    </div>
  );
}