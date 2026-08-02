import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Trade() {
  const [wallet, setWallet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [signal, setSignal] = useState({ pair: "BTC/USDT", profit_percentage: 3.5 });
  const [userTradesToday, setUserTradesToday] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Trade tijdschema (lokale tijd)
  const tradeSchedule = [
    { number: 1, hour: 10, label: "10:00 AM" },
    { number: 2, hour: 12, label: "12:00 PM" },
    { number: 3, hour: 14, label: "02:00 PM" },
    { number: 4, hour: 15, label: "03:00 PM" }
  ];

  useEffect(() => {
    fetchTradeData();
  }, []);

  const fetchTradeData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Profile ophalen voor max_daily_trades
    const { data: profData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profData) setProfile(profData);

    // Wallet ophalen
    const { data: walletData } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
    if (walletData) setWallet(walletData);

    // Actief signaal ophalen
    const { data: sigData } = await supabase.from("trading_signals").select("*").eq("is_active", true).maybeSingle();
    if (sigData) setSignal(sigData);

    // Trades van vandaag ophalen
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrades } = await supabase.from("user_trades").select("*").eq("user_id", user.id).gte("created_at", today);
    if (todayTrades) setUserTradesToday(todayTrades);
  };

  const handleExecuteTrade = async (tradeNum) => {
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentBalance = wallet?.balance || 0;
    const profitAmount = currentBalance * (signal.profit_percentage / 100);
    const newBalance = currentBalance + profitAmount;
    const newEarnings = (wallet?.todays_earnings || 0) + profitAmount;

    // Sla trade op
    const { error: tradeError } = await supabase.from("user_trades").insert([
      {
        user_id: user.id,
        pair: signal.pair,
        profit_percentage: signal.profit_percentage,
        profit_amount: profitAmount,
        trade_number: tradeNum,
        status: "Completed"
      }
    ]);

    if (tradeError) {
      setMessage("Error executing trade: " + tradeError.message);
      setLoading(false);
      return;
    }

    // Update wallet saldo
    const { error: walletError } = await supabase
      .from("wallets")
      .update({
        balance: parseFloat(newBalance.toFixed(2)),
        todays_earnings: parseFloat(newEarnings.toFixed(2))
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (walletError) {
      setMessage("Error updating wallet: " + walletError.message);
    } else {
      setMessage(`Trade #${tradeNum} executed successfully! +$${profitAmount.toFixed(2)} added.`);
      fetchTradeData();
    }
  };

  const maxTrades = profile?.max_daily_trades || 2;
  const currentHour = new Date().getHours();

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white p-4">
      <div className="bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-extrabold mb-1">Daily Signal Trading</h2>
        <p className="text-xs text-slate-400 mb-6">Execute daily trades according to your schedule to earn daily yield.</p>

        {/* SALDO OVERZICHT */}
        <div className="grid grid-cols-2 gap-4 bg-[#0b0e14] p-4 rounded-xl border border-slate-800 mb-6">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Trading Balance</p>
            <p className="text-2xl font-bold mt-1">${wallet?.balance !== undefined ? wallet.balance : "0.00"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Today's Earnings</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">+${wallet?.todays_earnings !== undefined ? wallet.todays_earnings : "0.00"}</p>
          </div>
        </div>

        {/* SIGNAAL INFO */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Active Pair:</span>
            <span className="font-bold text-amber-400">{signal.pair}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Profit Rate:</span>
            <span className="font-bold text-emerald-400">+{signal.profit_percentage}%</span>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm mb-6 border ${message.includes("Error") ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
            {message}
          </div>
        )}

        {/* TRADES SCHEMA LIJST */}
        <h3 className="text-lg font-bold mb-3">Today's Trading Sessions ({maxTrades} Available)</h3>
        <div className="space-y-3">
          {tradeSchedule.slice(0, maxTrades).map((slot) => {
            const isCompleted = userTradesToday.some((t) => t.trade_number === slot.number);
            const isTimeReached = currentHour >= slot.hour;

            return (
              <div key={slot.number} className="flex justify-between items-center bg-[#0b0e14] p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="font-bold text-sm">Trade #{slot.number}</p>
                  <p className="text-xs text-slate-400">Unlocks at: {slot.label}</p>
                </div>

                <div>
                  {isCompleted ? (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold">
                      ✓ Completed
                    </span>
                  ) : !isTimeReached ? (
                    <span className="bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
                      🔒 Opens at {slot.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleExecuteTrade(slot.number)}
                      disabled={loading}
                      className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-xl text-xs font-bold transition"
                    >
                      {loading ? "Executing..." : `Execute Trade #${slot.number}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}