import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Withdraw() {
  const [coin, setCoin] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);

  const feePercentage = 0.10;

  const feeAmount = amount
    ? Number(amount) * feePercentage
    : 0;

  const receiveAmount = amount
    ? Number(amount) - feeAmount
    : 0;

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: walletData, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletError) {
      console.log(walletError);
      return;
    }

    setWallet(walletData);

    const { data: withdrawData, error: withdrawError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (withdrawError) {
      console.log(withdrawError);
      return;
    }

    setWithdrawals(withdrawData || []);
  };

  useEffect(() => {
    loadData();
  }, []);

const submitWithdraw = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login");
      return;
    }

    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      alert("Enter amount");
      return;
    }

    if (!wallet || wallet.balance < withdrawAmount) {
      alert("Insufficient balance");
      return;
    }

    if (!walletAddress) {
      alert("Enter wallet address");
      return;
    }

   const fee = withdrawAmount * feePercentage;
    const receive = withdrawAmount - fee;

    const { error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount: receive,             // Dit is nu 900 in plaats van 1000, waardoor de admin direct het uit te betalen bedrag ziet!
        fee: fee,
        receive_amount: receive,
        coin: coin,
        network: network,
        wallet_adress: walletAddress,
        status: "Pending"
      });

    if (error) {
      console.log(error);
      alert(error.message);
      return;
    }

    alert("Withdrawal request submitted");

    setAmount("");
    setWalletAddress("");
    loadData();
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl max-w-xl">
      <h1 className="text-3xl font-bold mb-6">
        Withdraw Crypto
      </h1>

      <label className="text-gray-400">
        Select Asset
      </label>
      <select
        className="bg-gray-800 p-3 rounded w-full mt-2"
        value={coin}
        onChange={(e) => {
          setCoin(e.target.value);
          if (e.target.value === "USDT") {
            setNetwork("TRC20");
          }
          if (e.target.value === "BTC") {
            setNetwork("BTC");
          }
          if (e.target.value === "ETH") {
            setNetwork("ERC20");
          }
        }}
      >
        <option value="USDT">USDT</option>
        <option value="BTC">Bitcoin</option>
        <option value="ETH">Ethereum</option>
      </select>

      <label className="text-gray-400 block mt-5">
        Network
      </label>
      <select
        className="bg-gray-800 p-3 rounded w-full mt-2"
        value={network}
        onChange={(e) => setNetwork(e.target.value)}
      >
        <option>TRC20</option>
        <option>ERC20</option>
        <option>BEP20</option>
      </select>

      <label className="text-gray-400 block mt-5">
        Withdrawal Address
      </label>
      <input
        className="bg-gray-800 p-3 rounded w-full mt-2"
        placeholder="Enter wallet address"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
      />

      <label className="text-gray-400 block mt-5">
        Amount
      </label>
      <input
        type="number"
        className="bg-gray-800 p-3 rounded w-full mt-2"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div className="bg-gray-800 rounded-xl p-4 mt-6">
        <div className="flex justify-between">
          <span className="text-gray-400">Available Balance</span>
          <span>{wallet?.balance || 0} {coin}</span>
        </div>

        <div className="flex justify-between mt-3">
          <span className="text-gray-400">Network Fee (10%)</span>
          <span>{feeAmount.toFixed(2)} {coin}</span>
        </div>

        <div className="flex justify-between mt-3 font-bold">
          <span>You Receive</span>
          <span className="text-green-400">
            {receiveAmount > 0 ? receiveAmount.toFixed(2) : 0} {coin}
          </span>
        </div>
      </div>

      <button
        onClick={submitWithdraw}
        className="mt-6 bg-blue-500 w-full py-3 rounded font-bold hover:bg-blue-600 transition"
      >
        Withdraw
      </button>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">
          Withdrawal History
        </h2>

        <div className="bg-gray-800 rounded-xl p-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Coin</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Fee</th>
                <th className="p-3">Receive</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-3 text-gray-400 text-center">
                    No withdrawals yet
                  </td>
                </tr>
              )}

              {withdrawals.map((w) => (
                <tr key={w.id} className="border-b border-gray-700">
                  <td className="p-3">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{w.coin}</td>
                  <td className="p-3">{w.amount}</td>
                  <td className="p-3">{w.fee}</td>
                  <td className="p-3">{w.receive_amount}</td>
                  <td className="p-3 font-semibold text-amber-400">{w.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Withdraw;