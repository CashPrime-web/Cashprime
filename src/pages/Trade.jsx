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

  // Klok voor tijdscontrole elke 10 seconden
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Vaste handelstijden per trade-nummer
  const scheduleTimes = {
    1: { hour: 10, minute: 0, label: "10:00 AM" },
    2: { hour: 12, minute: 0, label: "12:00 PM" },
    3: { hour: 14, minute: 0, label: "02:00 PM" },
    4: { hour: 15, minute: 0, label: "03:00 PM" },
  };

  const fetchAppData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // 1. Haal profiel
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setUserProfile(profile);

    // 2. Haal wallet (inclusief trading_balance)
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (walletData) {
      setWallet(walletData);
    }

    // 3. Haal actueel ingestelde signaal
    const { data: sigData } = await supabase
      .from("trading_signals")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    setSignal(sigData);

    // 4. Haal uitgevoerde trades van vandaag op
    const today = new Date().toISOString().split("T")[0];
    const { data: tradesToday } = await supabase
      .from("user_trades")
      .select("trade_number")
      .eq("user_id", user.id)
      .gte("created_at", today);

    if (tradesToday) {
      setCompletedTrades(tradesToday.map((t) => t.trade_number));
    }

    // 5. Bereken totale all-time winst
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
    
    // Optioneel: luister naar realtime wijzigingen in de wallets tabel zodat de Trade-pagina direct update als je getransferd hebt!
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel("wallet-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setWallet(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isTradeUnlocked = (tradeNum) => {
    const config = scheduleTimes[tradeNum];
    if (!config) return false;

    const now = currentTime;
    const unlockTime = new Date(now);
    unlockTime.setHours(config.hour, config.minute - 10, 0, 0);

    const endTime = new Date(now);
    endTime.setHours(config.hour + 1, config.minute, 0, 0);

    return now >= unlockTime && now <= endTime;
  };

  // UITVOEREN VAN TRADE (Berekent winst over de trading balance en telt op bij Total Balance & Earnings)
  const handleExecuteTrade = async (tradeNum) => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !wallet) {
      setLoading(false);
      return;
    }

    const activeProfitPct = signal ? parseFloat(signal.profit_percentage) : 2.0; 
    const currentTradingBalance = Number(wallet.trading_balance || 0);
    const currentTotalBalance = Number(wallet.balance || 0); // Asset Valuation (bijv. 475)

    if (currentTradingBalance <= 0) {
      alert("⚠️ Your trading balance is $0.00. Please transfer funds to your trading account first.");
      setLoading(false);
      return;
    }

    // 1. Winstberekening over de actuele trading balance (bijv. 2% over $400 = $8.00)
    const profitAmount = currentTradingBalance * (activeProfitPct / 100);
    
    // 2. Nieuwe waardes berekenen
    const newTradingBalance = currentTradingBalance + profitAmount;
    const newTotalBalance = currentTotalBalance + profitAmount; // 475 + 8 = 483
    const newTodaysEarnings = Number(wallet.todays_earnings || 0) + profitAmount;

    // 3. Opslaan in user_trades logboek
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

    // 4. Wallet bijwerken in Supabase
    const { error: walletErr } = await supabase
      .from("wallets")
      .update({
        balance: parseFloat(newTotalBalance.toFixed(2)),
        trading_balance: parseFloat(newTradingBalance.toFixed(2)),
        todays_earnings: parseFloat(newTodaysEarnings.toFixed(2)),
      })
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {userProfile?.name || "Trader"}!
          </h1>
          <p className="text-xs text-gray-400 mt-1">Trading & Earnings Overview</p>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
          Live Account
        </span>
      </div>

      {/* DASHBOARD CARDS / STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* ASSET VALUATION / TOTAL BALANCE */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Asset Valuation</p>
          <h2 className="text-2xl font-black text-white mt-2">
            ${wallet?.balance ? Number(wallet.balance).toFixed(2) : "0.00"}
          </h2>
          <p className="text-xs text-emerald-400 mt-2 font-medium">
            ✓ Base capital + cumulative earnings
          </p>
        </div>

        {/* TRADING BALANCE */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Trading Balance</p>
          <h2 className="text-2xl font-black text-amber-400 mt-2">
            ${wallet?.trading_balance ? Number(wallet.trading_balance).toFixed(2) : "0.00"}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Active funds in trade</p>
        </div>

        {/* TODAY'S EARNINGS */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Today's Earnings</p>
          <h2 className="text-2xl font-black text-emerald-400 mt-2">
            +${wallet?.todays_earnings ? Number(wallet.todays_earnings).toFixed(2) : "0.00"}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Generated today</p>
        </div>

        {/* TOTAL EARNINGS */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <p className="text-xs text-gray-400 font-semibold uppercase">Total Earnings</p>
          <h2 className="text-2xl font-black text-amber-400 mt-2">
            +${totalProfit.toFixed(2)}
          </h2>
          <p className="text-xs text-gray-400 mt-2">Cumulative yield</p>
        </div>
      </div>

      {/* TRADING SIGNAL OVERVIEW */}
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

      {/* TRADING SESSIONS */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Daily Trading Sessions ({maxTrades} Allowed)</h2>

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
                  Scheduled: <span className="text-gray-200">{timeInfo?.label}</span> (Opens 10m prior)
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