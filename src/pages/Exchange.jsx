import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Exchange() {
  const [fromCoin, setFromCoin] = useState("BTC");
  const [toCoin, setToCoin] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single();
      if (data) setBalance(data.balance);
    }
  };

  const handleExchange = (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    setMessage(`Exchange order for ${amount} ${fromCoin} to ${toCoin} submitted successfully!`);
    setAmount("");
  };

  return (
    <div className="max-w-xl mx-auto bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl mt-6">
      <h2 className="text-2xl font-bold mb-2">Crypto Exchange</h2>
      <p className="text-slate-400 text-xs mb-6">Convert your crypto instantly with zero fee.</p>

      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-sm mb-4">
          {message}
        </div>
      )}

      <form onSubmit={handleExchange} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">From</label>
          <div className="flex gap-2">
            <select 
              value={fromCoin} 
              onChange={(e) => setFromCoin(e.target.value)}
              className="bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
              <option value="USDT">USDT (Tether)</option>
            </select>
            <input 
              type="number" 
              placeholder="Amount" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500" 
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Available: ${balance}</p>
        </div>

        <div className="text-center py-1 text-amber-400 text-xl font-bold">↓</div>

        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">To</label>
          <select 
            value={toCoin} 
            onChange={(e) => setToCoin(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="USDT">USDT (Tether)</option>
            <option value="BTC">BTC (Bitcoin)</option>
            <option value="ETH">ETH (Ethereum)</option>
          </select>
        </div>

        <button 
          type="submit" 
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-xl transition mt-4"
        >
          Confirm Exchange
        </button>
      </form>
    </div>
  );
}