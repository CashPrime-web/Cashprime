import QRCode from "react-qr-code";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function Deposit() {

  const [coin, setCoin] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("");

  const [history, setHistory] = useState([]);



  const deposits = {

    USDT: {
      TRC20: "TJhEwTziQLTo834C3CBbHpiVEb5RSCYJNC",
      ERC20: "0xb92Fa3CBE7F96a4a212196C1a6D0163c1157ac07",
    },

    BTC: {
      BTC: "12vr23LBGzPopmkeHngLhEJmgArV91wxi8"
    },

    ETH: {
      ERC20: "0xb92Fa3CBE7F96a4a212196C1a6D0163c1157ac07"
    }

  };



  const fetchHistory = async () => {


    const { data:{ user } } = await supabase.auth.getUser();


    if(!user){
      return;
    }



    const { data, error } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending:false });



    if(error){

      console.log(error);
      return;

    }



    setHistory(data || []);


  };



  useEffect(()=>{

    fetchHistory();

  },[]);




  const submitDeposit = async () => {


    const { data:{ user } } = await supabase.auth.getUser();



    if(!user){

      alert("Please login first");
      return;

    }



    if(!amount || Number(amount) <= 0){

      alert("Enter a valid amount");
      return;

    }



    const { error } = await supabase
      .from("deposits")
      .insert([{

        user_id: user.id,

        amount: Number(amount),

        coin: coin,

        network: network,

        status: "Pending"

      }]);



    if(error){

      console.log(error);
      alert(error.message);
      return;

    }



    alert("Deposit request submitted");


    setAmount("");


    fetchHistory();


  };
    return (

    <div className="bg-gray-900 p-6 rounded-xl max-w-xl">


      <h1 className="text-3xl font-bold mb-6">
        Deposit Crypto
      </h1>



      <label className="text-gray-400 block mt-5">
        Amount
      </label>


      <input

      type="number"

      className="bg-gray-800 p-3 rounded w-full mt-2"

      placeholder="Enter amount"

      value={amount}

      onChange={(e)=>setAmount(e.target.value)}

      />



      <label className="text-gray-400 block mt-5">
        Select Asset
      </label>



      <select

      className="bg-gray-800 p-3 rounded w-full mt-2"

      value={coin}

      onChange={(e)=>{

        setCoin(e.target.value);


        if(e.target.value === "USDT"){
          setNetwork("TRC20");
        }

        if(e.target.value === "BTC"){
          setNetwork("BTC");
        }

        if(e.target.value === "ETH"){
          setNetwork("ERC20");
        }

      }}

      >


      <option value="USDT">
        USDT
      </option>


      <option value="BTC">
        Bitcoin
      </option>


      <option value="ETH">
        Ethereum
      </option>


      </select>




      <label className="text-gray-400 block mt-5">
        Select Network
      </label>


      <select

      className="bg-gray-800 p-3 rounded w-full mt-2"

      value={network}

      onChange={(e)=>setNetwork(e.target.value)}

      >


      {Object.keys(deposits[coin]).map((net)=>(

        <option key={net}>
          {net}
        </option>

      ))}


      </select>




      <div className="mt-6">


        <p className="text-gray-400">
          Deposit Network
        </p>


        <h3 className="font-bold text-blue-400">
          {network}
        </h3>



        <div className="flex justify-center mt-6">


          <div className="bg-white p-4 rounded-xl">


            <QRCode

            value={deposits[coin][network]}

            size={180}

            />


          </div>


        </div>




        <p className="text-gray-400 mt-4">
          Deposit Address
        </p>


        <div className="bg-gray-800 p-4 rounded break-all mt-2">

          {deposits[coin][network]}

        </div>



        <button

        className="mt-4 bg-blue-500 px-5 py-3 rounded"

        onClick={()=>navigator.clipboard.writeText(
          deposits[coin][network]
        )}

        >

        Copy Address

        </button>


      </div>





      <button

      onClick={submitDeposit}

      className="mt-6 bg-green-500 px-6 py-3 rounded font-bold"

      >

      I Have Deposited

      </button>





      <div className="mt-8">


        <h2 className="text-xl font-bold mb-4">
          Deposit History
        </h2>



        <div className="bg-gray-800 rounded-xl p-6">


          <div className="overflow-x-auto">


            <table className="w-full text-left">


              <thead className="text-gray-400 border-b border-gray-700">

                <tr>

                  <th className="p-3">
                    Date
                  </th>

                  <th className="p-3">
                    Asset
                  </th>

                  <th className="p-3">
                    Network
                  </th>

                  <th className="p-3">
                    Amount
                  </th>

                  <th className="p-3">
                    Status
                  </th>

                </tr>

              </thead>




              <tbody>


              {history.length === 0 ? (

                <tr>

                  <td className="p-3 text-gray-400">
                    No deposits yet
                  </td>

                </tr>


              ) : (


                history.map((deposit)=>(


                  <tr
                  key={deposit.id}
                  className="border-b border-gray-800"
                  >


                    <td className="p-3 text-gray-400">

                      {new Date(
                        deposit.created_at
                      ).toLocaleDateString()}

                    </td>



                    <td className="p-3">

                      {deposit.coin}

                    </td>



                    <td className="p-3">

                      {deposit.network}

                    </td>



                    <td className="p-3">

                      {deposit.amount}

                    </td>



                    <td

                    className={
                      deposit.status === "Approved"
                      ? "p-3 text-green-400"
                      :
                      deposit.status === "Rejected"
                      ? "p-3 text-red-400"
                      :
                      "p-3 text-yellow-400"
                    }

                    >

                      {deposit.status}

                    </td>



                  </tr>


                ))


              )}



              </tbody>


            </table>


          </div>


        </div>


      </div>



    </div>

  );

}


export default Deposit;