import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Transfer() {
  const [fromAccount, setFromAccount] = useState("Exchange");
  const [toAccount, setToAccount] = useState("Trade");
  const [amount, setAmount] = useState("");
  const [exchangeBalance, setExchangeBalance] = useState(0);
  const [tradingBalance, setTradingBalance] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("wallets")
        .select("balance, bonus")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        const total = Number(data.balance || 0);
        const trading = Number(data.bonus || 0);
        const exchange = Math.max(0, total - trading);

        setTotalBalance(total);
        setExchangeBalance(exchange);
        setTradingBalance(trading);
      }
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setMessage("");
    const transferAmount = parseFloat(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      setMessage("⚠️ Please enter a valid amount.");
      return;
    }

    if (fromAccount === "Exchange" && toAccount === "Trade") {
      if (transferAmount > exchangeBalance) {
        setMessage("⚠️ Insufficient funds in Exchange Account.");
        return;
      }
    } else if (fromAccount === "Trade" && toAccount === "Exchange") {
      if (transferAmount > tradingBalance) {
        setMessage("⚠️ Insufficient funds in Trade Account.");
        return;
      }
    } else {
      setMessage("⚠️ Invalid transfer direction.");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let newTrading = tradingBalance;
    if (fromAccount === "Exchange" && toAccount === "Trade") {
      newTrading += transferAmount; 
    } else if (fromAccount === "Trade" && toAccount === "Exchange") {
      newTrading -= transferAmount; 
    }

    // Update de 'bonus' kolom in de database als opslag voor het trade-saldo
    const { error } = await supabase
      .from("wallets")
      .update({
        bonus: parseFloat(newTrading.toFixed(2)),
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      setMessage("❌ Error processing transfer: " + error.message);
    } else {
      setMessage(`✅ Successfully transferred $${transferAmount.toFixed(2)} from ${fromAccount} to ${toAccount}!`);
      setAmount("");
      fetchBalances(); 
    }
  };

  const currentAvailable = fromAccount === "Exchange" ? exchangeBalance : tradingBalance;

  return (
    <div className="max-w-xl mx-auto bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl mt-6">
      <h2 className="text-2xl font-bold mb-2 text-white">Internal Transfer</h2>
      <p className="text-slate-400 text-xs mb-6">Move funds instantly between your internal CashPrime accounts.</p>

      {message && (
        <div className="bg-slate-800 border border-slate-700 text-sm p-3 rounded-xl mb-4 text-amber-400">
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
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Exchange">Exchange Account (${exchangeBalance.toFixed(2)})</option>
              <option value="Trade">Trade Account (${tradingBalance.toFixed(2)})</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">To</label>
            <select 
              value={toAccount} 
              onChange={(e) => setToAccount(e.target.value)}
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
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
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
          <p className="text-[11px] text-slate-500 mt-1">Available: ${currentAvailable.toFixed(2)}</p>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition mt-4 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Confirm Transfer"}
        </button>
      </form>
    </div>
  );
}