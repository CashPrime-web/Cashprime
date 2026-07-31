import { useEffect, useState } from "react";
import { getStockPrice } from "../services/marketApi";

function MarketIndices() {

  const [assets, setAssets] = useState([]);


  useEffect(() => {

    async function loadMarkets() {

      try {

        const symbols = [
          {
            name: "S&P 500",
            symbol: "SPY"
          },
          {
            name: "Nasdaq 100",
            symbol: "QQQ"
          },
          {
            name: "Gold",
            symbol: "XAU"
          },
          {
            name: "Silver",
            symbol: "SLV"
          }
        ];


        const results = await Promise.all(
          symbols.map(async (item) => {

            const data = await getStockPrice(item.symbol);

            return {
              name: item.name,
              symbol: item.symbol,
              price:
                data["Global Quote"]?.["05. price"] 
                || "No data"
            };

          })
        );


        setAssets(results);


      } catch(error) {

        console.log(error);

      }

    }


    loadMarkets();


  }, []);



  return (

    <div className="mt-8">

      <h2 className="text-2xl font-bold mb-4">
        Live Indices & Metals
      </h2>


      <div className="grid md:grid-cols-4 gap-4">

        {assets.map((asset)=>(

          <div
            key={asset.symbol}
            className="bg-gray-900 p-5 rounded-xl"
          >

            <h3 className="font-bold">
              {asset.name}
            </h3>

            <p className="text-blue-400">
              {asset.symbol}
            </p>

            <p className="text-2xl mt-3">
              {asset.price}
            </p>

          </div>

        ))}

      </div>

    </div>

  );

}

export default MarketIndices;