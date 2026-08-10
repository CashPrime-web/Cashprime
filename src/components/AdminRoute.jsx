import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


function AdminRoute({ children }) {
console.log("🔥 ADMIN ROUTE RENDERED");

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);



useEffect(() => {
  const checkAdmin = async () => {
    console.log("🔥 ADMIN ROUTE RENDERED");
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    console.log("🔥 ADMIN ROUTE RENDERED");

    console.log("ADMIN CHECK USER:", user);
    console.log("ADMIN CHECK USER ERROR:", userError);

    if (!user) {
      console.log("ADMIN CHECK: GEEN INGLOGDE USER");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    console.log("AUTH USER ID:", user.id);
    console.log("AUTH USER EMAIL:", user.email);

    const {
      data: profile,
      error: profileError
    } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

    console.log("ADMIN PROFILE:", profile);
    console.log("ADMIN PROFILE ERROR:", profileError);

    if (profileError) {
      console.log("PROFILE FOUT:", profileError);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (!profile) {
      console.log("GEEN PROFILE GEVONDEN VOOR DEZE USER");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    console.log("PROFILE ID:", profile.id);
    console.log("PROFILE ROLE:", profile.role);

    if (profile.role === "admin") {
      console.log("✅ ADMIN TOEGANG TOEGEKEND");
      setIsAdmin(true);
    } else {
      console.log("❌ GEEN ADMIN ROLE");
      setIsAdmin(false);
    }

    setLoading(false);
  };

  checkAdmin();
}, []);




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