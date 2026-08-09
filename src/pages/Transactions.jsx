import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Transactions() {
  const [transactions, setTransactions] = useState([]);

  const loadTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Haal deposits op van deze gebruiker
    const { data: deposits, error: depositError } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user.id);

    if (depositError) {
      console.log(depositError);
    }

    // 2. Haal withdrawals op van deze gebruiker
    const { data: withdrawals, error: withdrawalError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id);

    if (withdrawalError) {
      console.log(withdrawalError);
    }

    // 3. Ken type toe aan elk item zodat we ze uit elkaar kunnen houden
    const formattedDeposits = (deposits || []).map((item) => ({
      ...item,
      txType: "Deposit",
      networkInfo: item.network
    }));

    const formattedWithdrawals = (withdrawals || []).map((item) => ({
      ...item,
      txType: "Withdrawal",
      networkInfo: item.wallet_adress // of item.network indien van toepassing
    }));

    // 4. Combineer beide lijsten en sorteer op datum (nieuwste eerst)
    const combined = [...formattedDeposits, ...formattedWithdrawals].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    setTransactions(combined);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const coinLogo = (coin) => {
    if (coin === "BTC") {
      return (
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl">
          ₿
        </div>
      );
    }

    if (coin === "ETH") {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
          Ξ
        </div>
      );
    }

    if (coin === "USDT") {
      return (
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
          ₮
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white">
        $
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Transactions
      </h1>

      <div className="bg-gray-900 rounded-xl p-6">
        <div className="max-h-[350px] overflow-y-auto overflow-x-auto border border-gray-800 rounded-lg">
          <table className="w-full text-left">
            <thead className="text-gray-400 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
              <tr>
                <th className="p-3">Asset</th>
                <th className="p-3">Type</th>
                <th className="p-3">Network / Address</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-5 text-gray-400 text-center">
                    No transactions yet
                  </td>
                </tr>
              )}

              {transactions.map((tx) => (
                <tr key={tx.id + tx.txType} className="border-b border-gray-800">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {coinLogo(tx.coin)}
                      <span className="font-bold">
                        {tx.coin}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className={tx.txType === "Deposit" ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                      {tx.txType}
                    </span>
                  </td>

                  <td className="p-3 text-gray-300 text-xs break-all max-w-[200px]">
                    {tx.networkInfo || "-"}
                  </td>

                  <td className="p-3 font-bold">
                    ${tx.amount}
                  </td>

                  <td className="p-3 text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>

                  <td className={
                    tx.status === "Approved"
                      ? "p-3 text-green-400 font-bold"
                      : tx.status === "Rejected"
                      ? "p-3 text-red-400 font-bold"
                      : "p-3 text-yellow-400 font-bold"
                  }>
                    {tx.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Transactions;