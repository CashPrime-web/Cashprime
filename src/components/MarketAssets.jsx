function MarketAssets() {

  const assets = [
    {
      name: "S&P 500",
      symbol: "SPX",
      price: "Live data",
      type: "Index"
    },
    {
      name: "Nasdaq 100",
      symbol: "NDX",
      price: "Live data",
      type: "Index"
    },
    {
      name: "DAX",
      symbol: "DAX",
      price: "Live data",
      type: "Index"
    },
    {
      name: "Gold",
      symbol: "XAU",
      price: "Live data",
      type: "Metal"
    },
    {
      name: "Silver",
      symbol: "XAG",
      price: "Live data",
      type: "Metal"
    }
  ];


  return (
    <div className="mt-8">

      <h2 className="text-2xl font-bold mb-4">
        Indices & Metals
      </h2>


      <div className="grid md:grid-cols-3 gap-4">

        {assets.map((asset)=>(

          <div 
          key={asset.symbol}
          className="bg-gray-900 p-5 rounded-xl"
          >

            <div className="flex justify-between">

              <h3 className="font-bold">
                {asset.name}
              </h3>

              <span className="text-blue-400">
                {asset.symbol}
              </span>

            </div>


            <p className="mt-3 text-gray-400">
              {asset.type}
            </p>


            <p className="text-xl font-bold mt-2">
              {asset.price}
            </p>


          </div>

        ))}

      </div>


    </div>
  );
}


export default MarketAssets;