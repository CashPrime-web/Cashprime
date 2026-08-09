import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Wallet() {
  const [wallet, setWallet] = useState({
    balance: 0,
    total_deposit: 0,
    bonus: 0,
    trading_balance: 0
  });

  const [assets, setAssets] = useState([]);

  const [liveRates, setLiveRates] = useState({
    USDT: 1,
    BTC: 64694,
    ETH: 1918.23
  });

  const [totalValuation, setTotalValuation] = useState(0);

  const loadWallet = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    // -----------------------------------------
    // WALLET DATA
    // -----------------------------------------
    const { data: walletData, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      console.error("Wallet loading error:", walletError);
      return;
    }

    if (walletData) {
      setWallet(walletData);
    }

    // -----------------------------------------
    // USER ASSETS
    // -----------------------------------------
    const { data: assetData, error: assetError } = await supabase
      .from("user_assets")
      .select("*")
      .eq("user_id", user.id);

    if (assetError) {
      console.error("Asset loading error:", assetError);
      return;
    }

    setAssets(assetData || []);

    // -----------------------------------------
    // EXCHANGE BALANCE
    // -----------------------------------------
    const exchangeBalance = Number(walletData?.balance || 0);

    // -----------------------------------------
    // BONUS
    // -----------------------------------------
    const bonus = Number(walletData?.bonus || 0);

    // -----------------------------------------
    // TRADING BALANCE
    // -----------------------------------------
    const tradingBalance = Number(
      walletData?.trading_balance || 0
    );

    // -----------------------------------------
    // CRYPTO ASSET VALUE
    // USDT NIET OPNIEUW TELLEN
    // -----------------------------------------
    const cryptoValue = (assetData || []).reduce(
      (total, asset) => {
        const coin = (asset.coin || "").toUpperCase();

        if (coin === "USDT") {
          return total;
        }

        const amount = Number(asset.balance || 0);
        const rate = liveRates[coin] || 0;

        return total + amount * rate;
      },
      0
    );

    // -----------------------------------------
    // EXACT SAME TOTAL AS DASHBOARD
    // -----------------------------------------
    const exactTotalValuation =
      exchangeBalance +
      bonus +
      tradingBalance +
      cryptoValue;

    setTotalValuation(exactTotalValuation);

    console.log("WALLET SYNCHRONIZATION");
    console.log("Exchange:", exchangeBalance);
    console.log("Bonus:", bonus);
    console.log("Trading:", tradingBalance);
    console.log("Crypto Value:", cryptoValue);
    console.log("TOTAL WALLET BALANCE:", exactTotalValuation);
  };

  // -----------------------------------------
  // LIVE CRYPTO PRICES
  // -----------------------------------------
  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum&vs_currencies=usd"
        );

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
          "Could not fetch live crypto prices:",
          err
        );
      }
    };

    fetchLivePrices();

    const interval = setInterval(
      fetchLivePrices,
      30000
    );

    return () => clearInterval(interval);
  }, []);

  // -----------------------------------------
  // RELOAD WALLET WHEN LIVE RATES CHANGE
  // -----------------------------------------
  useEffect(() => {
    loadWallet();

    const interval = setInterval(() => {
      loadWallet();
    }, 5000);

    return () => clearInterval(interval);
  }, [liveRates]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        My Wallet
      </h1>

      {/* -----------------------------------------
          TOTAL BALANCE
          EXACTLY SYNCHRONIZED WITH
          DASHBOARD ASSET VALUATION (LIVE)
      ----------------------------------------- */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-400">
            Total Balance
          </p>

          <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
            Live
          </span>
        </div>

        <h2 className="text-4xl font-bold mt-2">
          $
          {totalValuation.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </h2>

        <p className="text-xs text-gray-500 mt-2">
          Synchronized with Asset Valuation (Live)
        </p>
      </div>

      {/* -----------------------------------------
          WALLET DETAILS
      ----------------------------------------- */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* TOTAL DEPOSIT */}
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-gray-400">
            Total Deposit
          </p>

          <h2 className="text-3xl font-bold text-green-400 mt-3">
            $
            {Number(
              wallet.total_deposit || 0
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </h2>
        </div>

        {/* BONUS */}
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-gray-400">
            Bonus
          </p>

          <h2 className="text-3xl font-bold text-blue-400 mt-3">
            $
            {Number(
              wallet.bonus || 0
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </h2>
        </div>

        {/* WALLET STATUS */}
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-gray-400">
            Wallet Status
          </p>

          <h2 className="text-3xl font-bold mt-3 text-green-400">
            Active
          </h2>
        </div>

      </div>

      {/* -----------------------------------------
          BALANCE BREAKDOWN
      ----------------------------------------- */}
      <div className="bg-gray-900 rounded-xl p-6 mt-6">

        <h2 className="text-xl font-bold mb-4">
          Balance Overview
        </h2>

        <div className="space-y-3 text-sm">

          <div className="flex justify-between">
            <span className="text-gray-400">
              Exchange / USDT
            </span>

            <span className="font-semibold text-white">
              $
              {Number(
                wallet.balance || 0
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">
              Bonus
            </span>

            <span className="font-semibold text-blue-400">
              $
              {Number(
                wallet.bonus || 0
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">
              My Account / Trading
            </span>

            <span className="font-semibold text-emerald-400">
              $
              {Number(
                wallet.trading_balance || 0
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>

          <div className="border-t border-gray-800 pt-3 flex justify-between">
            <span className="font-bold text-white">
              Total Asset Value
            </span>

            <span className="font-bold text-white">
              $
              {totalValuation.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Wallet;