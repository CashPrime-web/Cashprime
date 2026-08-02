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
import Exchange from "./pages/Exchange";
import Transfer from "./pages/Transfer";
import LogoutButton from "./components/LogoutButton";
import MarketOverview from "./components/MarketOverview";

function Layout({ children }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const hideLayout =
    location.pathname === "/login" ||
    location.pathname === "/register";

  if (hideLayout) {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col md:flex-row overflow-x-hidden font-sans">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:static
          top-0 left-0
          h-screen
          w-64
          bg-[#111622]
          border-r border-slate-800/80
          p-6
          shrink-0
          flex flex-col justify-between
          transform
          transition-transform
          duration-300
          z-50
          ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img 
              src="/logo.png" 
              alt="CashPrime Logo" 
              className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-amber-500/10 shrink-0" 
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                Cash<span className="text-[#f5c453]">Prime</span>
              </h1>
              <p className="text-[9px] text-amber-400/80 uppercase tracking-widest font-semibold mt-1">
                Signal Program
              </p>
            </div>
          </div>

          <button
            onClick={() => setMenuOpen(false)}
            className="md:hidden absolute top-4 right-4 text-xl text-gray-400 hover:text-white"
          >
            ✕
          </button>

          {/* Navigatie */}
          <nav className="flex flex-col space-y-2">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-4 py-3 bg-[#1e2738] text-[#f5c453] rounded-xl font-medium text-sm border-l-4 border-[#f5c453] transition"
            >
              Dashboard
            </Link>

            <Link
              to="/trade"
              onClick={() => setMenuOpen(false)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-4 py-3 rounded-xl text-center shadow-lg shadow-emerald-500/15 transition text-sm my-2"
            >
              Trade
            </Link>

            <Link
              to="/wallet"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition"
            >
              Wallet
            </Link>

            <Link
              to="/deposit"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition"
            >
              Deposit
            </Link>

            <Link
              to="/withdraw"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition"
            >
              Withdraw
            </Link>

            <Link
              to="/transactions"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition"
            >
              Transactions
            </Link>

            <Link
              to="/verification"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition"
            >
              ID Verification
            </Link>

            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-[#1a2232] rounded-lg text-sm transition"
            >
              Settings
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800/80">
          <LogoutButton />
        </div>
      </aside>

      {/* HOOFDINHOUD */}
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 bg-gradient-to-b from-[#0b0e14] to-[#111622]">
        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden bg-[#161d2a] text-white p-3 rounded-lg mb-4 border border-slate-800"
        >
          ☰ Menu
        </button>
        {children}
      </main>
    </div>
  );
}

function App() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [signalPercentage, setSignalPercentage] = useState(2); // Standaard op 2%

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Haal wallet gegevens op (ondersteunt zowel balance, exchange_balance als trade_balance)
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletData) setWallet(walletData);

    // 2. Haal het actieve winstpercentage op uit de admin trading_signals tabel
    const { data: signalData } = await supabase
      .from("trading_signals")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (signalData && signalData.length > 0) {
      const parsedPct = parseFloat(signalData[0].profit_percentage);
      if (!isNaN(parsedPct)) {
        setSignalPercentage(parsedPct);
      }
    }

    // 3. Haal recente transacties op
    const { data: depositData } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (depositData) setTransactions(depositData);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Veilige berekeningen op basis van echte data
  const tradeBalance = Number(wallet?.balance || wallet?.trade_balance || 0);
  const exchangeBalance = Number(wallet?.exchange_balance || 0);
  const todaysEarnings = (tradeBalance * (signalPercentage / 100)).toFixed(2);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* BEVEILIGDE ROUTES */}
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/trade" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
          <Route path="/exchange" element={<ProtectedRoute><Exchange /></ProtectedRoute>} />
          <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
          <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
          <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />

          {/* DASHBOARD HOOFDPAGINA */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">
                      Welcome to CashPrime
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Overview of your assets, market metrics, and recent activities.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Account Status: Verified
                  </div>
                </div>

                {/* ASSET VALUATION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/10 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-blue-200 text-xs font-semibold tracking-wider uppercase">
                          Asset Valuation
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-bold">
                          USD
                        </span>
                      </div>

                      <div className="text-4xl font-black tracking-tight mb-3">
                        ${tradeBalance.toFixed(2)}
                      </div>

                      <div className="inline-flex items-center gap-2 bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-lg text-xs font-semibold mb-6">
                        <span>Today's Earnings:</span>
                        <span className="font-bold">
                          ≈${todaysEarnings} ({signalPercentage}%)
                        </span>
                      </div>
                    </div>

                    {/* SNELMENU KNOPPEN */}
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
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                          My Account / Exchange
                        </div>
                        <div className="text-sm font-semibold text-slate-300">
                          Available Balance
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-blue-400 mt-3">
                        ${exchangeBalance.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-[#161d2a] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                          My Account / Trade
                        </div>
                        <div className="text-sm font-semibold text-slate-300">
                          Available Balance
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400 mt-3">
                        ${tradeBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <MarketOverview />
                </div>

                <div className="bg-[#161d2a] border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
                  {transactions.length === 0 && (
                    <p className="text-slate-400 text-sm">No transactions available</p>
                  )}
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center border-b border-slate-800/80 py-3 last:border-0">
                      <div>
                        <p className="font-semibold text-sm">Deposit {tx.coin}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{tx.network}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">${tx.amount}</p>
                        <p className={`text-xs font-semibold mt-0.5 ${tx.status === "Approved" ? "text-emerald-400" : "text-amber-400"}`}>
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  ))}
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