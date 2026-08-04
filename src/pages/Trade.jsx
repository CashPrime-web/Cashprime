import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Trade() {
  const [wallet, setWallet] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completedTrades, setCompletedTrades] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const scheduleTimes = {
    1: { hour: 10, minute: 0, label: "10:00 AM" },
    2: { hour: 12, minute: 0, label: "12:00 PM" },
    3: { hour: 14, minute: 0, label: "02:00 PM" },
    4: { hour: 15, minute: 0, label: "03:00 PM" },
  };

  const fetchAppData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Haal profiel
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setUserProfile(profile);

    // 2. Haal wallet (inclusief bonus als trading saldo)
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (walletData) {
      setWallet(walletData);
    }

    // 3. Haal signaal
    const { data: sigData } = await supabase
      .from("trading_signals")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    setSignal(sigData);

    // 4. Haal trades van vandaag
    const today = new Date().toISOString().split("T")[0];
    const { data: tradesToday } = await supabase
      .from("user_trades")
      .select("trade_number")
      .eq("user_id", user.id)
      .gte("created_at", today);

    if (tradesToday) {
      setCompletedTrades(tradesToday.map((t) => t.trade_number));
    }

    // 5. Totale winst
    const { data: allTrades } = await supabase
      .from("user_trades")
      .select("profit_amount")
      .eq("user_id", user.id)
      .eq("status", "Completed");

    if (allTrades) {
      const sumProfit = allTrades.reduce(
        (acc, item) => acc + (Number(item.profit_amount) || 0),
        0
      );
      setTotalProfit(sumProfit);
    }
  };

  useEffect(() => {
    fetchAppData();

    const handleFocus = () => fetchAppData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const isTradeUnlocked = (tradeNum) => {
    return true; 
  };

  const handleExecuteTrade = async (tradeNum) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !wallet) {
      setLoading(false);
      return;
    }

    const activeProfitPct = signal ? parseFloat(signal.profit_percentage) : 2.0; 
    
    // Gebruik 'bonus' als het Trade-saldo om te matchen met Transfer.jsx
    const currentTradingBalance = Number(wallet.bonus || 0);
    const currentTotalBalance = Number(wallet.balance || 0);

    if (currentTradingBalance <= 0) {
      alert("⚠️ Your trade account balance is $0.00. Please transfer funds from your Exchange account first.");
      setLoading(false);
      return;
    }

    const profitAmount = currentTradingBalance * (activeProfitPct / 100);
    const newTradingBalance = currentTradingBalance + profitAmount;
    const newTotalBalance = currentTotalBalance + profitAmount;
    const newTodaysEarnings = Number(wallet.todays_earnings || 0) + profitAmount;

    const { error: tradeErr } = await supabase.from("user_trades").insert([
      {
        user_id: user.id,
        pair: signal?.pair || "BTC/USDT",
        profit_percentage: activeProfitPct,
        profit_amount: profitAmount,
        trade_number: tradeNum,
        status: "Completed",
      },
    ]);

    if (tradeErr) {
      alert("Error executing trade: " + tradeErr.message);
      setLoading(false);
      return;
    }

    // Update zowel de totale balans als de bonus (trade-saldo) en de winst
    const updatePayload = {
      balance: parseFloat(newTotalBalance.toFixed(2)),
      bonus: parseFloat(newTradingBalance.toFixed(2)),
      todays_earnings: parseFloat(newTodaysEarnings.toFixed(2)),
    };

    const { error: walletErr } = await supabase
      .from("wallets")
      .update(updatePayload)
      .eq("user_id", user.id);

    setLoading(false);

    if (walletErr) {
      alert("Error updating wallet: " + walletErr.message);
    } else {
      alert(`✅ Trade #${tradeNum} Executed! Profit added: +$${profitAmount.toFixed(2)} (${activeProfitPct}%)`);
      fetchAppData();
    }
  };

  const maxTrades = userProfile?.max_daily_trades || 2;
  const availableTradeNumbers = Array.from({ length: maxTrades }, (_, i) => i + 1);

  // Bereken de exchange balans op dezelfde manier als in Transfer.jsx
  const totalValuation = Number(wallet?.balance || 0);
  const tradingBal = Number(wallet?.bonus || 0);
  const exchangeBal = Math.max(0, totalValuation - tradingBal);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {userProfile?.name || "Trader"}!
          </h1>
          <p className="text-xs text-gray-400 mt-1">Trading & Earnings Overview</p>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
          Live Account
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Asset Valuation</p>
          <h2 className="text-2xl font-black text-white mt-2">
            ${totalValuation.toFixed(2)}
          </h2>
          <p className="text-xs text-emerald-400 mt-2 font-medium">✓ Base capital + earnings</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Trading Balance</p>
          <h2 className="text-2xl font-black text-amber-400 mt-2">
            ${tradingBal.toFixed(2)}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Active funds in trade</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Today's Earnings</p>
          <h2 className="text-2xl font-black text-emerald-400 mt-2">
            +${wallet?.todays_earnings ? Number(wallet.todays_earnings).toFixed(2) : "0.00"}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Generated today</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Total Earnings</p>
          <h2 className="text-2xl font-black text-amber-400 mt-2">
            +${totalProfit.toFixed(2)}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Cumulative yield</p>
        </div>
      </div>

      <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
        <div>
          <span className="text-gray-400">Active Pair: </span>
          <span className="font-bold text-amber-400 ml-1">{signal?.pair || "BTC/USDT"}</span>
        </div>
        <div>
          <span className="text-gray-400">Yield Rate: </span>
          <span className="font-bold text-emerald-400 ml-1">+{signal?.profit_percentage || 2.0}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Daily Trading Sessions ({maxTrades} Allowed)</h2>

        {availableTradeNumbers.map((num) => {
          const isDone = completedTrades.includes(num);
          const unlocked = isTradeUnlocked(num);
          const timeInfo = scheduleTimes[num];

          return (
            <div key={num} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Trade #{num}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Scheduled: <span className="text-gray-200">{timeInfo?.label || "Anytime"}</span>
                </p>
              </div>

              <div>
                {isDone ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-4 py-2 rounded-lg font-bold">
                    ✓ Completed
                  </span>
                ) : unlocked ? (
                  <button
                    disabled={loading}
                    onClick={() => handleExecuteTrade(num)}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-5 py-2.5 rounded-lg transition text-sm disabled:opacity-50"
                  >
                    {loading ? "Processing..." : `Execute Trade #${num}`}
                  </button>
                ) : (
                  <button
                    disabled
                    className="bg-gray-800 text-gray-500 cursor-not-allowed font-medium px-4 py-2 rounded-lg text-xs border border-gray-700"
                  >
                    🔒 Locked
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Trade;