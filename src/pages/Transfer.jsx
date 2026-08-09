import { useState } from "react";
import { supabase } from "../lib/supabase";
function TransferPage({ exchangeBalance, tradeBalance, refreshDashboard }) {
  const [fromAccount, setFromAccount] = useState("Exchange");
  const [toAccount, setToAccount] = useState("Trade");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const maxAvailable =
    fromAccount === "Exchange" ? exchangeBalance : tradeBalance;


  const handleTransfer = async (e) => {
  e.preventDefault();

  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    setMessage({
      text: "Please enter a valid amount.",
      type: "error"
    });
    return;
  }

  if (numAmount > maxAvailable) {
    setMessage({
      text: "Insufficient balance.",
      type: "error"
    });
    return;
  }

  setLoading(true);

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not logged in");
    }

    // Haal echte wallet op
    const {
      data: walletData,
      error: walletError
    } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) throw walletError;

    const currentBalance =
      Number(walletData?.balance || 0);

    const currentBonus =
      Number(walletData?.bonus || 0);

    const currentTrade =
      Number(walletData?.trading_balance || 0);


    // ==========================================
    // EXCHANGE -> TRADE
    // ==========================================
    if (
      fromAccount === "Exchange" &&
      toAccount === "Trade"
    ) {
      let remainingAmount = numAmount;

      // Eerst wordt het echte Exchange-saldo gebruikt
      const balanceUsed = Math.min(
        currentBalance,
        remainingAmount
      );

      remainingAmount -= balanceUsed;

      const newBalance =
        currentBalance - balanceUsed;

      // Daarna eventueel Bonus gebruiken
      const bonusUsed = Math.min(
        currentBonus,
        remainingAmount
      );

      remainingAmount -= bonusUsed;

      const newBonus =
        currentBonus - bonusUsed;

      // Exchange + Bonus samen onvoldoende
      if (remainingAmount > 0) {
        throw new Error("Insufficient Exchange balance.");
      }

      const newTrade =
        currentTrade + numAmount;

      const { error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          bonus: newBonus,
          trading_balance: newTrade
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    }


    // ==========================================
    // TRADE -> EXCHANGE
    // ==========================================
    if (
      fromAccount === "Trade" &&
      toAccount === "Exchange"
    ) {
      // Haal bedrag uit Trade
      const newTrade =
        currentTrade - numAmount;

      // Geld komt terug als echt Exchange-saldo
      const newBalance =
        currentBalance + numAmount;

      const { error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          trading_balance: newTrade
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    }


    // ==========================================
    // TRANSACTION OPSLAAN
    // ==========================================
    const { error: txError } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: user.id,
          type: "Transfer",
          coin: "USDT",
          amount: numAmount,
          status: "Completed",
          description:
            `Transferred $${numAmount} from ${fromAccount} to ${toAccount}`,
          created_at: new Date().toISOString()
        }
      ]);

    if (txError) throw txError;


    setMessage({
      text: `Successfully transferred $${numAmount}`,
      type: "success"
    });

    setAmount("");

    if (refreshDashboard) {
      await refreshDashboard();
    }

  } catch (error) {
    console.error(error);

    setMessage({
      text: error.message,
      type: "error"
    });

  } finally {
    setLoading(false);
  }
};

 return (

<div className="bg-[#161d2a] border border-slate-800 rounded-2xl p-6">

<h2 className="text-2xl font-bold text-white mb-2">
      Internal Transfer
    </h2>

    <p className="text-slate-400 text-sm mb-6">
      Move funds instantly between your internal CashPrime accounts.
    </p>

    {message.text && (
      <div
        className={`p-4 rounded-xl mb-6 text-sm font-semibold ${
          message.type === "error"
            ? "bg-red-500/10 text-red-400 border border-red-500/20"
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        }`}
      >
        {message.text}
      </div>
    )}

    <form onSubmit={handleTransfer} className="space-y-6">

      <div>
        <label className="block text-xs uppercase font-bold text-slate-400 mb-2">
          From
        </label>

        <select
          value={fromAccount}
          onChange={(e) => {
            setFromAccount(e.target.value);
            setToAccount(
              e.target.value === "Exchange"
                ? "Trade"
                : "Exchange"
            );
          }}
          className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white font-bold"
        >
          <option value="Exchange">
            Exchange Account (${exchangeBalance.toFixed(2)})
          </option>

          <option value="Trade">
            Trade Account (${tradeBalance.toFixed(2)})
          </option>

        </select>
      </div>


      <div>
        <label className="block text-xs uppercase font-bold text-slate-400 mb-2">
          To
        </label>

        <input
          value={toAccount}
          readOnly
          className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white font-bold"
        />
      </div>


      <div>
        <label className="block text-xs uppercase font-bold text-slate-400 mb-2">
          Amount (USD)
        </label>

        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e)=>setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-semibold"
        />

        <p className="text-xs text-slate-400 mt-2">
          Available: ${maxAvailable.toFixed(2)}
        </p>
      </div>


       <button
    type="submit"
    disabled={loading}
    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl"
  >
    {loading ? "Processing..." : "Confirm Transfer"}
</button>

</form>
</div>
);

}

export default TransferPage;