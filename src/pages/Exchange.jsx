import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Exchange({ refreshDashboard, assets = [], liveRates = {} }) {
  const [fromCoin, setFromCoin] = useState("BTC");
  const [toCoin, setToCoin] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Bepaal beschikbare balans voor de gekozen 'fromCoin'
  const currentAssetRow = assets.find(a => (a.coin || "").toUpperCase() === fromCoin.toUpperCase());
  const availableBalance = currentAssetRow ? Number(currentAssetRow.available || currentAssetRow.balance || 0) : 0;

  const calculateConversion = () => {
    if (!amount || isNaN(amount)) return "0.000000";
    const val = parseFloat(amount);
    const fromRate = liveRates[fromCoin] || (fromCoin === "USDT" ? 1 : 64000);
    const toRate = liveRates[toCoin] || (toCoin === "USDT" ? 1 : 64000);
    const result = (val * fromRate) / toRate;
    return toCoin === "USDT" ? result.toFixed(2) : result.toFixed(6);
  };

  const handleExchange = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    if (numAmount > availableBalance) {
      setMessage(`Insufficient ${fromCoin} balance. Available: ${availableBalance}`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const convertedValue = parseFloat(calculateConversion());

      // Helper om user_assets bij te werken
      const updateAssetBalance = async (coinSymbol, amountChange, isAdd) => {
        const targetCoin = coinSymbol.toUpperCase();
        
        const { data: existingList, error: fetchErr } = await supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", user.id);

        if (fetchErr) throw fetchErr;

        const existing = existingList?.find(a => (a.coin || "").toUpperCase() === targetCoin);

        if (existing) {
          const currentBal = Number(existing.balance || 0);
          const currentAvail = Number(existing.available || existing.balance || 0);
          
          const newBal = isAdd ? currentBal + amountChange : Math.max(0, currentBal - amountChange);
          const newAvail = isAdd ? currentAvail + amountChange : Math.max(0, currentAvail - amountChange);

          const { error: updateErr } = await supabase
            .from("user_assets")
            .update({ balance: newBal, available: newAvail })
            .eq("id", existing.id);

          if (updateErr) throw updateErr;
        } else if (isAdd) {
          const { error: insertErr } = await supabase.from("user_assets").insert([{
            user_id: user.id,
            coin: targetCoin,
            balance: amountChange,
            available: amountChange,
            frozen: 0
          }]);
          if (insertErr) throw insertErr;
        }
      };

      // 1. Update de assets in user_assets tabel
      await updateAssetBalance(fromCoin, numAmount, false);
      await updateAssetBalance(toCoin, convertedValue, true);

      // 2. Als USDT betrokken is, sync direct ook de hoofdwallet (balance) op het dashboard!
      if (fromCoin === "USDT" || toCoin === "USDT") {
        const { data: walletData } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        let currentWalletBal = Number(walletData?.balance || 0);
        if (fromCoin === "USDT") {
          currentWalletBal -= numAmount;
        } else if (toCoin === "USDT") {
          currentWalletBal += convertedValue;
        }

        await supabase
          .from("wallets")
          .update({ balance: Math.max(0, currentWalletBal), updated_at: new Date() })
          .eq("user_id", user.id);
      }

      // 3. Sla transactie op
      await supabase.from("transactions").insert([
        {
          user_id: user.id,
          type: "Exchange",
          coin: `${fromCoin} ➔ ${toCoin}`,
          amount: numAmount,
          status: "Completed",
          description: `Exchanged ${numAmount} ${fromCoin} to ${convertedValue} ${toCoin}`,
          created_at: new Date().toISOString()
        }
      ]);

      setMessage(`Successfully exchanged ${numAmount} ${fromCoin} to ${convertedValue} ${toCoin}!`);
      setAmount("");
      
      // 4. Forceer direct dashboard herladen zodat alles live verspringt
      if (refreshDashboard) {
        await refreshDashboard();
      }
    } catch (err) {
      setMessage(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl mt-6">
      <h2 className="text-2xl font-bold mb-2 text-white">Crypto Exchange</h2>
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
              className="bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white font-bold"
            >
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
              <option value="USDT">USDT (Tether)</option>
            </select>
            <input 
              type="number" 
              step="any"
              placeholder="Amount" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white" 
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Available: {availableBalance} {fromCoin}</p>
        </div>

        <div className="flex justify-center my-1">
          <button
            type="button"
            onClick={() => {
              const temp = fromCoin;
              setFromCoin(toCoin);
              setToCoin(temp);
            }}
            className="w-8 h-8 rounded-full bg-[#0b0e14] border border-slate-800 flex items-center justify-center text-amber-400 hover:bg-slate-800 transition"
          >
            ⇅
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">To</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={calculateConversion()} 
              className="flex-1 bg-[#0b0e14]/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-bold" 
            />
            <select 
              value={toCoin} 
              onChange={(e) => setToCoin(e.target.value)}
              className="bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white font-bold"
            >
              <option value="USDT">USDT (Tether)</option>
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-xl transition mt-4 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Confirm Exchange"}
        </button>
      </form>
    </div>
  );
}