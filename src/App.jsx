import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Verification from "./pages/Verification";
import Transactions from "./pages/Transactions";
import Wallet from "./pages/Wallet";
import Withdraw from "./pages/Withdraw";
import Deposit from "./pages/Deposit";
import Trade from "./pages/Trade";
import TransferPage from "./pages/Transfer";
import LogoutButton from "./components/LogoutButton";
import MarketOverview from "./components/MarketOverview";

const CoinLogo = ({ symbol }) => {
  const s = (symbol || "").toUpperCase();
  let logoUrl = "";

  if (s === "BTC") {
  logoUrl = "https://assets.coingecko.com/coins/images/1/large/bitcoin.png";
} else if (s === "ETH") {
  logoUrl = "https://assets.coingecko.com/coins/images/279/large/ethereum.png";
} else {
  logoUrl = "https://assets.coingecko.com/coins/images/325/large/Tether.png";
}

  return (
    <div className="w-10 h-10 rounded-full bg-[#1e2738] border border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-md">
      <img src={logoUrl} alt={s} className="w-full h-full object-contain" />
    </div>
  );
};


function ExchangePage({ refreshDashboard, assets, liveRates }) {
  const [fromCoin, setFromCoin] = useState("USDT");
  const [toCoin, setToCoin] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [walletData, setWalletData] = useState(null);
  useEffect(() => {
  const loadWallet = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load wallet:", error);
      return;
    }

    setWalletData(data);
  };

  loadWallet();
}, []);

 const currentAssetRow = assets.find(
  a => (a.coin || "").toUpperCase() === fromCoin.toUpperCase()
);

const availableBalance =
  fromCoin === "USDT"
    ? Number(walletData?.balance || 0) +
      Number(walletData?.bonus || 0)
    : currentAssetRow
      ? Number(
          currentAssetRow.available ||
          currentAssetRow.balance ||
          0
        )
      : 0;


  const calculateConversion = () => {
    if (!amount || isNaN(amount)) return "0.00";
    const val = parseFloat(amount);
    const fromRate = liveRates[fromCoin] || 1;
    const toRate = liveRates[toCoin] || 1;
    const result = (val * fromRate) / toRate;
    return result.toFixed(6);
  };

  const handleExchange = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      setMessage({ text: "Please enter a valid amount to exchange.", type: "error" });
      return;
    }

    if (numAmount > availableBalance) {
      setMessage({ text: `Insufficient ${fromCoin} balance. Available: ${availableBalance.toFixed(6)} ${fromCoin}`, type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();

if (!user) throw new Error("User not authenticated");


const walletBalance =
  Number(walletData?.balance || 0);

const walletBonus =
  Number(walletData?.bonus || 0);

const exchangeAvailable =
  walletBalance + walletBonus;

      const convertedValue = parseFloat(calculateConversion());

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

 if (fromCoin !== "USDT") {
  await updateAssetBalance(
    fromCoin,
    numAmount,
    false
  );
}

if (toCoin !== "USDT") {
  await updateAssetBalance(
    toCoin,
    convertedValue,
    true
  );
}


// USDT -> Crypto
if (fromCoin === "USDT") {
  let remainingAmount = numAmount;

  const balanceUsed = Math.min(
    walletBalance,
    remainingAmount
  );

  remainingAmount -= balanceUsed;

  const newBalance =
    walletBalance - balanceUsed;

  const bonusUsed = Math.min(
    walletBonus,
    remainingAmount
  );

  remainingAmount -= bonusUsed;

  const newBonus =
    walletBonus - bonusUsed;

  if (remainingAmount > 0) {
    throw new Error("Insufficient Exchange balance.");
  }

  const { error } = await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      bonus: newBonus
    })
    .eq("user_id", user.id);

  if (error) throw error;

  const newExchangeBalance =
    newBalance + newBonus;

  const { error: assetError } = await supabase
    .from("user_assets")
    .update({
      balance: newExchangeBalance,
      available: newExchangeBalance
    })
    .eq("user_id", user.id)
    .eq("coin", "USDT");

  if (assetError) throw assetError;
}


// Crypto -> USDT
if (toCoin === "USDT") {
  const newBalance =
    walletBalance + convertedValue;

  const { error } = await supabase
    .from("wallets")
    .update({
      balance: newBalance
    })
    .eq("user_id", user.id);

  if (error) throw error;

  const newExchangeBalance =
    newBalance + walletBonus;

  const { error: assetError } = await supabase
    .from("user_assets")
    .update({
      balance: newExchangeBalance,
      available: newExchangeBalance
    })
    .eq("user_id", user.id)
    .eq("coin", "USDT");

  if (assetError) throw assetError;
}
      await supabase.from("transactions").insert([
        {
          user_id: user.id,
          type: "Exchange",
          coin: `${fromCoin} ➔ ${toCoin}`,
          amount: numAmount,
          status: "Completed",
          network: `Received ${convertedValue} ${toCoin}`,
          description: `Exchanged ${numAmount} ${fromCoin} to ${convertedValue} ${toCoin} at live rate`,
          created_at: new Date().toISOString()
        }
      ]);

      setMessage({ text: `Successfully exchanged ${numAmount} ${fromCoin} to ${convertedValue} ${toCoin}!`, type: "success" });
      setAmount("");
      
      if (refreshDashboard) {
        await refreshDashboard();
      }
    } catch (err) {
      setMessage({ text: err.message || "An error occurred during exchange.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#161d2a] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
      <h2 className="text-2xl font-black mb-2 text-white">Crypto & Asset Exchange</h2>
      <p className="text-slate-400 text-sm mb-6">Instantly swap your assets at real-time live market rates.</p>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold ${message.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleExchange} className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs uppercase font-bold text-slate-400">From (Sell)</label>
            <span className="text-xs text-blue-400 font-semibold">Available: {availableBalance.toFixed(6)} {fromCoin}</span>
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-lg font-semibold"
            />
            <select
              value={fromCoin}
              onChange={(e) => setFromCoin(e.target.value)}
              className="bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
            >
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
        </div>

        <div className="flex justify-center my-2">
          <button
            type="button"
            onClick={() => {
              const temp = fromCoin;
              setFromCoin(toCoin);
              setToCoin(temp);
            }}
            className="w-10 h-10 rounded-full bg-[#1e2738] border border-slate-700 flex items-center justify-center text-blue-400 hover:bg-slate-800 transition shadow-lg"
          >
            ⇅
          </button>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-slate-400 mb-2">To (Receive - Live Estimated)</label>
          <div className="flex gap-3">
            <input
              type="text"
              readOnly
              value={calculateConversion()}
              className="flex-1 bg-[#0b0e14]/50 border border-slate-800 rounded-xl px-4 py-3 text-emerald-400 text-lg font-bold"
            />
            <select
              value={toCoin}
              onChange={(e) => setToCoin(e.target.value)}
              className="bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
            >
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:opacity-90 transition disabled:opacity-50 text-base"
        >
          {loading ? "Processing Exchange..." : "Exchange Now"}
        </button>
      </form>
    </div>
  );
}

function WithdrawPage({ assets, refreshDashboard }) {
  const [walletData, setWalletData] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const loadWallet = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load wallet:", error);
        return;
      }

      setWalletData(data);
    };

    loadWallet();
  }, []);

  const currentAssetRow = assets.find(
    a =>
      (a.coin || "").toUpperCase() ===
      selectedAsset.toUpperCase()
  );

  const availableBalance =
    selectedAsset === "USDT"
      ? Number(walletData?.balance || 0) +
        Number(walletData?.bonus || 0)
      : currentAssetRow
        ? Number(
            currentAssetRow.available ||
            currentAssetRow.balance ||
            0
          )
        : 0;

  const numAmount = parseFloat(amount) || 0;

  const fee = numAmount * 0.10;

  const youReceive = Math.max(
    0,
    numAmount - fee
  );
const handleWithdraw = async (e) => {
  e.preventDefault();

  if (numAmount <= 0) {
    setMessage({
      text: "Please enter a valid withdrawal amount.",
      type: "error"
    });
    return;
  }

  if (!walletAddress.trim()) {
    setMessage({
      text: "Please enter a valid destination wallet address.",
      type: "error"
    });
    return;
  }

  if (numAmount > availableBalance) {
    setMessage({
      text: `Insufficient ${selectedAsset} balance for this withdrawal.`,
      type: "error"
    });
    return;
  }

  setLoading(true);
  setMessage({ text: "", type: "" });

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("withdrawals")
      .insert([
        {
          user_id: user.id,
          coin: selectedAsset,
          network: network,
          wallet_address: walletAddress,
          amount: numAmount,
          fee: fee,
          receive_amount: youReceive,
          status: "pending"
        }
      ]);

    if (error) throw error;

    setMessage({
      text: "Withdrawal request submitted successfully! Pending approval.",
      type: "success"
    });

    setAmount("");
    setWalletAddress("");

    if (refreshDashboard) {
      await refreshDashboard();
    }

  } catch (err) {
    console.error("Withdrawal error:", err);

    setMessage({
      text: err.message || "Failed to process withdrawal.",
      type: "error"
    });

  } finally {
    setLoading(false);
  }
};
  return (
    <div className="max-w-2xl mx-auto bg-[#161d2a] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
      <h2 className="text-2xl font-black mb-2 text-white">Withdraw Funds</h2>
      <p className="text-slate-400 text-sm mb-6">Withdraw your digital assets safely to an external wallet.</p>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold ${message.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleWithdraw} className="space-y-6">
        <div>
          <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Select Asset</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
          >
            {assets.map((a, idx) => (
              <option key={idx} value={a.coin || "USDT"}>{(a.coin || "USDT").toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Network</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
          >
            <option value="TRC20">TRC20</option>
            <option value="ERC20">ERC20</option>
            <option value="BTC Network">BTC Network</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Withdrawal Address</label>
          <input
  type="text"
  placeholder="Enter wallet address"
  value={walletAddress}
  onChange={(e) => setWalletAddress(e.target.value)}
  className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white"
/>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Amount</label>
          <input
            type="number"
            step="any"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-semibold text-lg"
          />
        </div>

        <div className="bg-[#0b0e14]/60 border border-slate-800/80 p-4 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Available Balance:</span>
            <span className="font-bold text-white">{availableBalance.toFixed(6)} {selectedAsset}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Network Fee (10%):</span>
            <span className="font-bold text-amber-400">{fee.toFixed(6)} {selectedAsset}</span>
          </div>
          <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-800 font-bold text-base">
            <span>You Receive:</span>
            <span className="text-emerald-400">{youReceive.toFixed(6)} {selectedAsset}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:opacity-90 transition disabled:opacity-50 text-base"
        >
          {loading ? "Submitting Request..." : "Withdraw Funds"}
        </button>
      </form>
    </div>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (location.pathname === "/login" || location.pathname === "/register") {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col md:flex-row overflow-x-hidden font-sans">
      <aside
        className={`
          fixed md:static top-0 left-0 min-h-screen w-64 bg-[#111622] border-r border-slate-800/80 p-6 shrink-0 flex flex-col justify-between transform transition-transform duration-300 z-50
          ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="CashPrime Logo" className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-amber-500/10 shrink-0" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                Cash<span className="text-[#f5c453]">Prime</span>
              </h1>
              <p className="text-[9px] text-amber-400/80 uppercase tracking-widest font-semibold mt-1">Signal Program</p>
            </div>
          </div>

          <button onClick={() => setMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-xl text-gray-400 hover:text-white">✕</button>

          <nav className="flex flex-col space-y-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 bg-[#1e2738] text-[#f5c453] rounded-xl font-medium text-sm border-l-4 border-[#f5c453] transition">Dashboard</Link>
            <Link to="/trade" onClick={() => setMenuOpen(false)} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-4 py-3 rounded-xl text-center shadow-lg shadow-emerald-500/15 transition text-sm my-2">Trade</Link>
            <Link to="/exchange" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition">Exchange</Link>
            <Link to="/wallet" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition">Wallet</Link>
            <Link to="/deposit" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition">Deposit</Link>
            <Link to="/withdraw" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition">Withdraw</Link>
            <Link to="/transactions" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition">Transactions</Link>
            <Link to="/verification" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition">ID Verification</Link>
            <Link to="/settings" onClick={() => setMenuOpen(false)} className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition">Settings</Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800/80">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 w-full min-w-0 p-4 md:p-8 bg-gradient-to-b from-[#0b0e14] to-[#111622] overflow-y-auto">
        <button onClick={() => setMenuOpen(true)} className="md:hidden bg-[#161d2a] text-white p-3 rounded-lg mb-4 border border-slate-800">☰ Menu</button>
        {children}
      </main>
    </div>
  );
}

function App() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [assets, setAssets] = useState([]);

  const [totalValuation, setTotalValuation] = useState(0);
  const [exchangeBalance, setExchangeBalance] = useState(0);
  const [tradeBalance, setTradeBalance] = useState(0);

   const [liveRates, setLiveRates] = useState({
    USDT: 1,
    BTC: 64694,
    ETH: 1918.23
});
useEffect(() => {
  const fetchLivePrices = async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum&vs_currencies=usd"
      );

      if (!res.ok) {
        throw new Error(
          `Failed to fetch crypto rates: ${res.status}`
        );
      }

      const data = await res.json();

      if (data && data.bitcoin && data.ethereum) {
        setLiveRates({
          USDT: 1,
          BTC: data.bitcoin.usd,
          ETH: data.ethereum.usd
        });
      }
    } catch (err) {
      console.error(
        "Kon live prijzen niet ophalen",
        err
      );
    }
  };

  // Direct één keer ophalen
  fetchLivePrices();

  // Daarna iedere 60 seconden
  const interval = setInterval(
    fetchLivePrices,
    60000
  );

  return () => clearInterval(interval)
}, []);

const loadDashboard = async () => {

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;


    // 1. Haal de walletgegevens één keer goed op
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletData) {
      setWallet(walletData); 
    }

   let fetchedTradingBal = Number(walletData?.trading_balance || 0);

setTradeBalance(fetchedTradingBal);
    // --- HIER OPLOSSEN: Haal de werkelijke winst op uit user_trades ---
    const { data: userTrades } = await supabase
      .from("user_trades")
      .select("profit_amount, created_at")
      .eq("user_id", user.id)
console.log("ALL USER TRADES DETAILS:", JSON.stringify(userTrades, null, 2));




    const calculatedEarnings = userTrades 
      ? userTrades.reduce((acc, t) => acc + (Number(t.profit_amount) || 0), 0) 
      : 0;
    // -------------------------------------------------------------

    // 2. Haal de assets op zoals je al deed
    const { data: assetData } = await supabase
      .from("user_assets")
      .select("*")
      .eq("user_id", user.id);

    let formattedAssets = assetData || [];

    const hasUsdt = formattedAssets.some(a => (a.coin || "").toUpperCase() === "USDT");
    const hasBtc = formattedAssets.some(a => (a.coin || "").toUpperCase() === "BTC");
    const hasEth = formattedAssets.some(a => (a.coin || "").toUpperCase() === "ETH");


const usdtAsset = formattedAssets.find(
  a => (a.coin || "").toUpperCase() === "USDT"
);

// USDT = Exchange Account
const currentUsdtBal = Number(
  walletData?.balance ?? usdtAsset?.balance ?? 0
);

if (usdtAsset) {
  usdtAsset.balance = currentUsdtBal;
  usdtAsset.available = currentUsdtBal;
}

if (!hasUsdt && formattedAssets.length === 0) {
  formattedAssets = [
    { coin: "USDT", available: currentUsdtBal, frozen: 0, balance: currentUsdtBal },
    { coin: "BTC", available: 0, frozen: 0, balance: 0 },
    { coin: "ETH", available: 0, frozen: 0, balance: 0 }
  ];
} else {
  if (!hasUsdt) {
    formattedAssets.push({
      coin: "USDT",
      available: currentUsdtBal,
      frozen: 0,
      balance: currentUsdtBal
    });
  }

  if (!hasBtc) {
    formattedAssets.push({
      coin: "BTC",
      available: 0,
      frozen: 0,
      balance: 0
    });
  }

  if (!hasEth) {
    formattedAssets.push({
      coin: "ETH",
      available: 0,
      frozen: 0,
      balance: 0
    });
  }
}

setAssets(formattedAssets);


// --- DIRECTE SYNCHRONISATIE MET DATABASE ---
const adminBalance = Number(
  walletData?.balance ?? currentUsdtBal ?? 0
);

console.log("WALLET DATA:", walletData);
console.log("USDT ASSET:", usdtAsset);
console.log("ADMIN BALANCE:", adminBalance);

const adminBonus = Number(walletData?.bonus || 0);
const currentTradingBal = Number(walletData?.trading_balance || 0);

// Exchange = echte USDT + bonus
const availableExchangeBalance =
  adminBalance + adminBonus;

// --- ASSET VALUATION BEREKENING ---

// Bereken de werkelijke waarde van BTC / ETH / andere crypto-assets
// USDT wordt hier bewust niet meegenomen, omdat USDT al in
// availableExchangeBalance zit.
const cryptoValue = formattedAssets.reduce(
  (total, asset) => {

    const coin = (asset.coin || "").toUpperCase();

    if (coin === "USDT") {
      return total;
    }

    const amount = Number(asset.balance || 0);
    const rate = Number(liveRates[coin] || 0);

    return total + (amount * rate);
  },
  0
);

console.log("REAL CRYPTO VALUE:", cryptoValue);

// TOTALE ASSET VALUATION
const exactTotalValuation =
  availableExchangeBalance +
  currentTradingBal +
  cryptoValue;

console.log("EXACT TOTAL VALUATION:", exactTotalValuation);

setTotalValuation(exactTotalValuation);

// Balansen naar UI
setExchangeBalance(availableExchangeBalance);
setTradeBalance(currentTradingBal);


// Earnings berekenen

const today = new Date();
today.setHours(0, 0, 0, 0);

const todayTrades = userTrades?.filter((trade) => {
  return new Date(trade.created_at) >= today;
}) || [];

const todayEarnings = todayTrades.reduce(
  (acc, trade) => acc + (Number(trade.profit_amount) || 0),
  0
);

console.log("TODAY TRADES DASHBOARD DETAILS:", JSON.stringify(todayTrades, null, 2));
console.log("TODAY EARNINGS DASHBOARD:", todayEarnings);

setTodaysEarnings(todayEarnings.toFixed(2));
setTotalEarnings(calculatedEarnings.toFixed(2));


// --- TRANSACTIES OPHALEN ---
const { data: txData } = await supabase
  .from("transactions")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });


console.log("TRANSACTIONS:", txData);


const { data: deposits } = await supabase
  .from("deposits")
  .select("*")
  .eq("user_id", user.id);


const { data: withdrawals } = await supabase
  .from("withdrawals")
  .select("*")
  .eq("user_id", user.id);



const combinedTx = [
  ...(txData || []),

  ...(deposits || []).map(d => ({
    ...d,
    type: "Deposit",
    amount: d.amount || d.recharge_amount,
    status: d.status || "Completed",
    created_at: d.created_at || d.date
  })),

  ...(withdrawals || []).map(w => ({
    ...w,
    type: "Withdrawal",
    amount: w.amount,
    status: w.status || "Pending",
    created_at: w.created_at || w.date
  }))

].sort(
  (a,b) =>
  new Date(b.created_at || 0) -
  new Date(a.created_at || 0)
);


setTransactions(combinedTx);


console.log("DEPOSITS:", deposits);
console.log("WITHDRAWALS:", withdrawals);
console.log("COMBINED:", combinedTx);
  };

useEffect(() => {
loadDashboard();
}, [liveRates]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/trade" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
          <Route path="/exchange" element={
            <ProtectedRoute>
              <ExchangePage 
                refreshDashboard={loadDashboard} 
                assets={assets} 
                liveRates={liveRates}
              />
            </ProtectedRoute>
          } />
          <Route path="/transfer" element={
            <ProtectedRoute>
              <TransferPage 
                exchangeBalance={exchangeBalance}
                tradeBalance={tradeBalance}
                refreshDashboard={loadDashboard}
              />
            </ProtectedRoute>
          } />
          <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/withdraw" element={
            <ProtectedRoute>
              <WithdrawPage 
                assets={assets} 
                refreshDashboard={loadDashboard} 
              />
            </ProtectedRoute>
          } />
          <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Welcome to CashPrime</h2>
                    <p className="text-slate-400 text-xs mt-1">Overview of your assets, live market metrics, and recent activities.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Account Status: Verified
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/10 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-blue-200 text-xs font-semibold tracking-wider uppercase">Asset Valuation (Live)</span>
                        <span className="bg-white/25 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-bold">USD</span>
                      </div>

                      <div className="text-4xl font-black tracking-tight mb-3">
                        ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      <div className="inline-flex items-center gap-2 bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-lg text-xs font-semibold mb-6">
                        <span>Today's Earnings:</span>
                        <span className="font-bold">+${todaysEarnings}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/15 text-center">
                      <Link to="/withdraw" className="flex flex-col items-center gap-1.5 hover:opacity-80 transition">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">↑</div>
                        <span className="text-xs font-medium">Withdraw</span>
                      </Link>
                      <Link to="/deposit" className="flex flex-col items-center gap-1.5 hover:opacity-80 transition">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">↓</div>
                        <span className="text-xs font-medium">Recharge</span>
                      </Link>
                      <Link to="/transfer" className="flex flex-col items-center gap-1.5 hover:opacity-80 transition">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium">Transfer</span>
                      </Link>
                      <Link to="/exchange" className="flex flex-col items-center gap-1.5 hover:opacity-80 transition">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium">Exchange</span>
                      </Link>
                    </div>
                  </div>

  <div className="flex flex-col gap-4">
                    <div className="bg-[#161d2a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition h-full">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">My Account / Exchange</div>
                        <div className="text-sm font-semibold text-slate-300">Available Balance</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-400 mt-0.5">
                        ${exchangeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  

                    <div className="bg-[#161d2a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">My Account / Trade</div>
                        <div className="text-sm font-semibold text-slate-300">Available Balance</div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400 mt-0.5">
                        ${tradeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4 text-white">Account Assets (Real-Time Rates)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {assets.map((asset, idx) => {
                      const coinName = (asset.coin || 'USDT').toUpperCase();
                      const rate = liveRates[coinName] || 1;
                      const coinBalance =
  coinName === "USDT"
    ? exchangeBalance
    : Number(asset.balance || 0);

const usdValue = coinBalance * rate;
                      return (
                        <div key={idx} className="bg-[#161d2a] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CoinLogo symbol={coinName} />
                            <div>
                              <div className="font-bold text-white text-base">{coinName}</div>
                              <div className="text-xs text-slate-400">Balance: {coinBalance.toFixed(6)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="text-[10px] text-slate-500">Rate: ${rate.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <MarketOverview liveRates={liveRates} />

                <div className="bg-[#161d2a] border border-slate-800 rounded-2xl p-6 mt-8 mb-12">
                  <h3 className="text-lg font-bold mb-4 text-white">Recent Transactions</h3>
                  {transactions.length === 0 ? (
                    <p className="text-slate-400 text-sm">No recent transactions found.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto pr-2">
                      <table className="w-full text-left text-sm text-slate-300 border-collapse">
                        <thead className="text-xs uppercase bg-[#0b0e14] text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 bg-[#0b0e14]">Type</th>
                            <th className="px-4 py-3 bg-[#0b0e14]">Coin / Details</th>
                            <th className="px-4 py-3 bg-[#0b0e14]">Amount</th>
                            <th className="px-4 py-3 bg-[#0b0e14]">Status</th>
                            <th className="px-4 py-3 bg-[#0b0e14]">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {transactions.map((tx, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition">
                              <td className="px-4 py-3 font-semibold text-white">{tx.type}</td>
                              <td className="px-4 py-3 text-slate-400">{tx.coin || tx.description || "-"}</td>
                              <td className="px-4 py-3 font-bold text-white">{tx.amount ? Number(tx.amount).toFixed(2) : "0.00"}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  tx.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  tx.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                  "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">
                                {tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;