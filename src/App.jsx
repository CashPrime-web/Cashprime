import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Imports - alleen bestanden die er daadwerkelijk zijn
import Trade from "./pages/Trade";
import Transfer from "./pages/Transfer";
import Admin from "./pages/Admin";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-black text-white font-sans w-full">
        {/* INHOUD */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/trade" replace />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/trade" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;