import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Imports - controleer of deze paden exact overeenkomen met jouw mappen!
import Sidebar from "./components/Sidebar";
import Trade from "./pages/Trade";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-black text-white font-sans">
        {/* SIDEBAR LINKS */}
        <Sidebar />

        {/* INHOUD RECHTS */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/trade" replace />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/trade" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;