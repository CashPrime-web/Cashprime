import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // Haal de status op uit de profiles tabel
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // Als de gebruiker admin is, altijd toelaten
      if (profile.role === "admin") {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // Maak de status altijd lowercase zodat hoofdletters geen probleem vormen
      const userStatus = (profile.status || "").toLowerCase();

      // Controleer de status van de klant
      if (userStatus === "blocked") {
        await supabase.auth.signOut();
        setMessage("Jouw account is geblokkeerd door de beheerder.");
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (userStatus === "pending") {
        await supabase.auth.signOut();
        setMessage("Jouw account is nog in afwachting van goedkeuring (pending).");
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // Als status 'active' is
      setAuthorized(true);
      setLoading(false);
    };

    checkUserStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="animate-pulse text-sm text-gray-400">Controleren van accountstatus...</p>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace state={{ errorMsg: message }} />;
  }

  return children;
}

export default ProtectedRoute;