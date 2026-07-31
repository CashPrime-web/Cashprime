import { useState } from "react";

function Settings() {

  const [twoFA, setTwoFA] = useState(false);


  return (

    <div className="bg-gray-900 p-6 rounded-xl max-w-xl">

      <h1 className="text-3xl font-bold mb-6">
        Settings
      </h1>


      <div className="bg-gray-800 p-5 rounded-xl">

        <h2 className="text-xl font-bold mb-4">
          Account Information
        </h2>


        <label className="text-gray-400">
          Email
        </label>

        <input
          className="bg-gray-700 p-3 rounded w-full mt-2"
          placeholder="user@email.com"
        />


        <label className="text-gray-400 block mt-5">
          Username
        </label>

        <input
          className="bg-gray-700 p-3 rounded w-full mt-2"
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
            onClick={() => setTwoFA(!twoFA)}
            className={
              twoFA
              ? "bg-green-500 px-4 py-2 rounded"
              : "bg-gray-600 px-4 py-2 rounded"
            }
          >
            {twoFA ? "ON" : "OFF"}
          </button>


        </div>


      </div>



      <button className="mt-6 bg-blue-500 px-6 py-3 rounded w-full">
        Save Changes
      </button>


    </div>

  );

}


export default Settings;