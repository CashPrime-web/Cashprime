import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


function Transactions() {


  const [transactions, setTransactions] = useState([]);



  const loadTransactions = async () => {


    const { data:{ user } } = await supabase.auth.getUser();


    if(!user) return;



    const { data: deposits, error } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending:false
      });



    if(error){

      console.log(error);
      return;

    }



    setTransactions(deposits || []);


  };





  useEffect(()=>{

    loadTransactions();

  },[]);





  const coinLogo = (coin)=>{

    if(coin === "BTC"){
      return (
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl">
          ₿
        </div>
      );
    }



    if(coin === "ETH"){
      return (
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
          Ξ
        </div>
      );
    }



    if(coin === "USDT"){
      return (
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
          ₮
        </div>
      );
    }



    return (
      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white">
        $
      </div>
    );

  };






  return (

    <div>


      <h1 className="text-3xl font-bold mb-6">
        Transactions
      </h1>



      <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">



        <table className="w-full text-left">



          <thead className="text-gray-400 border-b border-gray-700">


            <tr>


              <th className="p-3">
                Asset
              </th>


              <th className="p-3">
                Type
              </th>


              <th className="p-3">
                Network
              </th>


              <th className="p-3">
                Amount
              </th>


              <th className="p-3">
                Date
              </th>


              <th className="p-3">
                Status
              </th>


            </tr>


          </thead>





          <tbody>



          {
            transactions.length === 0 && (

              <tr>

                <td
                colSpan="6"
                className="p-5 text-gray-400 text-center"
                >

                  No transactions yet

                </td>

              </tr>

            )
          }






          {
            transactions.map((tx)=>(



              <tr
              key={tx.id}
              className="border-b border-gray-800"
              >




                <td className="p-3">


                  <div className="flex items-center gap-3">


                    {coinLogo(tx.coin)}



                    <span className="font-bold">

                      {tx.coin}

                    </span>


                  </div>


                </td>





                <td className="p-3">

                  Deposit

                </td>





                <td className="p-3">

                  {tx.network}

                </td>





                <td className="p-3 font-bold">

                  ${tx.amount}

                </td>





                <td className="p-3 text-gray-400">


                  {new Date(
                    tx.created_at
                  ).toLocaleDateString()}


                </td>





                <td className={

                  tx.status === "Approved"

                  ?

                  "p-3 text-green-400 font-bold"

                  :

                  tx.status === "Rejected"

                  ?

                  "p-3 text-red-400 font-bold"

                  :

                  "p-3 text-yellow-400 font-bold"

                }>


                  {tx.status}


                </td>



              </tr>



            ))
          }





          </tbody>



        </table>


      </div>


    </div>


  );


}


export default Transactions;