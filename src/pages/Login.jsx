import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Probeer in te loggen bij Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });

    if (authError || !authData.user) {
      setError("Onjuist e-mailadres of wachtwoord.");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // 2. Haal direct het profiel op om de status te controleren
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Fout bij ophalen profiel:", profileError);
    }

    // Controleer de status (indien er een profiel is gevonden)
    if (profile) {
      // Als het account geblokkeerd is (gecorrigeerd naar hoofdletter "Blocked")
      if (profile.status === "Blocked") {
        await supabase.auth.signOut(); // Direct uitloggen
        setError("Your account has been blocked. Please contact the administrator.");
        setLoading(false);
        return;
      }

      // Als het account nog in afwachting (pending) is (gecorrigeerd naar hoofdletter "Pending")
      if (profile.status === "Pending") {
        await supabase.auth.signOut(); // Direct uitloggen
        setError("Your account is awaiting (Pending) approval by the admin.");
        setLoading(false);
        return;
      }
    }

    // 3. Als alles akkoord is (Active of geen status), door naar de app
    setLoading(false);
    navigate("/");
  };
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md">
        
        <h1 className="text-3xl font-bold text-center mb-6">
          Login
        </h1>

        {error && (
          <p className="text-red-400 mb-4 bg-red-950/40 p-3 rounded border border-red-800 text-sm">
            {error}
          </p>
        )}

        {successMsg && (
          <p className="text-green-400 mb-4 bg-green-950/40 p-3 rounded border border-green-800 text-sm">
            {successMsg}
          </p>
        )}

        <form onSubmit={handleLoginSubmit}>
          <label className="text-gray-400 block">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="bg-gray-800 p-3 rounded w-full mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email address"
          />

          <label className="text-gray-400 block mt-4">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="bg-gray-800 p-3 rounded w-full mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 transition w-full py-3 rounded mt-6 font-bold disabled:opacity-50"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-5">
          Don't have an account?
          <Link to="/register" className="text-blue-400 ml-2 hover:underline">
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;