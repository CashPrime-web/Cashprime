import { useEffect, useState } from "react";
 import { supabase } from "../lib/supabase";
 import UsersTable from "../components/admin/UsersTable";

console.log("ADMIN LOADED");

function Admin() {
 const [users, setUsers] = useState([]);
 const [deposits, setDeposits] = useState([]);
 const [withdrawals, setWithdrawals] = useState([]);
 const [verifications, setVerifications] = useState([]);

const [yieldAdjustment, setYieldAdjustment] = useState(0);
 const [yieldMessage, setYieldMessage] = useState("");

const [signalPair, setSignalPair] = useState("BTC/USDT");
 const [signalProfit, setSignalProfit] = useState(3.5);
 const [signalIsActive, setSignalIsActive] = useState(true);
 const [signalMsg, setSignalMsg] = useState("");

const [tradesToday, setTradesToday] = useState([]);

// =========================================================
 // CRYPTO RATES
 // =========================================================
 const [cryptoRates, setCryptoRates] = useState({});

// =========================================================
 // CRYPTO VALUE BEREKENEN
 // =========================================================
 const calculateCryptoValue = (
 assets,
 rates = cryptoRates
 ) => {
 return (assets || []).reduce((total, asset) => {
 const coin = (asset.coin || "").toUpperCase();

  if (coin === "USDT") {
    return total;
  }

  const amount = Number(asset.balance || 0);
  const rate = Number(rates[coin] || 0);

  return total + amount * rate;
}, 0);


};

// =========================================================
 // CRYPTO RATES OPHALEN
 // =========================================================
 const fetchCryptoRates = async () => {
 try {
 const response = await fetch(
 "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,dogecoin&vs_currencies=usd"
 );

if (!response.ok) {
  throw new Error(
    "Failed to fetch crypto rates. Status: " +
      response.status
  );
}

const data = await response.json();

const rates = {
  BTC: Number(data.bitcoin?.usd || 0),
  ETH: Number(data.ethereum?.usd || 0),
  SOL: Number(data.solana?.usd || 0),
  BNB: Number(data.binancecoin?.usd || 0),
  XRP: Number(data.ripple?.usd || 0),
  DOGE: Number(data.dogecoin?.usd || 0)
};

const hasValidRates = Object.values(rates).some(
  (rate) => rate > 0
);

if (!hasValidRates) {
  throw new Error(
    "No valid crypto rates received."
  );
}

setCryptoRates(rates);

return rates;


} catch (error) {
 console.error(
 "Error fetching crypto rates:",
 error
 );

return cryptoRates;


}
 };

// =========================================================
 // GLOBAL BALANCE ADJUSTMENT
 // =========================================================
 const applyGlobalYield = async () => {
 const amount = Number(yieldAdjustment);

if (!amount || amount <= 0) {
  alert("Enter valid amount");
  return;
}

const {
  data: usersData,
  error
} = await supabase
  .from("wallets")
  .select("*");

if (error) {
  console.error(error);
  alert(error.message);
  return;
}

for (const wallet of usersData || []) {
  const currentBalance =
    Number(wallet.balance || 0);

  const currentBonus =
    Number(wallet.bonus || 0);

  const totalExchange =
    currentBalance + currentBonus;

  if (totalExchange <= 0) {
    continue;
  }

  // Eerst echte balance verminderen
  const balanceUsed = Math.min(
    currentBalance,
    amount
  );

  const newBalance =
    currentBalance - balanceUsed;

  // Daarna eventueel bonus gebruiken
  const remainingAmount =
    amount - balanceUsed;

  const bonusUsed = Math.min(
    currentBonus,
    remainingAmount
  );

  const newBonus =
    currentBonus - bonusUsed;

  await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      bonus: newBonus
    })
    .eq("user_id", wallet.user_id);

  // USDT = Exchange Balance + Bonus
  const newExchangeBalance =
    newBalance + newBonus;

  await supabase
    .from("user_assets")
    .update({
      balance: newExchangeBalance,
      available: newExchangeBalance
    })
    .eq("user_id", wallet.user_id)
    .ilike("coin", "USDT");
}

setYieldMessage(
  `$${amount} removed from all accounts`
);

await fetchData();


};

// =========================================================
 // FETCH DATA
 // =========================================================
 const fetchData = async (
 liveRates = cryptoRates
 ) => {
 // -------------------------------------------------------
 // PROFILES
 // -------------------------------------------------------
 const {
 data: profiles,
 error
 } = await supabase
 .from("profiles")
 .select("*");

if (error) {
  console.error(error);
  return;
}

// -------------------------------------------------------
// WALLETS
// -------------------------------------------------------
const {
  data: wallets,
  error: walletError
} = await supabase
  .from("wallets")
  .select("*");

if (walletError) {
  console.error(walletError);
  return;
}

// -------------------------------------------------------
// COMPLETED TRADES
// -------------------------------------------------------
const { data: allTrades } =
  await supabase
    .from("user_trades")
    .select(
      "user_id, profit_amount"
    )
    .eq("status", "Completed");

// -------------------------------------------------------
// USER ASSETS
// -------------------------------------------------------
const {
  data: allAssets,
  error: assetsError
} = await supabase
  .from("user_assets")
  .select("*");

if (assetsError) {
  console.error(assetsError);
}

// -------------------------------------------------------
// COMBINE USERS + WALLET + ASSETS
// -------------------------------------------------------
const combined = profiles.map((user) => {
  const userWallet =
    wallets.find(
      (wallet) =>
        wallet.user_id === user.id
    ) || {
      balance: 0,
      bonus: 0,
      crypto_value: 0,
      trading_balance: 0,
      total_deposit: 0
    };

  // Earnings van deze gebruiker
  const userTradesList =
    allTrades
      ? allTrades.filter(
          (trade) =>
            trade.user_id === user.id
        )
      : [];

  const userEarnings =
    userTradesList.reduce(
      (acc, trade) =>
        acc +
        (Number(
          trade.profit_amount
        ) || 0),
      0
    );

  // Assets van deze gebruiker
  const userAssets =
    allAssets?.filter(
      (asset) =>
        asset.user_id === user.id
    ) || [];

  // Werkelijke crypto assets
  const nonUsdtAssets =
    userAssets.filter(
      (asset) =>
        (asset.coin || "").toUpperCase() !==
        "USDT"
    );

  // Live crypto value uit dezelfde actuele rates
  const calculatedCryptoValue =
    calculateCryptoValue(
      nonUsdtAssets,
      liveRates
    );

  // Als echte crypto-assets bestaan,
  // gebruiken we hun live waarde.
  // Alleen zonder crypto-assets gebruiken
  // we de opgeslagen Admin crypto_value.
  const cryptoValue =
    nonUsdtAssets.length > 0
      ? calculatedCryptoValue
      : Number(
          userWallet.crypto_value || 0
        );

  // Exchange = echte balance + bonus
  const exchangeAvailable =
    Number(userWallet.balance || 0) +
    Number(userWallet.bonus || 0);

  const totalValuation =
    exchangeAvailable +
    Number(
      userWallet.trading_balance || 0
    ) +
    cryptoValue;

  return {
    ...user,

    wallet: {
      ...userWallet,

      cryptoValue,

      total_valuation:
        totalValuation
    },

    earnings: userEarnings
  };
});

setUsers(combined);

// =======================================================
// DEPOSITS
// =======================================================
const {
  data: depositData
} = await supabase
  .from("deposits")
  .select("*")
  .order("created_at", {
    ascending: false
  });

if (depositData) {
  const depositsWithUsers =
    await Promise.all(
      depositData.map(
        async (deposit) => {
          const {
            data: profile
          } = await supabase
            .from("profiles")
            .select(
              "name, email, referred_by"
            )
            .eq(
              "id",
              deposit.user_id
            )
            .maybeSingle();

          return {
            ...deposit,
            profile
          };
        }
      )
    );

  setDeposits(
    depositsWithUsers
  );
}

// =======================================================
// WITHDRAWALS
// =======================================================
const {
  data: withdrawalData
} = await supabase
  .from("withdrawals")
  .select("*")
  .order("created_at", {
    ascending: false
  });

if (withdrawalData) {
  const withdrawalsWithUsers =
    await Promise.all(
      withdrawalData.map(
        async (withdrawal) => {
          const {
            data: profile
          } = await supabase
            .from("profiles")
            .select(
              "name, email, referred_by"
            )
            .eq(
              "id",
              withdrawal.user_id
            )
            .maybeSingle();

          return {
            ...withdrawal,
            profile
          };
        }
      )
    );

  setWithdrawals(
    withdrawalsWithUsers
  );
}

// =======================================================
// VERIFICATIONS
// =======================================================
const {
  data: verificationData
} = await supabase
  .from("verifications")
  .select("*")
  .order("created_at", {
    ascending: false
  });

if (verificationData) {
  const verificationWithUsers =
    await Promise.all(
      verificationData.map(
        async (verification) => {
          const {
            data: profile
          } = await supabase
            .from("profiles")
            .select("name,email")
            .eq(
              "id",
              verification.user_id
            )
            .maybeSingle();

          return {
            ...verification,
            profile
          };
        }
      )
    );

  setVerifications(
    verificationWithUsers
  );
}

// =======================================================
// TRADING SIGNAL
// =======================================================
const {
  data: sigData
} = await supabase
  .from("trading_signals")
  .select("*")
  .eq("id", 1)
  .maybeSingle();

if (sigData) {
  setSignalPair(
    sigData.pair
  );

  setSignalProfit(
    sigData.profit_percentage
  );

  setSignalIsActive(
    sigData.is_active ?? true
  );
}

// =======================================================
// TODAY'S TRADES
// =======================================================
const today =
  new Date()
    .toISOString()
    .split("T")[0];

const {
  data: tradeData
} = await supabase
  .from("user_trades")
  .select("*")
  .gte(
    "created_at",
    today
  );

if (tradeData) {
  setTradesToday(
    tradeData
  );
}


};

// =========================================================
 // REALTIME
 // =========================================================
 useEffect(() => {
 let isMounted = true;
 let priceRefreshRunning = false;

const initializeAdmin = async () => {
 // Eén keer actuele crypto-prijzen ophalen
 const rates = await fetchCryptoRates();

if (!isMounted) return;

// Als CoinGecko bereikbaar is,
// dezelfde rates gebruiken voor eerste fetchData()
if (
  rates &&
  Object.keys(rates).length > 0
) {
  setCryptoRates(rates);
  await fetchData(rates);
} else {
  await fetchData();
}


};

// Eerste keer direct laden
 initializeAdmin();

// =======================================================
 // CRYPTO PRIJZEN ELKE 60 SECONDEN VERVERSEN
 // =======================================================
 const priceInterval = setInterval(async () => {
 // Voorkom dat er twee crypto requests
 // tegelijk worden uitgevoerd
 if (priceRefreshRunning) return;

priceRefreshRunning = true;

try {
  const rates = await fetchCryptoRates();

  if (!isMounted) return;

  if (
    rates &&
    Object.keys(rates).length > 0
  ) {
    setCryptoRates(rates);

    // Users opnieuw berekenen met de nieuwe
    // actuele crypto-prijzen
    await fetchData(rates);
  }
} catch (error) {
  console.error(
    "Crypto price refresh failed:",
    error
  );
} finally {
  priceRefreshRunning = false;
}


}, 60000);

// =======================================================
 // SUPABASE REALTIME
 // =======================================================
 const channel =
 supabase
 .channel(
 "admin-realtime-changes"
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "wallets"
 },
 () => {
 fetchData();
 }
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "user_assets"
 },
 () => {
 fetchData();
 }
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "profiles"
 },
 () => {
 fetchData();
 }
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "deposits"
 },
 () => {
 fetchData();
 }
 )
 .on(
 "postgres_changes",
 {
 event: "*",
 schema: "public",
 table: "withdrawals"
 },
 () => {
 fetchData();
 }
 )
 .subscribe();

return () => {
 isMounted = false;

clearInterval(priceInterval);

supabase.removeChannel(
  channel
);


};
 }, []);

// =========================================================
 // MAX DAILY TRADES
 // =========================================================
 const handleUpdateMaxTrades =
 async (
 userId,
 maxTrades
 ) => {
 const { error } =
 await supabase
 .from("profiles")
 .update({
 max_daily_trades:
 parseInt(
 maxTrades
 )
 })
 .eq(
 "id",
 userId
 );

  if (error) {
    alert(
      "Error updating trades limit: " +
        error.message
    );
  } else {
    alert(
      `Updated max trades to ${maxTrades} for user.`
    );

    fetchData();
  }
};


// =========================================================
 // TRADING SIGNAL
 // =========================================================
 const handleUpdateSignal =
 async (
 e,
 customActiveStatus
 ) => {
 if (e) {
 e.preventDefault();
 }

  setSignalMsg("");

  const newActiveState =
    customActiveStatus !==
    undefined
      ? customActiveStatus
      : signalIsActive;

  const { error } =
    await supabase
      .from(
        "trading_signals"
      )
      .upsert({
        id: 1,
        pair: signalPair,
        profit_percentage:
          parseFloat(
            signalProfit
          ),
        is_active:
          newActiveState,
        updated_at:
          new Date()
      });

  if (error) {
    setSignalMsg(
      "Error updating signal: " +
        error.message
    );
  } else {
    setSignalIsActive(
      newActiveState
    );

    setSignalMsg(
      newActiveState
        ? "✅ Signal activated and visible!"
        : "❌ Signal turned OFF and hidden!"
    );

    fetchData();
  }
};


// =========================================================
 // UPDATE USER
 // =========================================================
 const updateUser =
 async (user) => {
 try {
 // ---------------------------------------------------
 // 1. PROFILE STATUS
 // ---------------------------------------------------
 const {
 error: profileError
 } = await supabase
 .from("profiles")
 .update({
 status:
 user.status
 })
 .eq(
 "id",
 user.id
 );

    if (profileError) {
      alert(
        "Fout bij opslaan status: " +
          profileError.message
      );
      return;
    }

    // ---------------------------------------------------
    // 2. NIEUWE WAARDES UIT ADMIN
    // ---------------------------------------------------
    const newBalance =
      Number(
        user.wallet?.balance ||
          0
      );

    const newBonus =
      Number(
        user.wallet?.bonus ||
          0
      );

    const newCryptoValue =
      Number(
        user.wallet?.cryptoValue ||
          0
      );

    const newTotalDeposit =
      Number(
        user.wallet
          ?.total_deposit ||
          0
      );

    const newTradingBalance =
      Number(
        user.wallet
          ?.trading_balance ||
          0
      );

    // ---------------------------------------------------
    // 3. BESTAANDE WALLET OPHALEN
    // ---------------------------------------------------
    const {
      data: existingWallet,
      error:
        walletFetchError
    } = await supabase
      .from("wallets")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (walletFetchError) {
      console.error(
        walletFetchError
      );

      alert(
        walletFetchError.message
      );

      return;
    }

    // ---------------------------------------------------
    // 4. ALLE ASSETS OPHALEN
    // ---------------------------------------------------
    const {
      data: cryptoAssets,
      error:
        cryptoAssetsError
    } = await supabase
      .from("user_assets")
      .select("*")
      .eq(
        "user_id",
        user.id
      );

    if (cryptoAssetsError) {
      console.error(
        cryptoAssetsError
      );

      alert(
        cryptoAssetsError.message
      );

      return;
    }

    // ---------------------------------------------------
    // 5. ALLEEN ECHTE CRYPTO
    // USDT wordt NIET aangeraakt.
    // ---------------------------------------------------
    const nonUsdtAssets =
      (cryptoAssets || []).filter(
        (asset) =>
          (asset.coin || "")
            .toUpperCase() !==
          "USDT"
      );

    const actualCurrentCryptoValue =
      calculateCryptoValue(
        nonUsdtAssets,
        cryptoRates
      );

    console.log(
      "OLD ACTUAL CRYPTO VALUE:",
      actualCurrentCryptoValue
    );

    console.log(
      "NEW ADMIN CRYPTO VALUE:",
      newCryptoValue
    );

    // ---------------------------------------------------
    // 6. CRYPTO VALUE AANPASSEN
    //
    // BELANGRIJK:
    // - newCryptoValue === 0:
    //   alle bestaande crypto op 0.
    //
    // - actualCurrentCryptoValue > 0:
    //   bestaande crypto proportioneel aanpassen.
    //
    // - actualCurrentCryptoValue === 0
    //   EN newCryptoValue > 0:
    //   BTC + ETH aanmaken.
    // ---------------------------------------------------

    if (newCryptoValue === 0) {

      // Admin zet Crypto Value op 0.
      // Alle bestaande echte crypto-assets
      // worden op 0 gezet.

      for (const asset of nonUsdtAssets) {
        const {
          error:
            assetUpdateError
        } = await supabase
          .from("user_assets")
          .update({
            balance: 0,
            available: 0
          })
          .eq(
            "id",
            asset.id
          );

        if (assetUpdateError) {
          console.error(
            assetUpdateError
          );

          alert(
            assetUpdateError.message
          );

          return;
        }
      }

    } else if (
      actualCurrentCryptoValue > 0
    ) {

      // -------------------------------------------------
      // BESTAANDE CRYPTO AANPASSEN
      // -------------------------------------------------
      // Geen nieuwe CoinGecko-call.
      //
      // De bestaande crypto-assets worden
      // proportioneel aangepast zodat hun totale
      // live waarde overeenkomt met de nieuwe
      // Admin Crypto Value.
      // -------------------------------------------------

      const adjustmentFactor =
        newCryptoValue /
        actualCurrentCryptoValue;

      console.log(
        "CRYPTO ADJUSTMENT FACTOR:",
        adjustmentFactor
      );

      for (
        const asset of nonUsdtAssets
      ) {
        const currentBalance =
          Number(
            asset.balance || 0
          );

        const currentAvailable =
          Number(
            asset.available ??
              asset.balance ??
              0
          );

        const newAssetBalance =
          currentBalance *
          adjustmentFactor;

        const newAssetAvailable =
          currentAvailable *
          adjustmentFactor;

        const {
          error:
            assetUpdateError
        } = await supabase
          .from("user_assets")
          .update({
            balance:
              newAssetBalance,
            available:
              newAssetAvailable
          })
          .eq(
            "id",
            asset.id
          );

        if (
          assetUpdateError
        ) {
          console.error(
            assetUpdateError
          );

          alert(
            assetUpdateError.message
          );

          return;
        }
      }

    } else {

      // -------------------------------------------------
      // GEEN BESTAANDE CRYPTO
      // MAAR ADMIN WIL WEL CRYPTO VALUE
      // -------------------------------------------------
      //
      // Alleen hier BTC + ETH creëren.
      // -------------------------------------------------

      const priceResponse =
        await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
        );

      if (!priceResponse.ok) {
        throw new Error(
          `Could not retrieve BTC/ETH prices (${priceResponse.status}).`
        );
      }

      const priceData =
        await priceResponse.json();

      const btcRate =
        Number(
          priceData?.bitcoin?.usd ||
            0
        );

      const ethRate =
        Number(
          priceData?.ethereum?.usd ||
            0
        );

      if (
        btcRate <= 0 ||
        ethRate <= 0
      ) {
        throw new Error(
          "Could not retrieve BTC/ETH live prices."
        );
      }

      // 50% BTC + 50% ETH
      const btcValue =
        newCryptoValue *
        0.50;

      const ethValue =
        newCryptoValue *
        0.50;

      const btcBalance =
        btcValue /
        btcRate;

      const ethBalance =
        ethValue /
        ethRate;

      console.log(
        "NEW BTC BALANCE:",
        btcBalance
      );

      console.log(
        "NEW ETH BALANCE:",
        ethBalance
      );

      // -------------------------------------------------
      // BTC zoeken
      // -------------------------------------------------
      const existingBtc =
        cryptoAssets?.find(
          (asset) =>
            (asset.coin || "")
              .toUpperCase() ===
            "BTC"
        );

      // -------------------------------------------------
      // ETH zoeken
      // -------------------------------------------------
      const existingEth =
        cryptoAssets?.find(
          (asset) =>
            (asset.coin || "")
              .toUpperCase() ===
            "ETH"
        );

      // -------------------------------------------------
      // BTC OPSLAAN
      // -------------------------------------------------
      if (existingBtc) {
        const {
          error: btcError
        } = await supabase
          .from("user_assets")
          .update({
            balance:
              btcBalance,
            available:
              btcBalance
          })
          .eq(
            "id",
            existingBtc.id
          );

        if (btcError) {
          console.error(
            btcError
          );

          alert(
            btcError.message
          );

          return;
        }
      } else {
        const {
          error:
            btcInsertError
        } = await supabase
          .from("user_assets")
          .insert([
            {
              user_id:
                user.id,
              coin: "BTC",
              balance:
                btcBalance,
              available:
                btcBalance,
              frozen: 0
            }
          ]);

        if (btcInsertError) {
          console.error(
            btcInsertError
          );

          alert(
            btcInsertError.message
          );

          return;
        }
      }

      // -------------------------------------------------
      // ETH OPSLAAN
      // -------------------------------------------------
      if (existingEth) {
        const {
          error: ethError
        } = await supabase
          .from("user_assets")
          .update({
            balance:
              ethBalance,
            available:
              ethBalance
          })
          .eq(
            "id",
            existingEth.id
          );

        if (ethError) {
          console.error(
            ethError
          );

          alert(
            ethError.message
          );

          return;
        }
      } else {
        const {
          error:
            ethInsertError
        } = await supabase
          .from("user_assets")
          .insert([
            {
              user_id:
                user.id,
              coin: "ETH",
              balance:
                ethBalance,
              available:
                ethBalance,
              frozen: 0
            }
          ]);

        if (ethInsertError) {
          console.error(
            ethInsertError
          );

          alert(
            ethInsertError.message
          );

          return;
        }
      }
    }

    // ---------------------------------------------------
    // 7. WALLET OPSLAAN
    // ---------------------------------------------------
    if (!existingWallet) {
      const {
        error:
          walletInsertError
      } = await supabase
        .from("wallets")
        .insert({
          user_id:
            user.id,
          balance:
            newBalance,
          bonus:
            newBonus,
          crypto_value:
            newCryptoValue,
          total_deposit:
            newTotalDeposit,
          trading_balance:
            newTradingBalance
        });

      if (
        walletInsertError
      ) {
        console.error(
          walletInsertError
        );

        alert(
          walletInsertError.message
        );

        return;
      }
    } else {
      const {
        error:
          walletUpdateError
      } = await supabase
        .from("wallets")
        .update({
          total_deposit:
            newTotalDeposit,
          balance:
            newBalance,
          bonus:
            newBonus,
          crypto_value:
            newCryptoValue,
          trading_balance:
            newTradingBalance
        })
        .eq(
          "user_id",
          user.id
        );

      if (
        walletUpdateError
      ) {
        console.error(
          walletUpdateError
        );

        alert(
          walletUpdateError.message
        );

        return;
      }
    }

    // ---------------------------------------------------
    // 8. USDT = EXCHANGE BALANCE + BONUS
    //
    // USDT blijft volledig los van Crypto Value.
    // ---------------------------------------------------
    const exchangeAvailable =
      newBalance +
      newBonus;

    const {
      data: existingUsdt,
      error:
        usdtFetchError
    } = await supabase
      .from("user_assets")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .ilike(
        "coin",
        "USDT"
      )
      .maybeSingle();

    if (usdtFetchError) {
      console.error(
        usdtFetchError
      );

      return;
    }

    if (existingUsdt) {
      const {
        error:
          usdtUpdateError
      } = await supabase
        .from(
          "user_assets"
        )
        .update({
          balance:
            exchangeAvailable,
          available:
            exchangeAvailable
        })
        .eq(
          "id",
          existingUsdt.id
        );

      if (
        usdtUpdateError
      ) {
        console.error(
          usdtUpdateError
        );

        return;
      }
    } else {
      const {
        error:
          usdtInsertError
      } = await supabase
        .from(
          "user_assets"
        )
        .insert([
          {
            user_id:
              user.id,
            coin:
              "USDT",
            balance:
              exchangeAvailable,
            available:
              exchangeAvailable,
            frozen: 0
          }
        ]);

      if (
        usdtInsertError
      ) {
        console.error(
          usdtInsertError
        );

        return;
      }
    }

    // ---------------------------------------------------
    // 9. KLAAR
    // ---------------------------------------------------
    alert(
      "User updated successfully!"
    );

    await fetchData();

  } catch (err) {
    console.error(
      "Update user error:",
      err
    );

    alert(
      err.message ||
        "Failed to update user."
    );
  }
};


// =========================================================
 // APPROVE DEPOSIT
 // =========================================================
 const approveDeposit =
 async (deposit) => {
 try {
 const amount =
 Number(
 deposit.amount || 0
 );

    const coin =
      (
        deposit.coin ||
        "USDT"
      ).toUpperCase();

    if (
      !amount ||
      amount <= 0
    ) {
      alert(
        "Invalid deposit amount"
      );
      return;
    }

    const {
      data: wallet,
      error:
        walletFetchError
    } = await supabase
      .from("wallets")
      .select("*")
      .eq(
        "user_id",
        deposit.user_id
      )
      .maybeSingle();

    if (walletFetchError) {
      alert(
        walletFetchError.message
      );
      return;
    }

    if (!wallet) {
      alert(
        "Wallet not found for this user."
      );
      return;
    }

    // ---------------------------------------------------
    // USDT DEPOSIT
    // ---------------------------------------------------
    if (
      coin === "USDT"
    ) {
      const currentBalance =
        Number(
          wallet.balance ||
            0
        );

      const currentTotalDeposit =
        Number(
          wallet.total_deposit ||
            0
        );

      const bonus =
        Number(
          wallet.bonus ||
            0
        );

      const newBalance =
        currentBalance +
        amount;

      const newTotalDeposit =
        currentTotalDeposit +
        amount;

      const {
        error:
          walletUpdateError
      } = await supabase
        .from("wallets")
        .update({
          balance:
            newBalance,
          total_deposit:
            newTotalDeposit
        })
        .eq(
          "user_id",
          deposit.user_id
        );

      if (
        walletUpdateError
      ) {
        alert(
          walletUpdateError.message
        );
        return;
      }

      const newExchangeBalance =
        newBalance +
        bonus;

      const {
        data: existingAsset,
        error:
          assetFetchError
      } = await supabase
        .from(
          "user_assets"
        )
        .select("*")
        .eq(
          "user_id",
          deposit.user_id
        )
        .ilike(
          "coin",
          "USDT"
        )
        .maybeSingle();

      if (
        assetFetchError
      ) {
        alert(
          assetFetchError.message
        );
        return;
      }

      if (
        existingAsset
      ) {
        const {
          error:
            assetUpdateError
        } = await supabase
          .from(
            "user_assets"
          )
          .update({
            balance:
              newExchangeBalance,
            available:
              newExchangeBalance
          })
          .eq(
            "id",
            existingAsset.id
          );

        if (
          assetUpdateError
        ) {
          alert(
            assetUpdateError.message
          );
          return;
        }
      } else {
        const {
          error:
            assetInsertError
        } = await supabase
          .from(
            "user_assets"
          )
          .insert([
            {
              user_id:
                deposit.user_id,
              coin:
                "USDT",
              balance:
                newExchangeBalance,
              available:
                newExchangeBalance,
              frozen: 0
            }
          ]);

        if (
          assetInsertError
        ) {
          alert(
            assetInsertError.message
          );
          return;
        }
      }
    }

    // ---------------------------------------------------
    // CRYPTO DEPOSIT
    // ---------------------------------------------------
    else {
      const {
        data: existingAsset,
        error:
          assetFetchError
      } = await supabase
        .from(
          "user_assets"
        )
        .select("*")
        .eq(
          "user_id",
          deposit.user_id
        )
        .ilike(
          "coin",
          coin
        )
        .maybeSingle();

      if (
        assetFetchError
      ) {
        alert(
          assetFetchError.message
        );
        return;
      }

      if (
        existingAsset
      ) {
        const currentBalance =
          Number(
            existingAsset.balance ||
              0
          );

        const currentAvailable =
          Number(
            existingAsset.available ??
              existingAsset.balance ??
              0
          );

        await supabase
          .from(
            "user_assets"
          )
          .update({
            balance:
              currentBalance +
              amount,
            available:
              currentAvailable +
              amount
          })
          .eq(
            "id",
            existingAsset.id
          );
      } else {
        await supabase
          .from(
            "user_assets"
          )
          .insert([
            {
              user_id:
                deposit.user_id,
              coin,
              balance:
                amount,
              available:
                amount,
              frozen: 0
            }
          ]);
      }
    }

    // ---------------------------------------------------
    // STATUS APPROVED
    // ---------------------------------------------------
    const {
      error:
        depositStatusError
    } = await supabase
      .from("deposits")
      .update({
        status:
          "Approved"
      })
      .eq(
        "id",
        deposit.id
      );

    if (
      depositStatusError
    ) {
      alert(
        depositStatusError.message
      );
      return;
    }

    alert(
      `${amount} ${coin} deposit approved and added to the user's balance!`
    );

    await fetchData();
  } catch (err) {
    console.error(
      "Deposit approval error:",
      err
    );

    alert(
      err.message ||
        "Failed to approve deposit."
    );
  }
};


// =========================================================
 // REJECT DEPOSIT
 // =========================================================
 const rejectDeposit =
 async (deposit) => {
 try {
 const { error } =
 await supabase
 .from("deposits")
 .update({
 status:
 "Rejected"
 })
 .eq(
 "id",
 deposit.id
 );

    if (error) {
      alert(
        error.message
      );
      return;
    }

    alert(
      "Deposit rejected"
    );

    await fetchData();
  } catch (err) {
    console.error(err);

    alert(
      err.message ||
        "Failed to reject deposit."
    );
  }
};


// =========================================================
 // APPROVE WITHDRAWAL
 // =========================================================
 const approveWithdrawal =
 async (withdrawal) => {
 try {
 const user =
 users.find(
 (u) =>
 u.id ===
 withdrawal.user_id
 );

    if (!user) {
      alert(
        "User not found"
      );
      return;
    }

    const withdrawAmount =
      Number(
        withdrawal.amount ||
          0
      );

    const coin =
      (
        withdrawal.coin ||
        "USDT"
      ).toUpperCase();

    if (
      !withdrawAmount ||
      withdrawAmount <= 0
    ) {
      alert(
        "Invalid withdrawal amount"
      );
      return;
    }

    // ---------------------------------------------------
    // USDT
    // ---------------------------------------------------
    if (
      coin === "USDT"
    ) {
      const currentBalance =
        Number(
          user.wallet
            ?.balance || 0
        );

      const currentBonus =
        Number(
          user.wallet
            ?.bonus || 0
        );

      const totalAvailable =
        currentBalance +
        currentBonus;

      if (
        withdrawAmount >
        totalAvailable
      ) {
        alert(
          `User Exchange balance is too low. Available: $${totalAvailable.toFixed(
            2
          )}`
        );
        return;
      }

      let remainingAmount =
        withdrawAmount;

      const balanceUsed =
        Math.min(
          currentBalance,
          remainingAmount
        );

      remainingAmount -=
        balanceUsed;

      const newBalance =
        currentBalance -
        balanceUsed;

      const bonusUsed =
        Math.min(
          currentBonus,
          remainingAmount
        );

      remainingAmount -=
        bonusUsed;

      const newBonus =
        currentBonus -
        bonusUsed;

      if (
        remainingAmount >
        0
      ) {
        alert(
          "Insufficient Exchange balance."
        );
        return;
      }

      const {
        error:
          walletError
      } = await supabase
        .from("wallets")
        .update({
          balance:
            newBalance,
          bonus:
            newBonus
        })
        .eq(
          "user_id",
          withdrawal.user_id
        );

      if (
        walletError
      ) {
        alert(
          walletError.message
        );
        return;
      }

      const newExchangeBalance =
        newBalance +
        newBonus;

      const {
        error:
          assetError
      } = await supabase
        .from(
          "user_assets"
        )
        .update({
          balance:
            newExchangeBalance,
          available:
            newExchangeBalance
        })
        .eq(
          "user_id",
          withdrawal.user_id
        )
        .ilike(
          "coin",
          "USDT"
        );

      if (
        assetError
      ) {
        alert(
          assetError.message
        );
        return;
      }
    }

    // ---------------------------------------------------
    // BTC / ETH / OTHER CRYPTO
    // ---------------------------------------------------
    else {
      const {
        data: asset,
        error:
          assetFetchError
      } = await supabase
        .from(
          "user_assets"
        )
        .select("*")
        .eq(
          "user_id",
          withdrawal.user_id
        )
        .ilike(
          "coin",
          coin
        )
        .maybeSingle();

      if (
        assetFetchError
      ) {
        alert(
          assetFetchError.message
        );
        return;
      }

      if (!asset) {
        alert(
          `No ${coin} asset found for this user.`
        );
        return;
      }

      const currentAssetBalance =
        Number(
          asset.balance ||
            0
        );

      const currentAssetAvailable =
        Number(
          asset.available ??
            asset.balance ??
            0
        );

      if (
        withdrawAmount >
        currentAssetAvailable
      ) {
        alert(
          `User ${coin} balance is too low. Available: ${currentAssetAvailable}`
        );
        return;
      }

      const newAssetBalance =
        Math.max(
          0,
          currentAssetBalance -
            withdrawAmount
        );

      const newAssetAvailable =
        Math.max(
          0,
          currentAssetAvailable -
            withdrawAmount
        );

      const {
        error:
          assetUpdateError
      } = await supabase
        .from(
          "user_assets"
        )
        .update({
          balance:
            newAssetBalance,
          available:
            newAssetAvailable
        })
        .eq(
          "id",
          asset.id
        );

      if (
        assetUpdateError
      ) {
        alert(
          assetUpdateError.message
        );
        return;
      }
    }

    // ---------------------------------------------------
    // WITHDRAWAL APPROVED
    // ---------------------------------------------------
    const {
      error:
        withdrawError
    } = await supabase
      .from("withdrawals")
      .update({
        status:
          "Approved"
      })
      .eq(
        "id",
        withdrawal.id
      );

    if (
      withdrawError
    ) {
      alert(
        withdrawError.message
      );
      return;
    }

    alert(
      "Withdrawal approved and balance deducted!"
    );

    await fetchData();
  } catch (err) {
    console.error(
      "Withdrawal approval error:",
      err
    );

    alert(
      err.message ||
        "Failed to approve withdrawal."
    );
  }
};


// =========================================================
 // REJECT WITHDRAWAL
 // =========================================================
 const rejectWithdrawal =
 async (withdrawal) => {
 try {
 const { error } =
 await supabase
 .from("withdrawals")
 .update({
 status:
 "Rejected"
 })
 .eq(
 "id",
 withdrawal.id
 );

    if (error) {
      alert(
        error.message
      );
      return;
    }

    alert(
      "Withdrawal rejected"
    );

    await fetchData();
  } catch (err) {
    console.error(err);

    alert(
      err.message ||
        "Failed to reject withdrawal."
    );
  }
};


// =========================================================
 // APPROVE VERIFICATION
 // =========================================================
 const approveVerification =
 async (id) => {
 try {
 const { error } =
 await supabase
 .from(
 "verifications"
 )
 .update({
 status:
 "Approved"
 })
 .eq(
 "id",
 id
 );

    if (error) {
      alert(
        error.message
      );
      return;
    }

    alert(
      "Verification approved"
    );

    await fetchData();
  } catch (err) {
    console.error(err);

    alert(
      err.message ||
        "Failed to approve verification."
    );
  }
};


// =========================================================
 // REJECT VERIFICATION
 // =========================================================
 const rejectVerification =
 async (id) => {
 try {
 const { error } =
 await supabase
 .from(
 "verifications"
 )
 .update({
 status:
 "Rejected"
 })
 .eq(
 "id",
 id
 );

    if (error) {
      alert(
        error.message
      );
      return;
    }

    alert(
      "Verification rejected"
    );

    await fetchData();
  } catch (err) {
    console.error(err);

    alert(
      err.message ||
        "Failed to reject verification."
    );
  }
};


// =========================================================
 // RENDER
 // =========================================================
 return (

<div>
Admin Dashboard

  {/* OVERVIEW */}
  <div className="grid md:grid-cols-5 gap-4">
    <div className="bg-gray-900 p-5 rounded-xl">
      <p className="text-gray-400">
        Total Users
      </p>

      <h2 className="text-3xl font-bold">
        {users.length}
      </h2>
    </div>

    <div className="bg-gray-900 p-5 rounded-xl">
      <p className="text-gray-400">
        Pending Deposits
      </p>

      <h2 className="text-3xl font-bold">
        {
          deposits.filter(
            (d) =>
              d.status ===
              "Pending"
          ).length
        }
      </h2>
    </div>

    <div className="bg-gray-900 p-5 rounded-xl">
      <p className="text-gray-400">
        Pending Withdrawals
      </p>

      <h2 className="text-3xl font-bold">
        {
          withdrawals.filter(
            (w) =>
              w.status ===
              "Pending"
          ).length
        }
      </h2>
    </div>

    <div className="bg-gray-900 p-5 rounded-xl">
      <p className="text-gray-400">
        Total Deposits
      </p>

      <h2 className="text-3xl font-bold">
        $
        {users
          .reduce(
            (total, user) =>
              total +
              (Number(
                user.wallet
                  ?.total_deposit
              ) || 0),
            0
          )
          .toFixed(2)}
      </h2>
    </div>
  </div>

  {/* TRADING SIGNAL */}
  <div className="bg-gray-900 p-6 rounded-xl">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">
        Manage Active Trading Signal
      </h2>

      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-bold px-2 py-1 rounded ${
            signalIsActive
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          Status:{" "}
          {signalIsActive
            ? "ON (Visible)"
            : "OFF (Hidden)"}
        </span>

        <button
          onClick={() =>
            handleUpdateSignal(
              null,
              !signalIsActive
            )
          }
          className={`px-4 py-1.5 rounded font-bold text-xs ${
            signalIsActive
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {signalIsActive
            ? "Turn OFF"
            : "Turn ON"}
        </button>
      </div>
    </div>

    {signalMsg && (
      <div className="p-3 mb-4 rounded bg-emerald-500/10 text-emerald-400 text-sm">
        {signalMsg}
      </div>
    )}

    <form
      onSubmit={(e) =>
        handleUpdateSignal(
          e,
          signalIsActive
        )
      }
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div>
        <label className="text-xs text-gray-400 block mb-1">
          Trading Pair
        </label>

        <input
          type="text"
          value={signalPair}
          onChange={(e) =>
            setSignalPair(
              e.target.value
            )
          }
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">
          Profit Percentage (%)
        </label>

        <input
          type="number"
          step="0.1"
          value={signalProfit}
          onChange={(e) =>
            setSignalProfit(
              e.target.value
            )
          }
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
        />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded"
        >
          Save Changes
        </button>
      </div>
    </form>
  </div>

  {/* GLOBAL BALANCE */}
  <div className="bg-gray-900 p-6 rounded-xl">
    <h2 className="text-xl font-bold mb-4">
      Global Balance Adjustment
    </h2>

    <p className="text-gray-400 text-sm mb-4">
      Remove the same amount from every user's wallet balance.
    </p>

    <div className="flex flex-col md:flex-row gap-3">
      <input
        type="number"
        value={
          yieldAdjustment
        }
        onChange={(e) =>
          setYieldAdjustment(
            e.target.value
          )
        }
        placeholder="Amount to remove"
        className="bg-gray-800 border border-gray-700 rounded p-3 text-white"
      />

      <button
        onClick={
          applyGlobalYield
        }
        className="bg-red-600 hover:bg-red-500 px-5 py-3 rounded font-bold"
      >
        Apply
      </button>
    </div>

    {yieldMessage && (
      <p className="text-green-400 mt-3">
        {yieldMessage}
      </p>
    )}
  </div>

  {/* USERS */}
  <UsersTable
    users={users}
    setUsers={setUsers}
    updateUser={updateUser}
  />

  {/* MAX TRADES */}
  <div className="bg-gray-900 p-6 rounded-xl">
    <h2 className="text-xl font-bold mb-4">
      Manage Daily Trades Permission per User
    </h2>

    <div className="max-h-[350px] overflow-y-auto overflow-x-auto">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="text-gray-400 border-b border-gray-800 sticky top-0 bg-gray-900">
          <tr>
            <th className="p-3">
              User Email / Name
            </th>

            <th className="p-3">
              Current Allowed Trades
            </th>

            <th className="p-3">
              Change Limit
            </th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-gray-800/50"
            >
              <td className="p-3 font-semibold">
                {u.email ||
                  u.name ||
                  u.id}
              </td>

              <td className="p-3 text-amber-400 font-bold">
                {u.max_daily_trades ||
                  2}{" "}
                Trades / day
              </td>

              <td className="p-3">
                <select
                  value={
                    u.max_daily_trades ||
                    2
                  }
                  onChange={(e) =>
                    handleUpdateMaxTrades(
                      u.id,
                      e.target
                        .value
                    )
                  }
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value={2}>
                    2 Trades
                  </option>

                  <option value={3}>
                    3 Trades
                  </option>

                  <option value={4}>
                    4 Trades
                  </option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>

  {/* DEPOSITS */}
  <div className="bg-gray-900 p-6 rounded-xl">
    <h2 className="text-xl font-bold mb-4">
      Deposit Requests
    </h2>

    <div className="max-h-[350px] overflow-y-auto overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="text-gray-400 sticky top-0 bg-gray-900">
          <tr>
            <th className="p-3">
              User / Ref
            </th>

            <th className="p-3">
              Coin
            </th>

            <th className="p-3">
              Amount
            </th>

            <th className="p-3">
              Status
            </th>

            <th className="p-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {deposits.map(
            (deposit) => (
              <tr
                key={deposit.id}
                className="border-t border-gray-800"
              >
                <td className="p-3 font-medium">
                  <div>
                    {deposit
                      .profile
                      ?.name ||
                      "Onbekend"}
                  </div>

                  <div className="text-xs text-gray-400">
                    {
                      deposit
                        .profile
                        ?.email
                    }

                    {deposit
                      .profile
                      ?.referred_by
                      ? ` (Ref: ${deposit.profile.referred_by})`
                      : ""}
                  </div>
                </td>

                <td className="p-3">
                  {deposit.coin}
                </td>

                <td className="p-3">
                  ${deposit.amount}
                </td>

                <td className="p-3">
                  {deposit.status}
                </td>

                <td className="p-3">
                  {deposit.status ===
                    "Pending" && (
                    <>
                      <button
                        onClick={() =>
                          approveDeposit(
                            deposit
                          )
                        }
                        className="bg-green-500 px-3 py-2 rounded mr-2 text-xs font-bold text-black"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          rejectDeposit(
                            deposit
                          )
                        }
                        className="bg-red-500 px-3 py-2 rounded text-xs font-bold text-white"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* WITHDRAWALS */}
  <div className="bg-gray-900 p-6 rounded-xl">
    <h2 className="text-xl font-bold mb-4">
      Withdrawal Requests
    </h2>

    <div className="max-h-[350px] overflow-y-auto overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="text-gray-400 sticky top-0 bg-gray-900">
          <tr>
            <th className="p-3">
              User / Ref
            </th>

            <th className="p-3">
              Coin
            </th>

            <th className="p-3">
              Requested Amount
            </th>

            <th className="p-3">
              You Receive (Net)
            </th>

            <th className="p-3">
              Wallet Address
            </th>

            <th className="p-3">
              Status
            </th>

            <th className="p-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {withdrawals.map(
            (withdrawal) => (
              <tr
                key={withdrawal.id}
                className="border-t border-gray-800"
              >
                <td className="p-3 font-medium">
                  <div>
                    {withdrawal
                      .profile
                      ?.name ||
                      "Onbekend"}
                  </div>

                  <div className="text-xs text-gray-400">
                    {
                      withdrawal
                        .profile
                        ?.email
                    }

                    {withdrawal
                      .profile
                      ?.referred_by
                      ? ` (Ref: ${withdrawal.profile.referred_by})`
                      : ""}
                  </div>
                </td>

                <td className="p-3">
                  {withdrawal.coin}
                </td>

                <td className="p-3 font-semibold">
                  $
                  {
                    withdrawal.amount
                  }
                </td>

                <td className="p-3 text-emerald-400 font-bold">
                  $
                  {
                    withdrawal.receive_amount ??
                    withdrawal.amount
                  }
                </td>

                <td className="p-3 break-all max-w-[200px]">
                  {
                    withdrawal.wallet_address
                  }
                </td>

                <td className="p-3">
                  {
                    withdrawal.status
                  }
                </td>

                <td className="p-3">
                  {withdrawal.status
                    ?.toLowerCase()
                    .trim() ===
                    "pending" && (
                    <>
                      <button
                        onClick={() =>
                          approveWithdrawal(
                            withdrawal
                          )
                        }
                        className="bg-green-500 px-3 py-2 rounded mr-2 text-xs font-bold text-black"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          rejectWithdrawal(
                            withdrawal
                          )
                        }
                        className="bg-red-500 px-3 py-2 rounded text-xs font-bold text-white"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* VERIFICATIONS */}
  <div className="bg-gray-900 p-6 rounded-xl">
    <h2 className="text-xl font-bold mb-4">
      ID Verification Requests
    </h2>

    <div className="max-h-[350px] overflow-y-auto overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead className="text-gray-400 sticky top-0 bg-gray-900">
          <tr>
            <th className="p-3">
              Name
            </th>

            <th className="p-3">
              Email
            </th>

            <th className="p-3">
              Documents
            </th>

            <th className="p-3">
              Status
            </th>

            <th className="p-3">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {verifications.map(
            (verification) => (
              <tr
                key={
                  verification.id
                }
                className="border-t border-gray-800"
              >
                <td className="p-3">
                  {
                    verification
                      .profile
                      ?.name
                  }
                </td>

                <td className="p-3">
                  {
                    verification
                      .profile
                      ?.email
                  }
                </td>

                <td className="p-3">
                  <div className="flex gap-2">
                    <a
                      href={
                        verification.front_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded"
                    >
                      Front ID ↗
                    </a>

                    <a
                      href={
                        verification.back_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded"
                    >
                      Back ID ↗
                    </a>
                  </div>
                </td>

                <td className="p-3">
                  {
                    verification.status
                  }
                </td>

                <td className="p-3">
                  {verification.status ===
                    "Pending" && (
                    <>
                      <button
                        onClick={() =>
                          approveVerification(
                            verification.id
                          )
                        }
                        className="bg-green-500 px-3 py-1.5 rounded mr-2 text-xs font-bold text-white"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          rejectVerification(
                            verification.id
                          )
                        }
                        className="bg-red-500 px-3 py-1.5 rounded text-xs font-bold text-white"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  </div>
</div>


);
 }

export default Admin;