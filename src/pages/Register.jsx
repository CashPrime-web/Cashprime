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


    try {

      const { data, error } = await supabase.auth.signUp({

        email: form.email,

        password: form.password,

        options: {
          data: {
            name: form.name
          }
        }

      });


      if (error) {
        throw error;
      }


      console.log("User created:", data.user);


      alert("Account created!");


      setForm({

        name: "",
        email: "",
        password: "",
        confirmPassword: ""

      });


    } catch (error) {

      console.log(error);
      alert(error.message);

    }

  };


  return (

    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">

      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md">

        <h1 className="text-3xl font-bold text-center mb-6">
          Create Account
        </h1>


        <form onSubmit={handleSubmit}>


          <label className="text-gray-400">
            Full Name
          </label>

          <input

            name="name"

            value={form.name}

            onChange={handleChange}

            className="bg-gray-800 p-3 rounded w-full mt-2"

            placeholder="Your name"

          />


          <label className="text-gray-400 block mt-4">
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


          <label className="text-gray-400 block mt-4">
            Confirm Password
          </label>

          <input

            name="confirmPassword"

            type="password"

            value={form.confirmPassword}

            onChange={handleChange}

            className="bg-gray-800 p-3 rounded w-full mt-2"

            placeholder="Confirm password"

          />


          <button

            className="bg-blue-500 w-full py-3 rounded mt-6 font-bold"

          >

            Create Account

          </button>


        </form>


        <p className="text-gray-400 text-center mt-5">

          Already have an account?

          <Link

            to="/login"

            className="text-blue-400 ml-2"

          >

            Login

          </Link>

        </p>


      </div>

    </div>

  );

}

export default Register;