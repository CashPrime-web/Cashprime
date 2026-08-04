import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // Pak de 'ref' code uit de URL (bijv. ?ref=stockholm)
    const queryParams = new URLSearchParams(window.location.search);
    const referredBy = queryParams.get("ref") || null;

    try {
      // 1. Maak de gebruiker aan via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name
          }
        }
      });

      if (authError) throw authError;

      const user = authData.user;

      if (user) {
       // 2. Sla het profiel direct op in de 'profiles' tabel inclusief de status 'active'
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            email: form.email,
            name: form.name,
            role: "user",
            status: "active", // <--- Nieuwe accounts zijn meteen actief en kunnen inloggen
            referred_by: referredBy
          });

        if (profileError) {
          console.log("Fout bij opslaan profiel:", profileError.message);
        }

        // 3. Maak direct een lege wallet aan
        await supabase.from("wallets").insert({
          user_id: user.id,
          balance: 0.00
        });
      }

      alert("Account created successfully! You can now log in.");
      setForm({ name: "", email: "", password: "", confirmPassword: "" });
    } catch (error) {
      console.log("Registratie fout:", error);
      alert(error.message || "Er is iets misgegaan bij het registreren.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md shadow-lg border border-gray-800">
        <h1 className="text-3xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit}>
          <label className="text-gray-400 text-sm">Full Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="bg-gray-800 p-3 rounded w-full mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your name"
          />

          <label className="text-gray-400 text-sm">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="bg-gray-800 p-3 rounded w-full mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email address"
          />

          <label className="text-gray-400 text-sm">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="bg-gray-800 p-3 rounded w-full mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
          />

          <label className="text-gray-400 text-sm">Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            className="bg-gray-800 p-3 rounded w-full mt-1 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Confirm password"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 transition w-full py-3 rounded font-bold"
          >
            Create Account
          </button>
        </form>

        <p className="text-gray-400 text-center mt-5 text-sm">
          Already have an account?
          <Link to="/login" className="text-blue-400 ml-2 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;