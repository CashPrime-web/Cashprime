import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabase";

import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Verification from "./pages/Verification";
import Transactions from "./pages/Transactions";
import Wallet from "./pages/Wallet";
import Withdraw from "./pages/Withdraw";
import Deposit from "./pages/Deposit";

import MarketOverview from "./components/MarketOverview";
console.log("APP LOADED");

function Layout({ children }) {

  const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);


  const hideLayout =
    location.pathname === "/login" ||
    location.pathname === "/register";


  if(hideLayout){
    return children;
  }


  return (


<div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row overflow-x-hidden">

<aside
className={`
fixed md:static
top-0 left-0
h-screen
w-64
bg-gray-900
p-6
shrink-0
transform
transition-transform
duration-300
z-50
${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
`}
>
    <h1 className="text-2xl font-bold text-blue-400 mb-8">
      CashPrime
    </h1>
    <button
onClick={()=>setMenuOpen(false)}
className="md:hidden absolute top-4 right-4 text-xl"
>
✕
</button>

    <nav className="flex flex-col space-y-4">

  <Link 
    to="/"
    onClick={()=>setMenuOpen(false)}
  >
    Dashboard
  </Link>


  <Link 
    to="/wallet"
    onClick={()=>setMenuOpen(false)}
  >
    Wallet
  </Link>


  <Link 
    to="/deposit"
    onClick={()=>setMenuOpen(false)}
  >
    Deposit
  </Link>


  <Link 
    to="/withdraw"
    onClick={()=>setMenuOpen(false)}
  >
    Withdraw
  </Link>


  <Link 
    to="/transactions"
    onClick={()=>setMenuOpen(false)}
  >
    Transactions
  </Link>


  <Link 
    to="/verification"
    onClick={()=>setMenuOpen(false)}
  >
    ID Verification
  </Link>


  <Link 
    to="/settings"
    onClick={()=>setMenuOpen(false)}
  >
    Settings
  </Link>

</nav>
  </aside>


<main className="flex-1 w-full min-w-0 p-4 md:p-8">

<button
onClick={() => setMenuOpen(true)}
className="md:hidden bg-gray-900 p-3 rounded mb-4"
>
☰
</button>
    {children}

  </main>


</div>

  );

}
function App() {


  const [wallet, setWallet] = useState(null);

  const [transactions, setTransactions] = useState([]);



  const loadDashboard = async () => {


    const { data:{ user } } = await supabase.auth.getUser();


    if(!user){
      return;
    }



    const { data: walletData, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();



    if(walletError){

      console.log(walletError);

    } else {

      setWallet(walletData);

    }




    const { data: depositData, error: depositError } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending:false
      })
      .limit(5);



    if(depositError){

      console.log(depositError);

    } else {

      setTransactions(depositData || []);

    }


  };





  useEffect(()=>{

    loadDashboard();

  },[]);





  return (

  <BrowserRouter>

    <Layout>

      <Routes>


        <Route
          path="/admin"
          element={<Admin />}
        />


        <Route
          path="/login"
          element={<Login />}
        />


        <Route
          path="/register"
          element={<Register />}
        />


        <Route
          path="/wallet"
          element={<Wallet />}
        />


        <Route
          path="/verification"
          element={<Verification />}
        />


        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />


        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />


        <Route
          path="/withdraw"
          element={
            <ProtectedRoute>
              <Withdraw />
            </ProtectedRoute>
          }
        />


        <Route
          path="/deposit"
          element={
            <ProtectedRoute>
              <Deposit />
            </ProtectedRoute>
          }
        />


        <Route
          path="/"
          element={

            <>

              <h2 className="text-3xl font-bold mb-6">
                Welcome to CashPrime
              </h2>


              <div className="grid md:grid-cols-3 gap-6">


                <div className="bg-gray-900 p-6 rounded-xl">

                  <p className="text-gray-400">
                    Total Balance
                  </p>

                  <h3 className="text-3xl font-bold mt-2">
                    ${wallet?.balance || 0}
                  </h3>

                </div>



                <div className="bg-gray-900 p-6 rounded-xl">

                  <p className="text-gray-400">
                    Total Deposit
                  </p>

                  <h3 className="text-3xl font-bold mt-2">
                    ${wallet?.total_deposit || 0}
                  </h3>

                </div>



                <div className="bg-gray-900 p-6 rounded-xl">

                  <p className="text-gray-400">
                    Account Status
                  </p>

                  <h3 className="text-xl font-bold mt-2 text-green-400">
                    Verified
                  </h3>

                </div>


              </div>


              <MarketOverview />


              <div className="mt-8 bg-gray-900 p-6 rounded-xl">


                <h3 className="text-xl font-bold mb-4">
                  Recent Transactions
                </h3>


                {
                  transactions.length === 0 && (

                    <p className="text-gray-400">
                      No transactions available
                    </p>

                  )
                }


                {
                  transactions.map((tx)=>(

                    <div
                      key={tx.id}
                      className="flex justify-between border-b border-gray-800 py-3"
                    >

                      <div>

                        <p className="font-bold">
                          Deposit {tx.coin}
                        </p>


                        <p className="text-gray-400 text-sm">
                          {tx.network}
                        </p>

                      </div>


                      <div className="text-right">

                        <p className="font-bold">
                          ${tx.amount}
                        </p>


                        <p
                          className={
                            tx.status === "Approved"
                            ?
                            "text-green-400"
                            :
                            "text-yellow-400"
                          }
                        >

                          {tx.status}

                        </p>


                      </div>


                    </div>

                  ))
                }


              </div>


            </>

          }
        />


      </Routes>


    </Layout>


  </BrowserRouter>

);

}
export default App;