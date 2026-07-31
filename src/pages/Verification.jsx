import { useState } from "react";

function Verification() {

  const [status, setStatus] = useState("Not Submitted");


  return (

    <div className="bg-gray-900 p-6 rounded-xl max-w-xl">

      <h1 className="text-3xl font-bold mb-6">
        ID Verification
      </h1>


      <div className="bg-gray-800 p-4 rounded-xl mb-6">

        <p className="text-gray-400">
          Verification Status
        </p>

        <h3 className="text-yellow-400 font-bold mt-2">
          {status}
        </h3>

      </div>


      <label className="text-gray-400">
        Full Name
      </label>

      <input
        className="bg-gray-800 p-3 rounded w-full mt-2"
        placeholder="Enter your full name"
      />


      <label className="text-gray-400 block mt-5">
        Date of Birth
      </label>

      <input
        type="date"
        className="bg-gray-800 p-3 rounded w-full mt-2"
      />


      <label className="text-gray-400 block mt-5">
        Upload ID Document
      </label>

      <input
        type="file"
        className="mt-2"
      />


      <button
        className="mt-6 bg-blue-500 px-6 py-3 rounded w-full"
        onClick={() => setStatus("Pending Review")}
      >
        Submit Verification
      </button>


    </div>

  );

}


export default Verification;