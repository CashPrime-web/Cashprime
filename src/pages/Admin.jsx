import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import UsersTable from "../components/admin/UsersTable.jsx";

console.log("ADMIN LOADED");

function Admin() {
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [verifications, setVerifications] = useState([]);

  // Trading Signal Statuses
  const [signalPair, setSignalPair] = useState("BTC/USDT");
  const [signalProfit, setSignalProfit] = useState(3.5);
  const [signalMsg, setSignalMsg] = useState("");
  const [tradesToday, setTradesToday] = useState([]);

  const fetchData = async () => {
    const { data: profiles, error } = await supabase.from("profiles").select("*");

    if (error) {
      console.log(error);
      return;
    }

    const { data: wallets, error: walletError } = await supabase.from("wallets").select("*");

    if (walletError) {
      console.log(walletError);
      return;
    }

    const combined = profiles.map((user) => ({
      ...user,
      wallet: wallets.find((wallet) => wallet.user_id === user.id)
    }));

    setUsers(combined);

    const { data: depositData, error: depositError } = await supabase
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false });

    if (depositError) {
      console.log(depositError);
      return;
    }

    setDeposits(depositData);

    const { data: withdrawalData, error: withdrawalError } = await supabase.from("withdrawals").select("*");

    if (withdrawalError) {
      console.log(withdrawalError);
      return;
    }

    setWithdrawals(withdrawalData);

    const { data: verificationData, error: verificationError } = await supabase
      .from("verifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (verificationError) {
      console.log(verificationError);
      return;
    }

    const verificationWithUsers = await Promise.all(
      verificationData.map(async (verification) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name,email")
          .eq("id", verification.user_id)
          .maybeSingle();

        return {
          ...verification,
          profile
        };
      })
    );

    setVerifications(verificationWithUsers);

    // Haal trading signaal op uit de database
    const { data: sigData } = await supabase
      .from("trading_signals")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (sigData) {
      setSignalPair(sigData.pair);
      setSignalProfit(sigData.profit_percentage);
    }

    // Haal de geklikte trades van vandaag op
    const today = new Date().toISOString().split("T")[0];
    const { data: tradeData } = await supabase.from("user_trades").select("*").gte("created_at", today);
    if (tradeData) {
      setTradesToday(tradeData);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update Max Daily Trades per gebruiker
  const handleUpdateMaxTrades = async (userId, maxTrades) => {
    const { error } = await supabase
      .from("profiles")
      .update({ max_daily_trades: parseInt(maxTrades) })
      .eq("id", userId);

    if (error) {
      alert("Error updating trades limit: " + error.message);
    } else {
      alert(`Updated max trades to ${maxTrades} for user.`);
      fetchData();
    }
  };

  // Signaal Updaten MET UPSERT
  const handleUpdateSignal = async (e) => {
    e.preventDefault();
    setSignalMsg("");

    const { error } = await supabase
      .from("trading_signals")
      .upsert({
        id: 1,
        pair: signalPair,
        profit_percentage: parseFloat(signalProfit),
        is_active: true,
        updated_at: new Date()
      });

    if (error) {
      setSignalMsg("Error updating signal: " + error.message);
    } else {
      setSignalMsg("✅ Signal successfully updated and saved!");
      fetchData();
    }
  };

  const updateUser = async (user) => {
    if (user.wallet) {
      const { error } = await supabase
        .from("wallets")
        .update({
          total_deposit: user.wallet.total_deposit,
          balance: user.wallet.balance,
          bonus: user.wallet.bonus
        })
        .eq("user_id", user.id);

      if (error) {
        console.log(error);
        return;
      }
    }

    await supabase.from("profiles").update({ status: user.status }).eq("id", user.id);

    alert("User updated");
    fetchData();
  };

  const approveDeposit = async (deposit) => {
    const user = users.find((user) => user.id === deposit.user_id);

    if (!user) {
      alert("User not found");
      return;
    }

    const amount = Number(deposit.amount);

    if (!user.wallet) {
      const { error } = await supabase.from("wallets").insert({
        user_id: deposit.user_id,
        total_deposit: amount,
        balance: amount,
        bonus: 0
      });

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("wallets")
        .update({
          total_deposit: Number(user.wallet.total_deposit || 0) + amount,
          balance: Number(user.wallet.balance || 0) + amount
        })
        .eq("user_id", deposit.user_id);

      if (error) {
        alert(error.message);
        return;
      }
    }

    await supabase.from("deposits").update({ status: "Approved" }).eq("id", deposit.id);

    alert("Deposit approved");
    fetchData();
  };

  const rejectDeposit = async (deposit) => {
    await supabase.from("deposits").update({ status: "Rejected" }).eq("id", deposit.id);

    alert("Deposit rejected");
    fetchData();
  };

  const approveWithdrawal = async (withdrawal) => {
    const user = users.find((user) => user.id === withdrawal.user_id);

    if (!user || !user.wallet) {
      alert("Wallet not found");
      return;
    }

    const amount = Number(withdrawal.amount);

    if (user.wallet.balance < amount) {
      alert("Insufficient balance");
      return;
    }

    const { error: walletError } = await supabase
      .from("wallets")
      .update({ balance: Number(user.wallet.balance) - amount })
      .eq("user_id", withdrawal.user_id);

    if (walletError) {
      alert(walletError.message);
      return;
    }

    const { error } = await supabase.from("withdrawals").update({ status: "Approved" }).eq("id", withdrawal.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Withdrawal approved");
    fetchData();
  };

  const rejectWithdrawal = async (withdrawal) => {
    const { error } = await supabase.from("withdrawals").update({ status: "Rejected" }).eq("id", withdrawal.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Withdrawal rejected");
    fetchData();
  };

  const approveVerification = async (id) => {
    const { error } = await supabase.from("verifications").update({ status: "Approved" }).eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Verification approved");
    fetchData();
  };

  const rejectVerification = async (id) => {
    const { error } = await supabase.from("verifications").update({ status: "Rejected" }).eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Verification rejected");
    fetchData();
  };

  return (
    <div className="p-4 md:p-8 text-white overflow-x-hidden space-y-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* OVERZICHTS KAARTEN */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-900 p-5 rounded-xl">
          <p className="text-gray-400">Total Users</p>
          <h2 className="text-3xl font-bold">{users.length}</h2>
        </div>

        <div className="bg-gray-900 p-5 rounded-xl">
          <p className="text-gray-400">Pending Deposits</p>
          <h2 className="text-3xl font-bold">{deposits.filter((d) => d.status === "Pending").length}</h2>
        </div>

        <div className="bg-gray-900 p-5 rounded-xl">
          <p className="text-gray-400">Pending Withdrawals</p>
          <h2 className="text-3xl font-bold">{withdrawals.filter((w) => w.status === "Pending").length}</h2>
        </div>

        <div className="bg-gray-900 p-5 rounded-xl">
          <p className="text-gray-400">Total Deposits</p>
          <h2 className="text-3xl font-bold">
            ${users.reduce((total, user) => total + (user.wallet?.total_deposit || 0), 0)}
          </h2>
        </div>
      </div>

      {/* 1. DAGELIJKS TRADING SIGNAAL BEHEREN */}
      <div className="bg-gray-900 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-2">Manage Active Trading Signal</h2>
        <p className="text-xs text-gray-400 mb-4">Set the active pair and profit percentage for users.</p>

        {signalMsg && <div className="p-3 mb-4 rounded bg-emerald-500/10 text-emerald-400 text-sm">{signalMsg}</div>}

        <form onSubmit={handleUpdateSignal} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Trading Pair</label>
            <input
              type="text"
              value={signalPair}
              onChange={(e) => setSignalPair(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Profit Percentage (%)</label>
            <input
              type="number"
              step="0.1"
              value={signalProfit}
              onChange={(e) => setSignalProfit(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
            />
          </div>

          <div className="flex items-end">
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded transition text-sm">
              Update Signal
            </button>
          </div>
        </form>
      </div>

      {/* 2. GEBRUIKERS BEHEREN + MAX TRADES INSTELLEN */}
      <div className="bg-gray-900 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Manage Daily Trades Permission per User</h2>
        <p className="text-xs text-gray-400 mb-4">Standard: 2 trades (10 AM & 12 PM). You can give specific users access to 3 trades (2 PM) or 4 trades (3 PM).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-3">User Email / Name</th>
                <th className="p-3">Current Allowed Trades</th>
                <th className="p-3">Change Limit</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/50">
                  <td className="p-3 font-semibold">{u.email || u.name || u.id}</td>
                  <td className="p-3 text-amber-400 font-bold">{u.max_daily_trades || 2} Trades / day</td>
                  <td className="p-3">
                    <select
                      value={u.max_daily_trades || 2}
                      onChange={(e) => handleUpdateMaxTrades(u.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value={2}>2 Trades (Default: 10AM, 12PM)</option>
                      <option value={3}>3 Trades (+ 2PM)</option>
                      <option value={4}>4 Trades (+ 3PM)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UsersTable users={users} setUsers={setUsers} updateUser={updateUser} />

      {/* DEPOSIT REQUESTS */}
      <div className="bg-gray-900 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Deposit Requests</h2>
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-gray-400">
              <tr>
                <th className="p-3">Coin</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="border-t border-gray-800">
                  <td className="p-3">{deposit.coin}</td>
                  <td className="p-3">${deposit.amount}</td>
                  <td className="p-3">{deposit.status}</td>
                  <td className="p-3">
                    {deposit.status === "Pending" && (
                      <>
                        <button onClick={() => approveDeposit(deposit)} className="bg-green-500 px-3 py-2 rounded mr-2">
                          Approve
                        </button>
                        <button onClick={() => rejectDeposit(deposit)} className="bg-red-500 px-3 py-2 rounded">
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WITHDRAWAL REQUESTS */}
      <div className="bg-gray-900 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Withdrawal Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="text-gray-400">
              <tr>
                <th className="p-3">Coin</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Wallet Address</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="border-t border-gray-800">
                  <td className="p-3">{withdrawal.coin}</td>
                  <td className="p-3">${withdrawal.amount}</td>
                  <td className="p-3 break-all max-w-[250px]">{withdrawal.wallet_adress}</td>
                  <td className="p-3">{withdrawal.status}</td>
                  <td className="p-3">
                    {withdrawal.status === "Pending" && (
                      <>
                        <button onClick={() => approveWithdrawal(withdrawal)} className="bg-green-500 px-3 py-2 rounded mr-2">
                          Approve
                        </button>
                        <button onClick={() => rejectWithdrawal(withdrawal)} className="bg-red-500 px-3 py-2 rounded">
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VERIFICATION REQUESTS (FRONT & BACK ID) */}
      <div className="bg-gray-900 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">ID Verification Requests</h2>
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[700px] text-left">
            <thead className="text-gray-400">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Documents (Front & Back)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {verifications.map((verification) => (
                <tr key={verification.id} className="border-t border-gray-800">
                  <td className="p-3">{verification.profile?.name}</td>
                  <td className="p-3">{verification.profile?.email}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <a 
                        href={verification.front_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2.5 py-1.5 rounded hover:bg-blue-600/30 transition"
                      >
                        Front ID ↗
                      </a>
                      <a 
                        href={verification.back_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2.5 py-1.5 rounded hover:bg-blue-600/30 transition"
                      >
                        Back ID ↗
                      </a>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={verification.status === "Approved" ? "text-green-400 font-bold" : verification.status === "Rejected" ? "text-red-400 font-bold" : "text-amber-400 font-bold"}>
                      {verification.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {verification.status === "Pending" && (
                      <>
                        <button onClick={() => approveVerification(verification.id)} className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-2 rounded mr-2 font-bold transition">
                          Approve
                        </button>
                        <button onClick={() => rejectVerification(verification.id)} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-2 rounded font-bold transition">
                          Reject
                        </button>
                      </>
                    )}
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

export default Admin;