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
import Transfer from "./pages/Transfer";
import LogoutButton from "./components/LogoutButton";
import MarketOverview from "./components/MarketOverview";

const COIN_RATES = {
  USDT: 1,
  BTC: 65000,
  ETH: 35000,
};

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

function ExchangePage({ refreshDashboard, assets, walletBalance }) {
  const [fromCoin, setFromCoin] = useState("USDT");
  const [toCoin, setToCoin] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const currentAssetRow = assets.find(a => (a.coin || "").toUpperCase() === fromCoin.toUpperCase());
  const availableBalance = currentAssetRow 
    ? Number(currentAssetRow.available || currentAssetRow.balance || 0)
    : (fromCoin === "USDT" ? walletBalance : 0);

  const calculateConversion = () => {
    if (!amount || isNaN(amount)) return "0.00";
    const val = parseFloat(amount);
    const fromRate = COIN_RATES[fromCoin] || 1;
    const toRate = COIN_RATES[toCoin] || 1;
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
      setMessage({ text: `Insufficient ${fromCoin} balance. Available: ${availableBalance.toFixed(2)} ${fromCoin}`, type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const convertedValue = parseFloat(calculateConversion());

      // Helper functie om asset in te lezen of aan te maken in Supabase
      const updateOrCreateAsset = async (coinSymbol, amountChange, isAdd) => {
        const { data: existing } = await supabase
          .from("user_assets")
          .select("*")
          .eq("user_id", user.id)
          .eq("coin", coinSymbol)
          .maybeSingle();

        if (existing) {
          const currentBal = Number(existing.balance || 0);
          const currentAvail = Number(existing.available || 0);
          const newBal = isAdd ? currentBal + amountChange : Math.max(0, currentBal - amountChange);
          const newAvail = isAdd ? currentAvail + amountChange : Math.max(0, currentAvail - amountChange);

          await supabase
            .from("user_assets")
            .update({ balance: newBal, available: newAvail })
            .eq("id", existing.id);
        } else if (isAdd) {
          await supabase.from("user_assets").insert([{
            user_id: user.id,
            coin: coinSymbol,
            balance: amountChange,
            available: amountChange,
            frozen: 0
          }]);
        }
      };

      // Verminder fromCoin
      await updateOrCreateAsset(fromCoin, numAmount, false);
      // Verhoog toCoin
      await updateOrCreateAsset(toCoin, convertedValue, true);

      // Transactie loggen
      await supabase.from("transactions").insert([
        {
          user_id: user.id,
          type: "Exchange",
          coin: `${fromCoin} ➔ ${toCoin}`,
          amount: numAmount,
          status: "Completed",
          network: `Received ${convertedValue} ${toCoin}`,
          description: `Exchanged ${numAmount} ${fromCoin} to ${convertedValue} ${toCoin}`,
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
      <p className="text-slate-400 text-sm mb-6">Instantly swap your assets at live market rates.</p>

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
          <label className="block text-xs uppercase font-bold text-slate-400 mb-2">To (Receive - Estimated)</label>
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
          fixed md:static top-0 left-0 h-screen w-64 bg-[#111622] border-r border-slate-800/80 p-6 shrink-0 flex flex-col justify-between transform transition-transform duration-300 z-50
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

      <main className="flex-1 w-full min-w-0 p-4 md:p-8 bg-gradient-to-b from-[#0b0e14] to-[#111622]">
        <button onClick={() => setMenuOpen(true)} className="md:hidden bg-[#161d2a] text-white p-3 rounded-lg mb-4 border border-slate-800">☰ Menu</button>
        {children}
      </main>
    </div>
  );
}

function App() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [todaysEarnings, setTodaysEarnings] = useState("0.00");
  const [assets, setAssets] = useState([]);

  // Balansen gebaseerd op Transfer.js logica
  const [totalValuation, setTotalValuation] = useState(0);
  const [exchangeBalance, setExchangeBalance] = useState(0);
  const [tradeBalance, setTradeBalance] = useState(0);

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Haal wallet gegevens op (totaal en trade-saldo / bonus)
    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance, bonus, todays_earnings")
      .eq("user_id", user.id)
      .single();

    let currentTotalBal = 0;
    let currentTradeBal = 0;
    let currentExchangeBal = 0;

    if (walletData) {
      setWallet(walletData);
      if (walletData.todays_earnings !== undefined) {
        setTodaysEarnings(Number(walletData.todays_earnings).toFixed(2));
      }

      currentTotalBal = Number(walletData.balance || 0);
      currentTradeBal = Number(walletData.bonus || 0);
      currentExchangeBal = Math.max(0, currentTotalBal - currentTradeBal);

      setTotalValuation(currentTotalBal);
      setExchangeBalance(currentExchangeBal);
      setTradeBalance(currentTradeBal);
    }

    // 2. Haal werkelijke opgeslagen assets op uit user_assets
    const { data: assetData } = await supabase
      .from("user_assets")
      .select("*")
      .eq("user_id", user.id);

    let formattedAssets = assetData || [];

    // Controleer of de gebruiker reeds assets heeft opgeslagen. 
    // Zo niet (of als er geen USDT asset record is), vullen we automatisch aan op basis van het exchange-saldo.
    const hasUsdt = formattedAssets.some(a => (a.coin || "").toUpperCase() === "USDT");
    const hasBtc = formattedAssets.some(a => (a.coin || "").toUpperCase() === "BTC");
    const hasEth = formattedAssets.some(a => (a.coin || "").toUpperCase() === "ETH");

    if (!hasUsdt && formattedAssets.length === 0) {
      // Als er helemaal geen assets zijn, zetten we alles in USDT gelijk aan het exchange-saldo
      formattedAssets = [
        { coin: "USDT", available: currentExchangeBal, frozen: 0, balance: currentExchangeBal },
        { coin: "BTC", available: 0, frozen: 0, balance: 0 },
        { coin: "ETH", available: 0, frozen: 0, balance: 0 }
      ];
    } else {
      // Zorg dat ontbrekende standaardmunten er ook netjes tussen staan
      if (!hasUsdt) formattedAssets.push({ coin: "USDT", available: 0, frozen: 0, balance: 0 });
      if (!hasBtc) formattedAssets.push({ coin: "BTC", available: 0, frozen: 0, balance: 0 });
      if (!hasEth) formattedAssets.push({ coin: "ETH", available: 0, frozen: 0, balance: 0 });
    }

    setAssets(formattedAssets);

    // 3. Transacties ophalen
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: deposits } = await supabase.from("deposits").select("*").eq("user_id", user.id);
    const { data: withdrawals } = await supabase.from("withdrawals").select("*").eq("user_id", user.id);

    const combinedTx = [
      ...(txData || []),
      ...(deposits || []).map(d => ({ ...d, type: 'Deposit', amount: d.amount || d.recharge_amount, status: d.status || 'Completed' })),
      ...(withdrawals || []).map(w => ({ ...w, type: 'Withdrawal', amount: w.amount, status: w.status || 'Pending' }))
    ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    setTransactions(combinedTx);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

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
                walletBalance={exchangeBalance} 
              />
            </ProtectedRoute>
          } />
          <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
          <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
          <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Welcome to CashPrime</h2>
                    <p className="text-slate-400 text-xs mt-1">Overview of your assets, market metrics, and recent activities.</p>
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
                        <span className="text-blue-200 text-xs font-semibold tracking-wider uppercase">Asset Valuation</span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-bold">USD</span>
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
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">⇄</div>
                        <span className="text-xs font-medium">Transfer</span>
                      </Link>
                      <Link to="/exchange" className="flex flex-col items-center gap-1.5 hover:opacity-80 transition">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">🔄</div>
                        <span className="text-xs font-medium">Exchange</span>
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="bg-[#161d2a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">My Account / Exchange</div>
                        <div className="text-sm font-semibold text-slate-300">Available Balance</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-400 mt-3">
                        ${exchangeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="bg-[#161d2a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">My Account / Trade</div>
                        <div className="text-sm font-semibold text-slate-300">Available Balance</div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400 mt-3">
                        ${tradeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4 text-white">Account Assets</h3>
                  <div className="grid grid-cols-1 gap-4">
{assets.map((asset, idx) => {
  const coinName = (asset.coin || 'USDT').toUpperCase();
  const rate = COIN_RATES[coinName] || 1;
  
  let coinBalance = coinName === "USDT" && Number(asset.balance || 0) === 0 && exchangeBalance > 0 
    ? exchangeBalance 
    : Number(asset.balance || 0);

  let coinAvailable = coinName === "USDT" && Number(asset.available || 0) === 0 && exchangeBalance > 0 
    ? exchangeBalance 
    : Number(asset.available || asset.balance || 0);

  const coinFrozen = Number(asset.frozen || 0);

  // Wiskundige waarde in USD
  const usdBalanceValue = coinBalance * rate;
  const usdAvailableValue = coinAvailable * rate;

  return (
    <div key={idx} className="bg-[#161d2a] border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition">
      <div className="flex items-center gap-3 w-full md:w-56 shrink-0">
        <CoinLogo symbol={asset.coin} />
        <div>
          <h4 className="font-bold text-base text-white">{coinName}</h4>
          <p className="text-xs text-slate-400">Rate: ${rate.toLocaleString()} / {coinName}</p>
        </div>
      </div>
      
      {/* Vaste grid kolommen zodat alles kaarsrecht onder elkaar uitlijnt */}
      <div className="grid grid-cols-3 gap-4 w-full md:w-[600px] text-left md:text-right">
        <div className="overflow-hidden">
          <p className="text-[11px] text-slate-400 uppercase font-semibold truncate">Available balance</p>
          <p className="font-bold text-sm text-white mt-0.5 truncate">
            {coinAvailable.toFixed(6)} <span className="text-xs font-normal text-slate-400">(${usdAvailableValue.toFixed(2)})</span>
          </p>
        </div>
        <div className="overflow-hidden">
          <p className="text-[11px] text-slate-400 uppercase font-semibold truncate">Frozen amount</p>
          <p className="font-bold text-sm text-slate-300 mt-0.5 truncate">{coinFrozen.toFixed(6)}</p>
        </div>
        <div className="overflow-hidden">
          <p className="text-[11px] text-slate-400 uppercase font-semibold truncate">Total Value</p>
          <p className="font-bold text-sm text-emerald-400 mt-0.5 truncate">
            ${usdBalanceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
})}
                  </div>
                </div>

                <div className="mb-8">
                  <MarketOverview />
                </div>

                <div className="bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
                  {transactions.length === 0 ? (
                    <p className="text-slate-400 text-sm">No transactions available</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      {transactions.map((tx, idx) => (
                        <div key={tx.id || idx} className="flex justify-between items-center border-b border-slate-800/80 py-3 last:border-0">
                          <div>
                            <p className="font-semibold text-sm capitalize">{tx.type || tx.coin || 'Transaction'}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{tx.network || tx.description || (tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">${Number(tx.amount || 0).toFixed(2)}</p>
                            <p className={`text-xs font-semibold mt-0.5 ${tx.status === "Approved" || tx.status === "Completed" || tx.status === "Success" ? "text-emerald-400" : "text-amber-400"}`}>
                              {tx.status || "Completed"}
                            </p>
                          </div>
                        </div>
                      ))}
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