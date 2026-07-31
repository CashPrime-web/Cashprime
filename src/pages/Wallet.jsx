import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Wallet() {

  const [wallet, setWallet] = useState({
    balance: 0,
    total_deposit: 0,
    bonus: 0
  });



  const loadWallet = async () => {


    const { data:{ user } } = await supabase.auth.getUser();


    if(!user) return;



    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();



    if(error){

      console.log(error);
      return;

    }



    if(data){

      setWallet(data);

    }


  };



  useEffect(()=>{


    loadWallet();


    const interval = setInterval(()=>{

      loadWallet();

    },5000);


    return ()=>clearInterval(interval);


  },[]);




  return (

    <div>


      <h1 className="text-3xl font-bold mb-6">
        My Wallet
      </h1>



      <div className="bg-gray-900 rounded-xl p-6 mb-6">


        <p className="text-gray-400">
          Total Balance
        </p>


        <h2 className="text-4xl font-bold mt-2">
          ${wallet.balance}
        </h2>


      </div>





      <div className="grid md:grid-cols-3 gap-5">



        <div className="bg-gray-900 rounded-xl p-6">


          <p className="text-gray-400">
            Total Deposit
          </p>


          <h2 className="text-3xl font-bold text-green-400 mt-3">
            ${wallet.total_deposit}
          </h2>


        </div>





        <div className="bg-gray-900 rounded-xl p-6">


          <p className="text-gray-400">
            Bonus
          </p>


          <h2 className="text-3xl font-bold text-blue-400 mt-3">
            ${wallet.bonus}
          </h2>


        </div>





        <div className="bg-gray-900 rounded-xl p-6">


          <p className="text-gray-400">
            Wallet Status
          </p>


          <h2 className="text-3xl font-bold mt-3 text-green-400">
            Active
          </h2>


        </div>



      </div>



    </div>

  );

}


export default Wallet;