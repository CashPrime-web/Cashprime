import { useState } from "react";
import { Link } from "react-router-dom";

function Login() {

  const [form, setForm] = useState({
    email: "",
    password: ""
  });


  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };


  const handleSubmit = (e) => {

    e.preventDefault();

    console.log(form);

    localStorage.setItem(
  "cashprime_user",
  JSON.stringify({
    email: form.email,
    role: "user"
  })
);

window.location.href = "/";

  };


  return (

    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">


      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md">


        <h1 className="text-3xl font-bold text-center mb-6">
          Login
        </h1>


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