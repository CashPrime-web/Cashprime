import { useState } from "react";

function Settings() {
  const [twoFA, setTwoFA] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const handleSave = (e) => {
    e.preventDefault();
    // Simuleer succesvolle opslag en toon het 2FA/settings bericht
    setMessage("(2FA) Two Factor Authentication is ON");
    setTimeout(() => {
      setMessage("");
    }, 5000); // Laat het bericht na 5 seconden verdwijnen
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl max-w-xl text-white">

      <h1 className="text-3xl font-bold mb-6">
        Settings
      </h1>

      {message && (
        <div className="bg-green-950/60 border border-green-800 text-green-400 p-3 rounded-lg mb-4 text-sm">
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
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-700 p-3 rounded w-full mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="user@email.com"
          />

          <label className="text-gray-400 block mt-5">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-gray-700 p-3 rounded w-full mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Username"
          />

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