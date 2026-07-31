function CryptoTicker() {


  const coins = [
    {
      name:"BTC",
      price:"$118,500",
      change:"+2.4%"
    },

    {
      name:"ETH",
      price:"$3,800",
      change:"+1.1%"
    },

    {
      name:"USDT",
      price:"$1.00",
      change:"+0.01%"
    },

    {
      name:"BNB",
      price:"$690",
      change:"+3.2%"
    },

    {
      name:"SOL",
      price:"$190",
      change:"+4.5%"
    },

    {
      name:"XRP",
      price:"$3.10",
      change:"+1.8%"
    }
  ];



  return (

    <div className="
    overflow-hidden
    bg-[#0B1224]
    border
    border-[#D4AF37]/40
    rounded-xl
    mb-8
    py-3
    ">


      <div className="
      flex
      gap-12
      whitespace-nowrap
      animate-scroll
      ">


      {[...coins,...coins].map((coin,index)=>(

        <div
        key={index}
        className="flex items-center gap-3"
        >


          <span className="
          font-bold
          text-white
          ">
            {coin.name}
          </span>


          <span className="
          text-[#F5D76E]
          ">
            {coin.price}
          </span>


          <span className="
          text-green-400
          ">
            {coin.change}
          </span>


        </div>

      ))}


      </div>


    </div>

  );

}


export default CryptoTicker;