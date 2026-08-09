import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Deposit() {
  const [coin, setCoin] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Wallet adressen per cryptomunt
  const walletAddresses = {
    USDT: "TJhEwTziQLTo834C3CBbHpiVEb5RSCYJNC",
    BTC: "12vr23LBGzPopmkeHngLhEJmgArV91wxi8",
    ETH: "0xb92Fa3CBE7F96a4a212196C1a6D0163c1157ac07"
  };

  // Netwerk per cryptomunt
  const coinNetworks = {
    USDT: "TRC20",
    BTC: "Bitcoin",
    ETH: "ERC20"
  };

  const currentAddress =
    walletAddresses[coin] || walletAddresses.USDT;

  // Genereer dynamische QR-code op basis van het huidige adres
  const qrCodeUrl =
    `https://quickchart.io/qr?text=${encodeURIComponent(currentAddress)}&size=200&margin=2`;

  // Zorg dat het netwerk automatisch meeverandert met de gekozen coin
  useEffect(() => {
    setNetwork(coinNetworks[coin]);
  }, [coin]);

  const handleDeposit = async (e) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setMessage("");

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("User not authenticated.");
      setLoading(false);
      return;
    }

    // Voeg de deposit toe aan de deposits tabel
    const { error: depositError } = await supabase
      .from("deposits")
      .insert([
        {
          user_id: user.id,
          coin: coin,
          network: network,
          amount: numAmount,
          status: "Pending"
        }
      ]);

    if (depositError) {
      setMessage(
        "Error submitting recharge: " + depositError.message
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage(
      "Recharge request submitted successfully! Waiting for admin approval."
    );
    setAmount("");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">
        Recharge / Deposit
      </h1>

      <p className="text-sm text-slate-400 mb-6">
        Select your preferred cryptocurrency and scan the QR code
        or copy the address to deposit funds.
      </p>

      {message && (
        <div
          className={`p-3 rounded-xl text-sm mb-4 border ${
            message.includes("Error") ||
            message.includes("valid") ||
            message.includes("authenticated")
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* QR CODE */}
      <div className="flex flex-col items-center justify-center bg-[#0b0e14] border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="bg-white p-3 rounded-xl shadow-md mb-2">
          <img
            src={qrCodeUrl}
            alt={`QR Code for ${coin}`}
            className="w-40 h-40 object-contain"
          />
        </div>

        <p className="text-xs text-slate-400">
          Scan QR Code to deposit {coin}
        </p>
      </div>

      <form onSubmit={handleDeposit} className="space-y-4">

        {/* ASSET */}
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Select Asset
          </label>

          <select
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white"
          >
            <option value="USDT">USDT (Tether)</option>
            <option value="BTC">BTC (Bitcoin)</option>
            <option value="ETH">ETH (Ethereum)</option>
          </select>
        </div>

        {/* NETWORK */}
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Network
          </label>

          <div className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white">
            {network}
          </div>
        </div>

        {/* DEPOSIT ADDRESS */}
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Deposit Address
          </label>

          <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-3 text-xs font-mono text-amber-400 break-all select-all">
            {currentAddress}
          </div>
        </div>

        {/* AMOUNT */}
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Amount ($)
          </label>

          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-white"
            required
          />
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-xl transition mt-4 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Confirm Recharge"}
        </button>
      </form>
    </div>
  );
}