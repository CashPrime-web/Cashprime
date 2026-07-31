import { useEffect, useState } from "react";
import axios from "axios";

function MarketOverview() {

  const [markets, setMarkets] = useState([]);

  useEffect(() => {

    const getPrices = async () => {

      try {

        const response = await axios.get(
          "https://api.coingecko.com/api/v3/simple/price",
          {
            params: {
              ids: "bitcoin,ethereum,solana,binancecoin,ripple,dogecoin",
              vs_currencies: "usd",
              include_24hr_change: true
            }
          }
        );


        const data = response.data;
        console.log(JSON.stringify(data, null, 2));


        setMarkets([
          {
            name: "Bitcoin",
            symbol: "BTC",
            price: data.bitcoin.usd,
            change: data.bitcoin.usd_24h_change
          },
          {
            name: "Ethereum",
            symbol: "ETH",
            price: data.ethereum.usd,
            change: data.ethereum.usd_24h_change
          },
          {
            name: "Solana",
            symbol: "SOL",
            price: data.solana.usd,
            change: data.solana.usd_24h_change
          },
          {
            name: "BNB",
            symbol: "BNB",
            price: data.binancecoin.usd,
            change: data.binancecoin.usd_24h_change
          },
          {
            name: "XRP",
            symbol: "XRP",
            price: data.ripple.usd,
            change: data.ripple.usd_24h_change
          },
          {
            name: "Dogecoin",
            symbol: "DOGE",
            price: data.dogecoin.usd,
            change: data.dogecoin.usd_24h_change
          }
        ]);

      } catch(error) { 
        console.error("Crypto API error:", error);
        setMarkets([]);

      }

    };


    getPrices();

  }, []);



  return (

    <div className="mt-8">

      <h2 className="text-2xl font-bold mb-4">
        Live Crypto Market
      </h2>


      <div className="grid md:grid-cols-3 gap-4">

        {markets.map((coin)=>(

          <div 
            key={coin.symbol}
            className="bg-blue-900 rounded-xl p-5 border border-blue-400"          >

            <div className="flex justify-between">

              <h3 className="font-bold">
                {coin.name}
              </h3>

              <span className="text-blue-400">
                {coin.symbol}
              </span>

            </div>


            <p className="text-2xl font-bold mt-3">
              ${coin.price?.toLocaleString() ?? "loading..."}
            </p>


            <p className={
              coin.change >= 0 
              ? "text-green-400"
              : "text-red-400"
            }>
              {coin.change?.toFixed(2) ?? "0.00"}%
            </p>


          </div>

        ))}

      </div>

    </div>

  );

}

export default MarketOverview;