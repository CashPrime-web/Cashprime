import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import UsersTable from "../components/admin/UsersTable.jsx";

console.log("ADMIN LOADED");
function Admin() {


  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [verifications, setVerifications] = useState([]);



  const fetchData = async()=>{


    const {data:profiles,error} = await supabase
    .from("profiles")
    .select("*");



    if(error){

      console.log(error);
      return;

    }



    const {data:wallets,error:walletError}= await supabase
    .from("wallets")
    .select("*");



    if(walletError){

      console.log(walletError);
      return;

    }



    const combined = profiles.map((user)=>({

      ...user,

      wallet: wallets.find(
        wallet=>wallet.user_id === user.id
      )

    }));


    setUsers(combined);




    const {data:depositData,error:depositError}= await supabase
    .from("deposits")
    .select("*")
    .order("created_at",{ascending:false});



    if(depositError){

      console.log(depositError);
      return;

    }


    setDeposits(depositData);
    const { data: withdrawalData, error: withdrawalError } = await supabase
  .from("withdrawals")
  .select("*")

  console.log("WITHDRAWAL TEST:", withdrawalData, withdrawalError);
 


if(withdrawalError){

  console.log(withdrawalError);
  return;

}


setWithdrawals(withdrawalData);

console.log("MY WITHDRAWALS:", withdrawalData);
const { data: verificationData, error: verificationError } = await supabase
  .from("verifications")
  .select("*")
  .order("created_at", { ascending: false });


if(verificationError){

  console.log(verificationError);
  return;

}

const verificationWithUsers = await Promise.all(
  verificationData.map(async (verification)=>{

    const { data: profile } = await supabase
      .from("profiles")
      .select("name,email")
      .eq("id", verification.user_id)
      .maybeSingle();


    return {
      ...verification,
      profile
    };

  })
);


setVerifications(verificationWithUsers);

console.log("MY VERIFICATIONS DETAIL:", JSON.stringify(verificationWithUsers, null, 2));  };

  useEffect(()=>{

    fetchData();

  },[]);







  const updateUser = async(user)=>{


    if(user.wallet){


      const {error}= await supabase
      .from("wallets")
      .update({

        total_deposit:user.wallet.total_deposit,

        balance:user.wallet.balance,

        bonus:user.wallet.bonus

      })
      .eq("user_id",user.id);



      if(error){

        console.log(error);
        return;

      }


    }



    await supabase
    .from("profiles")
    .update({

      status:user.status

    })
    .eq("id",user.id);



    alert("User updated");

    fetchData();


  };







  const approveDeposit = async(deposit)=>{


    const user = users.find(
      user=>user.id === deposit.user_id
    );



    if(!user){

      alert("User not found");
      return;

    }



    const amount = Number(deposit.amount);




    if(!user.wallet){


      const {error}= await supabase
      .from("wallets")
      .insert({

        user_id:deposit.user_id,

        total_deposit:amount,

        balance:amount,

        bonus:0

      });



      if(error){

        alert(error.message);
        return;

      }



    }else{



      const {error}= await supabase
      .from("wallets")
      .update({

        total_deposit:
        Number(user.wallet.total_deposit || 0)+amount,


        balance:
        Number(user.wallet.balance || 0)+amount


      })
      .eq("user_id",deposit.user_id);



      if(error){

        alert(error.message);
        return;

      }


    }

    await supabase
    .from("deposits")
    .update({

      status:"Approved"

    })
    .eq("id",deposit.id);

    alert("Deposit approved");

    fetchData();

  };

  const rejectDeposit = async(deposit)=>{

    await supabase
    .from("deposits")
    .update({

      status:"Rejected"

    })
    .eq("id",deposit.id);

    alert("Deposit rejected");

    fetchData();

  };
    const approveWithdrawal = async(withdrawal)=>{
        console.log("CLICKED WITHDRAWAL:", withdrawal);

    const user = users.find(
      user=>user.id === withdrawal.user_id
    );

    if(!user || !user.wallet){

      alert("Wallet not found");
      return;

    }

    const amount = Number(withdrawal.amount);

    if(user.wallet.balance < amount){

      alert("Insufficient balance");
      return;

    }

    const {error:walletError}= await supabase
    .from("wallets")
    .update({

      balance:
      Number(user.wallet.balance) - amount


    })
    .eq("user_id",withdrawal.user_id);

    if(walletError){

      alert(walletError.message);
      return;

    }

    const {data, error}= await supabase
  .from("withdrawals")
  .update({
    status:"Approved"
  })
  .eq("id", withdrawal.id)
  .select();

console.log("APPROVE WITHDRAWAL RESULT:", data, error);
    if(error){

      alert(error.message);
      return;

    }

    alert("Withdrawal approved");

    fetchData();

  };

  const rejectWithdrawal = async(withdrawal)=>{

    const {error}= await supabase
    .from("withdrawals")
    .update({

      status:"Rejected"

    })
    .eq("id",withdrawal.id);

    if(error){

      alert(error.message);
      return;

    }

    alert("Withdrawal rejected");
    

    fetchData();


  };
const approveVerification = async(id)=>{

  const {error} = await supabase
  .from("verifications")
  .update({
    status:"Approved"
  })
  .eq("id", id);


  if(error){

    alert(error.message);
    return;

  }


  alert("Verification approved");

  fetchData();

};



const rejectVerification = async(id)=>{

  const {error} = await supabase
  .from("verifications")
  .update({
    status:"Rejected"
  })
  .eq("id", id);


  if(error){

    alert(error.message);
    return;

  }


  alert("Verification rejected");

  fetchData();

};
  return (

<div className="p-4 md:p-8 text-white overflow-x-hidden">
        <h1 className="text-3xl font-bold mb-6">
        Admin Dashboard
      </h1>

      <div className="grid md:grid-cols-5 gap-4 mb-8">


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
                d=>d.status==="Pending"
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
                w=>w.status==="Pending"
              ).length
            }
          </h2>

        </div>

        <div className="bg-gray-900 p-5 rounded-xl">

          <p className="text-gray-400">
            Total Deposits
          </p>

          <h2 className="text-3xl font-bold">

            {
              users.reduce(
                (total,user)=>
                total+(user.wallet?.total_deposit || 0),
                0
              )
            }

          </h2>

        </div>

      </div>

  <UsersTable
  users={users}
  setUsers={setUsers}
  updateUser={updateUser}
/>

      <div className="bg-gray-900 p-6 rounded-xl mb-8">


      <h2 className="text-xl font-bold mb-4">
        Deposit Requests
      </h2>
      <div className="overflow-x-auto w-full">

<table className="w-full min-w-[700px] text-left text-sm">
      <thead className="text-gray-400">

      <tr>

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
      {
        deposits.map((deposit)=>(

        <tr
        key={deposit.id}
        className="border-t border-gray-800"
        >


        <td className="p-3">
          {deposit.coin}
        </td>


        <td className="p-3">
          {deposit.amount}
        </td>


        <td className="p-3">
          {deposit.status}
        </td>


        <td className="p-3">


        {deposit.status==="Pending" && (
<>
<button
onClick={()=>approveDeposit(deposit)}
className="bg-green-500 px-3 py-2 rounded mr-2"
>
Approve
</button>

<button
onClick={()=>rejectDeposit(deposit)}
className="bg-red-500 px-3 py-2 rounded"
>
Reject
</button>
</>
)}

        </td>

        </tr>


        ))
      }
      </tbody>


           </table>

</div>
      </div>     

      {/* Withdrawal Requests */}

      <div className="bg-gray-900 p-6 rounded-xl">


        <h2 className="text-xl font-bold mb-4">
          Withdrawal Requests
        </h2>


<div className="overflow-x-auto">

  <table className="w-full min-w-[700px] text-left">

          <thead className="text-gray-400">

            <tr>

              <th className="p-3">
                Coin
              </th>

              <th className="p-3">
                Amount
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

          {withdrawals.map((withdrawal)=>(

            <tr
            key={withdrawal.id}
            className="border-t border-gray-800"
            >


              <td className="p-3">
                {withdrawal.coin}
              </td>


              <td className="p-3">
                {withdrawal.amount}
              </td>

<td className="p-3 break-all max-w-[250px]">
                    {withdrawal.wallet_adress}
              </td>


              <td className="p-3">
                {withdrawal.status}
              </td>


              <td className="p-3">

              {withdrawal.status === "Pending" && (

              <>

              <button
              onClick={()=>approveWithdrawal(withdrawal)}
              className="bg-green-500 px-3 py-2 rounded mr-2"
              >
                Approve
              </button>


              <button
              onClick={()=>rejectWithdrawal(withdrawal)}
              className="bg-red-500 px-3 py-2 rounded"
              >
                Reject
              </button>


              </>

              )}

              </td>


            </tr>

          ))}


          </tbody>


        </table>
</div>

        </div>


<div className="bg-gray-900 p-6 rounded-xl mt-8">


<h2 className="text-xl font-bold mb-4">
  ID Verification Requests
</h2>
<div className="overflow-x-auto w-full">

<table className="w-full min-w-[700px] text-left">


<thead className="text-gray-400">

<tr>

<th className="p-3">
Name
</th>

<th className="p-3">
Email
</th>

<th className="p-3">
Document
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

{
verifications.map((verification)=>(

<tr
key={verification.id}
className="border-t border-gray-800"
>


<td className="p-3">
{verification.profile?.name}
</td>

<td className="p-3">
{verification.profile?.email}
</td>


<td className="p-3">

<a
href={verification.document_url}
target="_blank"
className="text-blue-400"
>
View Document
</a>

</td>


<td className="p-3">
{verification.status}
</td>


<td className="p-3">

{verification.status === "Pending" && (
  <>
    <button
      onClick={()=>approveVerification(verification.id)}
      className="bg-green-500 px-3 py-2 rounded mr-2"
    >
      Approve
    </button>

    <button
      onClick={()=>rejectVerification(verification.id)}
      className="bg-red-500 px-3 py-2 rounded"
    >
      Reject
    </button>
  </>
)}


</td>


</tr>

))

}


</tbody>


</table>


</div>
      </div>


    </div>

  );

} 

export default Admin;