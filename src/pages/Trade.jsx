import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Trade() {
  const [wallet, setWallet] = useState(null);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
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

    // 1. Haal profiel en wallet op
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setUserProfile(profile);

    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: userTrades } = await supabase
      .from("user_trades")
      .select("profit_amount, created_at")
      .eq("user_id", user.id)
      .eq("status", "Completed");

    const today = new Date();
    today.setHours(0,0,0,0);

    const todayTrades = (userTrades || []).filter(trade =>
      new Date(trade.created_at) >= today
    );

    const todayEarnings = todayTrades.reduce(
      (acc, trade) => acc + Number(trade.profit_amount || 0),
      0
    );

    const totalEarn = (userTrades || []).reduce(
      (acc, trade) => acc + Number(trade.profit_amount || 0),
      0
    );

    setTodaysEarnings(todayEarnings);
    setTotalEarnings(totalEarn);

    if (walletData) {
      setWallet(walletData);
    }

    // 2. Totale winst ophalen voor de asset valuation
    const { data: allTrades } = await supabase
      .from("user_trades")
      .select("profit_amount")
      .eq("user_id", user.id)
      .eq("status", "Completed");

    let sumProfit = 0;
    if (allTrades) {
      sumProfit = allTrades.reduce(
        (acc, item) => acc + (Number(item.profit_amount) || 0),
        0
      );
      setTotalProfit(sumProfit);
    }

    // 4. Haal signaal
    const { data: sigData } = await supabase
      .from("trading_signals")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    
    if (sigData && sigData.is_active === true) {
      setSignal(sigData);
    } else {
      setSignal(null);
    }

    const { data: tradesToday } = await supabase
      .from("user_trades")
      .select("trade_number, created_at")
      .eq("user_id", user.id)
      .eq("status", "Completed");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const completedToday = (tradesToday || []).filter(
      (trade) => new Date(trade.created_at) >= todayStart
    );

    setCompletedTrades(
      completedToday.map((t) => t.trade_number)
    );
  };

  useEffect(() => {
    fetchAppData();
    const handleFocus = () => fetchAppData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const isTradeUnlocked = (tradeNum) => {
    const schedule = scheduleTimes[tradeNum];
    if (!schedule) return true;

    const now = currentTime;
    const targetTime = new Date(now);
    targetTime.setHours(schedule.hour, schedule.minute, 0, 0);

    const openingTime = new Date(targetTime.getTime() - 10 * 60 * 1000);
    const closingTime = new Date(targetTime.getTime() + 25 * 60 * 1000);

    return now >= openingTime && now <= closingTime;
  };

  const handleExecuteTrade = async (tradeNum) => {
    if (!signal || !signal.is_active) {
      alert("⚠️ Trading signals are currently turned off by the administrator.");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !wallet) {
      setLoading(false);
      return;
    }

    const activeProfitPct = parseFloat(signal.profit_percentage) || 2.0; 
    const currentTradingBalance = Number(wallet.trading_balance || 0);

    if (currentTradingBalance <= 0) {
      alert("⚠️ Your trade account balance is $0.00. Please transfer funds from your Exchange account first.");
      setLoading(false);
      return;
    }

    const profitAmount = currentTradingBalance * (activeProfitPct / 100);
    const newTradingBalance = currentTradingBalance + profitAmount;

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

    const updatePayload = {
  trading_balance: parseFloat(newTradingBalance.toFixed(2)),
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
  const tradingBal = Number(wallet?.trading_balance || 0);

  return (
  <div className="max-w-5xl mx-auto space-y-6">

    <div className="flex justify-between items-center pb-4 border-b border-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {userProfile?.name || "Trader"}!
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Trading & Earnings Overview
        </p>
      </div>

      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
        Live Account
      </span>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Trading Balance</p>
          <h2 className="text-2xl font-black text-amber-400 mt-2">
            ${tradingBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Active funds in trade</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Today's Earnings</p>
          <h2 className="text-2xl font-black text-emerald-400 mt-2">
            +${Number(todaysEarnings).toFixed(2)}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Generated today</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Total Earnings</p>
          <h2 className="text-2xl font-black text-amber-400 mt-2">
            +${Number(totalEarnings).toFixed(2)}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Cumulative yield</p>
        </div>
      </div>

      {signal ? (
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
          <div>
            <span className="text-gray-400">Active Pair: </span>
            <span className="font-bold text-amber-400 ml-1">{signal.pair}</span>
          </div>
          <div>
            <span className="text-gray-400">Yield Rate: </span>
            <span className="font-bold text-emerald-400 ml-1">+{signal.profit_percentage}%</span>
          </div>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-center text-red-400 text-sm">
          🔒 Trading signals are currently closed/offline by administration. Please check back later.
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Daily Trading Sessions ({maxTrades} Allowed)</h2>

        {signal ? (
          availableTradeNumbers.map((num) => {
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
          })
        ) : (
          <div className="bg-gray-900/40 border border-gray-800 text-gray-500 p-6 rounded-xl text-center text-xs">
            No trades available right now.
          </div>
        )}
      </div>
    </div>
  );
}

export default Trade;