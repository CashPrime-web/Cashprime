import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


function AdminRoute({ children }) {


  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);



  useEffect(()=>{


    const checkAdmin = async()=>{


      const {
        data:{user}
      } = await supabase.auth.getUser();



      if(!user){

        setIsAdmin(false);
        setLoading(false);
        return;

      }



      const {data:profile,error}= await supabase
      .from("profiles")
      .select("role")
      .eq("id",user.id)
      .single();



      if(error){

        console.log(error);
        setIsAdmin(false);
        setLoading(false);
        return;

      }



      if(profile.role === "admin"){

        setIsAdmin(true);

      }else{

        setIsAdmin(false);

      }



      setLoading(false);


    };



    checkAdmin();


  },[]);





  if(loading){

    return (

      <div className="text-white p-8">
        Checking access...
      </div>

    );

  }



  if(!isAdmin){

    return <Navigate to="/" />;

  }



  return children;


}


export default AdminRoute;