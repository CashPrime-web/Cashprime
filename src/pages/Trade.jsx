import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Trade() {
  const [wallet, setWallet] = useState(null);
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [completedTrades, setCompletedTrades] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Klok elke minuut verversen voor exacte tijdscheck
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Definitie van de vaste handelstijden per trade-nummer
  const scheduleTimes = {
    1: { hour: 10, minute: 0, label: "10:00 AM" },
    2: { hour: 12, minute: 0, label: "12:00 PM" },
    3: { hour: 14, minute: 0, label: "02:00 PM" },
    4: { hour: 15, minute: 0, label: "03:00 PM" },
  };

  const fetchTradeData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Haal profiel op (voor max_daily_trades)
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setUserProfile(profile);

    // 2. Haal wallet op
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setWallet(walletData);

    // 3. Haal actueel ingestelde signaal op
    const { data: sigData } = await supabase
      .from("trading_signals")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    setSignal(sigData);

    // 4. Haal reeds uitgevoerde trades van vandaag op
    const today = new Date().toISOString().split("T")[0];
    const { data: tradesToday } = await supabase
      .from("user_trades")
      .select("trade_number")
      .eq("user_id", user.id)
      .gte("created_at", today);

    if (tradesToday) {
      setCompletedTrades(tradesToday.map((t) => t.trade_number));
    }
  };

  useEffect(() => {
    fetchTradeData();
  }, []);

  // Controleer of een trade binnen het venster valt (vanaf 10 min vóór de geplande tijd)
  const isTradeUnlocked = (tradeNum) => {
    const config = scheduleTimes[tradeNum];
    if (!config) return false;

    const now = currentTime;
    const unlockTime = new Date(now);
    unlockTime.setHours(config.hour, config.minute - 10, 0, 0); // 10 min ervoor

    const endTime = new Date(now);
    endTime.setHours(config.hour + 1, config.minute, 0, 0); // Blijft 1 uur na starttijd open

    return now >= unlockTime && now <= endTime;
  };

  const handleExecuteTrade = async (tradeNum) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !wallet) {
      setLoading(false);
      return;
    }

    const activeProfitPct = signal ? parseFloat(signal.profit_percentage) : 3.5;
    const currentBalance = Number(wallet.balance || 0);

    // Winstberekening gebaseerd op percentage
    const profitAmount = currentBalance * (activeProfitPct / 100);
    const newBalance = currentBalance + profitAmount;
    const newTodaysEarnings = Number(wallet.todays_earnings || 0) + profitAmount;

    // 1. Opslaan in user_trades
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

    // 2. Update wallet saldo en dagwinst
    const { error: walletErr } = await supabase
      .from("wallets")
      .update({
        balance: parseFloat(newBalance.toFixed(2)),
        todays_earnings: parseFloat(newTodaysEarnings.toFixed(2)),
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (walletErr) {
      alert("Error updating balance: " + walletErr.message);
    } else {
      alert(`✅ Trade #${tradeNum} Completed! Profit: +$${profitAmount.toFixed(2)} (${activeProfitPct}%)`);
      fetchTradeData();
    }
  };

  const maxTrades = userProfile?.max_daily_trades || 2;
  const availableTradeNumbers = Array.from({ length: maxTrades }, (_, i) => i + 1);

  return (
    <div className="p-4 md:p-8 text-white max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Daily Signal Trading</h1>
      <p className="text-gray-400 text-sm">Execute daily trades according to your schedule to earn daily yield.</p>

      {/* SALDO OVERZICHT */}
      <div className="grid grid-cols-2 gap-4 bg-gray-900/80 p-6 rounded-2xl border border-gray-800">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase">Trading Balance</p>
          <p className="text-3xl font-extrabold text-white mt-1">${wallet?.balance || "0.00"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-medium uppercase">Today's Earnings</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">
            +${wallet?.todays_earnings || "0.00"}
          </p>
        </div>
      </div>

      {/* ACTIEF SIGNAAL */}
      <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
        <div>
          <span className="text-gray-400">Active Pair: </span>
          <span className="font-bold text-amber-400 ml-1">{signal?.pair || "BTC/USDT"}</span>
        </div>
        <div>
          <span className="text-gray-400">Profit Rate: </span>
          <span className="font-bold text-emerald-400 ml-1">+{signal?.profit_percentage || 3.5}%</span>
        </div>
      </div>

      {/* HANDELSSESSIES */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Today's Trading Sessions ({maxTrades} Available)</h2>

        {availableTradeNumbers.map((num) => {
          const isDone = completedTrades.includes(num);
          const unlocked = isTradeUnlocked(num);
          const timeInfo = scheduleTimes[num];

          return (
            <div
              key={num}
              className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-base">Trade #{num}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Unlocks at: <span className="text-gray-200">{timeInfo?.label}</span> (Opens 10 min prior)
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
                    {loading ? "Trading..." : `Execute Trade #${num}`}
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