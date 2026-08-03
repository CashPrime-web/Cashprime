import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // Stap 1: Wachtwoord verifiëren, code genereren en via Edge Function verzenden
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Controleer of e-mail en wachtwoord kloppen via Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });

    if (authError) {
      setError("Onjuist e-mailadres of wachtwoord.");
      setLoading(false);
      return;
    }

    // Direct weer uitloggen tot de code geverifieerd is
    await supabase.auth.signOut();

    // 2. Genereer een willekeurige 6-cijferige code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min geldig

    // 3. Sla de code op in onze eigen database tabel
    const { error: dbError } = await supabase
      .from('email_otps')
      .insert([{ email: form.email, code: generatedCode, expires_at: expiresAt }]);

    if (dbError) {
      setError("Fout bij aanmaken verificatiecode.");
      setLoading(false);
      return;
    }

    // 4. Roep de beveiligde Supabase Edge Function aan
    console.log("Start aanroepen Edge Function...");
    const { data: fnData, error: fnError } = await supabase.functions.invoke('send-otp-email', {
      body: { email: form.email, code: generatedCode },
    });
    console.log("Edge Function resultaat:", { fnData, fnError });

    if (fnError) {
      console.error("Details van fnError:", fnError);
      setError("Fout bij verzenden e-mail via server.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccessMsg("Een professionele 6-cijferige code is naar je e-mail gestuurd!");
    setStep(2);
  };

  // Stap 2: Controleer of de ingevoerde code klopt met de database
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', form.email)
      .eq('code', otpCode.trim())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !data || data.length === 0) {
      setError("Onjuiste verificatiecode.");
      setLoading(false);
      return;
    }

    // Code is correct! Nu definitief inloggen in de sessie
    const { error: finalLoginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });

    if (finalLoginError) {
      setError("Fout bij inloggen na verificatie.");
      setLoading(false);
      return;
    }

    // Ruim gebruikte codes op
    await supabase.from('email_otps').delete().eq('email', form.email);

    setLoading(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md">
        
        <h1 className="text-3xl font-bold text-center mb-6">
          {step === 1 ? "Login" : "Verificatiecode"}
        </h1>

        {error && (
          <p className="text-red-400 mb-4 bg-red-950/40 p-3 rounded border border-red-800 text-sm">
            {error}
          </p>
        )}

        {successMsg && step === 2 && (
          <p className="text-green-400 mb-4 bg-green-950/40 p-3 rounded border border-green-800 text-sm">
            {successMsg}
          </p>
        )}

        {step === 1 ? (
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
              {loading ? "Bezig..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p className="text-gray-400 text-sm mb-4 text-center">
              Vul de 6-cijferige code in die per e-mail is verzonden.
            </p>

            <label className="text-gray-400 block text-center mb-2">Verificatiecode</label>
            <input
              type="text"
              maxLength="6"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
              className="bg-gray-800 p-3 rounded w-full text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 transition w-full py-3 rounded mt-6 font-bold disabled:opacity-50"
            >
              {loading ? "Controleren..." : "Verifiëren & Doorgaan"}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setOtpCode(""); }}
              className="text-gray-400 text-sm w-full text-center mt-4 hover:underline"
            >
              Terug naar inloggen
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="text-gray-400 text-center mt-5">
            Don't have an account?
            <Link to="/register" className="text-blue-400 ml-2 hover:underline">
              Register
            </Link>
          </p>
        )}

      </div>
    </div>
  );
}

export default Login;