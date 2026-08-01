import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function LogoutButton() {

  const navigate = useNavigate();

  const handleLogout = async () => {

    await supabase.auth.signOut();

    localStorage.removeItem("cashprime_user");

    navigate("/login");

  };


  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 px-4 py-2 rounded-lg text-white font-bold"
    >
      Logout
    </button>
  );
}

export default LogoutButton;