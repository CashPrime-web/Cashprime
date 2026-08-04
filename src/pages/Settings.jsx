import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function Settings() {
  const [twoFA, setTwoFA] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [groupReferralsCount, setGroupReferralsCount] = useState(0);

useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        
        // 1. Haal direct het juiste profiel op voor DEZE ingelogde gebruiker via zijn ID
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Gebruik de naam uit de database, of anders de e-mail als fallback
        const userCode = currentProfile?.name || user.email.split('@')[0];
        setUsername(userCode);

        const currentDomain = window.location.origin;
        const generatedLink = `${currentDomain}/register?ref=${userCode}`;
        setReferralLink(generatedLink);

        // 2. Haal alle profielen op om het aantal group referrals te tellen
        const { data: allUsers, error } = await supabase
          .from("profiles")
          .select("*");

        if (!error && allUsers) {
          const cleanUserCode = userCode.toLowerCase().replace(/\s+/g, '');
          
          const count = allUsers.filter((u) => {
            if (!u.referred_by) return false;
            const cleanReferredBy = u.referred_by.toLowerCase().replace(/\s+/g, '');
            return cleanReferredBy === cleanUserCode;
          }).length;

          setGroupReferralsCount(count);
        }
      }
    }
    fetchUserData();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setMessage("Two Factor Authentication is ON");
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(referralLink)}`;

  return (
    <div className="bg-gray-900 p-6 rounded-xl max-w-xl text-white">

      <h1 className="text-3xl font-bold mb-6">
        Settings
      </h1>

      {message && (
        <div className="bg-green-950/60 border border-green-800 text-green-400 p-3 rounded-lg mb-4 text-sm font-medium">
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="bg-gray-800 p-5 rounded-xl">

          <h2 className="text-xl font-bold mb-4">
            Account Information
          </h2>

          <label className="text-gray-400 block">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="bg-gray-700/50 text-gray-300 p-3 rounded w-full mt-2 cursor-not-allowed"
          />

          <label className="text-gray-400 block mt-5">
            Username
          </label>
          <input
            type="text"
            value={username}
            disabled
            className="bg-gray-700/50 text-gray-300 p-3 rounded w-full mt-2 cursor-not-allowed"
          />

        </div>

        {/* --- REFERRAL PROGRAM & QR CODE SECTIE --- */}
        <div className="bg-gray-800 p-5 rounded-xl mt-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">
              Referral Program
            </h2>
            <div className="bg-gray-900 border border-gray-700 px-3 py-1 rounded-lg text-xs font-semibold text-gray-300">
              Group Referrals: <span className="text-blue-400 font-bold ml-1">{groupReferralsCount}</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Share your link or QR code with friends. Earn bonuses when they join your network!
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-700">
            {/* QR Code */}
            <div className="bg-white p-2 rounded-lg flex-shrink-0">
              <img 
                src={qrCodeUrl} 
                alt="Referral QR Code" 
                className="w-28 h-28 object-contain"
              />
            </div>

            {/* Link & Copy optie */}
            <div className="w-full flex flex-col justify-center">
              <label className="text-gray-400 text-xs uppercase font-semibold mb-1">
                Your Unique Invite Link
              </label>
              <input
                type="text"
                readOnly
                value={referralLink}
                className="bg-gray-800 text-blue-400 text-sm p-2.5 rounded border border-gray-700 w-full mb-3 select-all"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition font-medium w-full sm:w-auto text-center"
              >
                {copied ? "Copied to Clipboard!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-5 rounded-xl mt-6">

          <h2 className="text-xl font-bold mb-4">
            Security
          </h2>

          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">
                Two Factor Authentication
              </p>
              <p className="text-gray-400 text-sm">
                Protect your account with 2FA
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTwoFA(!twoFA)}
              className={
                twoFA
                  ? "bg-green-500 px-4 py-2 rounded font-bold transition"
                  : "bg-gray-600 px-4 py-2 rounded font-bold transition"
              }
            >
              {twoFA ? "ON" : "OFF"}
            </button>
          </div>

        </div>

        <button
          type="submit"
          className="mt-6 bg-blue-600 hover:bg-blue-500 transition px-6 py-3 rounded w-full font-bold"
        >
          Save Changes
        </button>
      </form>

    </div>
  );
}

export default Settings;