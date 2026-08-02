import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Transfer() {
  const [fromAccount, setFromAccount] = useState("Exchange");
  const [toAccount, setToAccount] = useState("Trade");
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

  const handleTransfer = (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    setMessage(`Successfully transferred $${amount} from ${fromAccount} to ${toAccount} account!`);
    setAmount("");
  };

  return (
    <div className="max-w-xl mx-auto bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl mt-6">
      <h2 className="text-2xl font-bold mb-2">Internal Transfer</h2>
      <p className="text-slate-400 text-xs mb-6">Move funds instantly between your internal CashPrime accounts.</p>

      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-sm mb-4">
          {message}
        </div>
      )}

      <form onSubmit={handleTransfer} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">From</label>
            <select 
              value={fromAccount} 
              onChange={(e) => setFromAccount(e.target.value)}
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Exchange">Exchange Account</option>
              <option value="Trade">Trade Account</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">To</label>
            <select 
              value={toAccount} 
              onChange={(e) => setToAccount(e.target.value)}
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Trade">Trade Account</option>
              <option value="Exchange">Exchange Account</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Amount ($)</label>
          <input 
            type="number" 
            placeholder="0.00" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" 
          />
          <p className="text-[11px] text-slate-500 mt-1">Available: ${balance}</p>
        </div>

        <button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition mt-4"
        >
          Confirm Transfer
        </button>
      </form>
    </div>
  );
}