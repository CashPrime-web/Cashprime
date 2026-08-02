import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Al je pagina-imports op basis van je mappenstructuur
import Trade from "./pages/Trade";
import Transfer from "./pages/Transfer";
import Admin from "./pages/Admin";
import Deposit from "./pages/Deposit";
import Exchange from "./pages/Exchange";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";
import Wallet from "./pages/Wallet";
import Withdraw from "./pages/Withdraw";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#07090d] text-white font-sans w-full">
        <main className="w-full">
          <Routes>
            <Route path="/" element={<Navigate to="/trade" replace />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/exchange" element={<Exchange />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="*" element={<Navigate to="/trade" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;