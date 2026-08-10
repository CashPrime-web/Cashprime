import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // --------------------------------------------------
  // STAP 1: EMAIL + WACHTWOORD CONTROLEREN
  // --------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // Controleer eerst email + wachtwoord
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

      if (authError || !authData.user) {
        setError("Onjuist e-mailadres of wachtwoord.");
        setLoading(false);
        return;
      }

      // We willen nog GEEN toegang geven.
      // Log tijdelijk uit totdat OTP is gecontroleerd.
      await supabase.auth.signOut();

      // Stuur OTP
      const { data: otpData, error: otpError } =
        await supabase.functions.invoke("send-otp-email", {
          body: {
            email: form.email
          }
        });

      if (otpError || !otpData?.success) {
        console.error("OTP send error:", otpError || otpData);

        setError(
          "De verificatiecode kon niet worden verstuurd. Probeer het opnieuw."
        );

        setLoading(false);
        return;
      }

      setOtpStep(true);

      setSuccessMsg(
        "Een 6-cijferige verificatiecode is naar je e-mail gestuurd."
      );

      setLoading(false);
    } catch (error) {
      console.error("Login error:", error);

      setError("Er is iets misgegaan. Probeer het opnieuw.");
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // STAP 2: OTP CONTROLEREN
  // --------------------------------------------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (!/^\d{6}$/.test(otp)) {
        setError("Voer een geldige 6-cijferige code in.");
        setLoading(false);
        return;
      }

      // Controleer OTP
      const { data: verifyData, error: verifyError } =
        await supabase.functions.invoke("verify-otp-email", {
          body: {
            email: form.email,
            code: otp
          }
        });

      if (
        verifyError ||
        !verifyData?.success
      ) {
        console.error(
          "OTP verification error:",
          verifyError || verifyData
        );

        setError(
          verifyData?.error ||
            "De verificatiecode is onjuist of verlopen."
        );

        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // OTP IS CORRECT
      // Nu pas opnieuw daadwerkelijk inloggen
      // --------------------------------------------------
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

      if (authError || !authData.user) {
        setError(
          "De verificatie is gelukt, maar het inloggen is mislukt."
        );

        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // --------------------------------------------------
      // PROFIELSTATUS CONTROLEREN
      // --------------------------------------------------
      const {
        data: profile,
        error: profileError
      } = await supabase
        .from("profiles")
        .select("status, role")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(
          "Fout bij ophalen profiel:",
          profileError
        );
      }

      if (profile) {
        const userStatus = (
          profile.status || ""
        ).toLowerCase();

        // Geblokkeerd
        if (userStatus === "blocked") {
          await supabase.auth.signOut();

          setError(
            "Your account has been blocked. Please contact the administrator."
          );

          setLoading(false);
          return;
        }

        // Pending
        if (userStatus === "pending") {
          await supabase.auth.signOut();

          setError(
            "Your account is awaiting (Pending) approval by the admin."
          );

          setLoading(false);
          return;
        }
      }

      // Alles is goed
      setLoading(false);
      navigate("/");
    } catch (error) {
      console.error("OTP login error:", error);

      setError(
        "Er is iets misgegaan tijdens de verificatie."
      );

      setLoading(false);
    }
  };

  // --------------------------------------------------
  // NIEUWE OTP AANVRAGEN
  // --------------------------------------------------
  const handleResendOtp = async () => {
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data, error } =
        await supabase.functions.invoke("send-otp-email", {
          body: {
            email: form.email
          }
        });

      if (error || !data?.success) {
        console.error(
          "Resend OTP error:",
          error || data
        );

        setError(
          "De nieuwe verificatiecode kon niet worden verstuurd."
        );

        setLoading(false);
        return;
      }

      setOtp("");
      setSuccessMsg(
        "Een nieuwe verificatiecode is naar je e-mail gestuurd."
      );

      setLoading(false);
    } catch (error) {
      console.error("Resend error:", error);

      setError(
        "Er is iets misgegaan. Probeer het opnieuw."
      );

      setLoading(false);
    }
  };

  // --------------------------------------------------
  // OTP SCHERM
  // --------------------------------------------------
  if (otpStep) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="bg-gray-900 p-8 rounded-xl shadow-lg w-full max-w-md">

          <h1 className="text-3xl font-bold text-center mb-4">
            Verify your login
          </h1>

          <p className="text-gray-400 text-center mb-6">
            We sent a 6-digit verification code to:
          </p>

          <p className="text-blue-400 text-center mb-6 break-all">
            {form.email}
          </p>

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

          <form onSubmit={handleVerifyOtp}>
            <label className="text-gray-400 block">
              Verification code
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              required
              autoFocus
              className="bg-gray-800 p-3 rounded w-full mt-2 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="000000"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 transition w-full py-3 rounded mt-6 font-bold disabled:opacity-50"
            >
              {loading
                ? "Verifying..."
                : "Verify & Login"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading}
            className="text-blue-400 hover:underline w-full mt-5 text-sm disabled:opacity-50"
          >
            Send a new code
          </button>

          <button
            type="button"
            onClick={() => {
              setOtpStep(false);
              setOtp("");
              setError("");
              setSuccessMsg("");
            }}
            className="text-gray-400 hover:text-white w-full mt-4 text-sm"
          >
            Back to login
          </button>

        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // NORMALE LOGIN
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg w-full max-w-md">

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

          <label className="text-gray-400 block">
            Email
          </label>

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="bg-gray-800 p-3 rounded w-full mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email address"
          />

          <label className="text-gray-400 block mt-4">
            Password
          </label>

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
            {loading ? "Sending code..." : "Login"}
          </button>

        </form>

        <p className="text-gray-400 text-center mt-5">
          Don't have an account?
          <Link
            to="/register"
            className="text-blue-400 ml-2 hover:underline"
          >
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;