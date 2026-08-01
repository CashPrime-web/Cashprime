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

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };


  const handleSubmit = async (e) => {

    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });


    if (error) {
      setError(error.message);
      return;
    }


    console.log("Logged in:", data.user);


    navigate("/");

  };


  return (

    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">

      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md">

        <h1 className="text-3xl font-bold text-center mb-6">
          Login
        </h1>


        {error && (
          <p className="text-red-400 mb-4">
            {error}
          </p>
        )}


        <form onSubmit={handleSubmit}>

          <label className="text-gray-400">
            Email
          </label>

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="bg-gray-800 p-3 rounded w-full mt-2"
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
            className="bg-gray-800 p-3 rounded w-full mt-2"
            placeholder="Password"
          />


          <button
            className="bg-blue-500 w-full py-3 rounded mt-6 font-bold"
          >
            Login
          </button>

        </form>


        <p className="text-gray-400 text-center mt-5">

          Don't have an account?

          <Link
            to="/register"
            className="text-blue-400 ml-2"
          >
            Register
          </Link>

        </p>


      </div>

    </div>

  );

}

export default Login;