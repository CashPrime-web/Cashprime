import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Verification() {

  const [status, setStatus] = useState("Not Submitted");
  useEffect(()=>{

  const loadVerification = async()=>{

    const { data:{ user } } = await supabase.auth.getUser();


    if(!user){
      return;
    }


    const { data, error } = await supabase
    .from("verifications")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false })
    .limit(1)
    .maybeSingle();


    if(error){

      console.log(error);
      return;

    }


    if(data){

      setStatus(data.status);

    }


  };


  loadVerification();


},[]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");



  useEffect(()=>{

    checkVerification();

  },[]);



  const checkVerification = async()=>{

    const {data:{user}} = await supabase.auth.getUser();
    console.log("CURRENT USER:", user);

    if(!user) return;


    const {data,error}= await supabase
    .from("verifications")
    .select("*")
    .eq("user_id", user.id)
    .single();


    if(data){

      setStatus(data.status);

    }

  };





  const submitVerification = async()=>{

    if(!file){

      alert("Please upload your ID document");
      return;

    }


    setLoading(true);


    const {data:{user}} = await supabase.auth.getUser();


    if(!user){

      alert("User not logged in");
      setLoading(false);
      return;

    }



    const fileName =
    `${user.id}-${Date.now()}-${file.name}`;



    const {error:uploadError}= await supabase
    .storage
    .from("verification-documents")
    .upload(fileName,file);



    if(uploadError){

      alert(uploadError.message);
      setLoading(false);
      return;

    }





    const {data:urlData}= supabase
    .storage
    .from("verification-documents")
    .getPublicUrl(fileName);



    const documentUrl = urlData.publicUrl;




    const {data,error}= await supabase
.from("verifications")
.insert({
  user_id:user.id,
  document_url:documentUrl,
  status:"Pending"
})
.select();

console.log("INSERT RESULT:", data, error);



    if(error){

      alert(error.message);
      setLoading(false);
      return;

    }



    setStatus("Pending");

    alert("Verification submitted");


    setLoading(false);

  };





  return (

    <div className="bg-gray-900 p-6 rounded-xl max-w-xl">

      <h1 className="text-3xl font-bold mb-6">
        ID Verification
      </h1>



      <div className="bg-gray-800 p-4 rounded-xl mb-6">

        <p className="text-gray-400">
          Verification Status
        </p>

        <h3
className={
  status === "Approved"
    ? "text-green-400 font-bold mt-2"
    :
  status === "Rejected"
    ? "text-red-400 font-bold mt-2"
    :
    "text-yellow-400 font-bold mt-2"
}
>
  {status}
        </h3>

      </div>



      <label className="text-gray-400">
        Full Name
      </label>

      <input

        value={fullName}

        onChange={(e)=>setFullName(e.target.value)}

        className="bg-gray-800 p-3 rounded w-full mt-2"

        placeholder="Enter your full name"

      />



      <label className="text-gray-400 block mt-5">
        Date of Birth
      </label>


      <input

        value={dateOfBirth}

        onChange={(e)=>setDateOfBirth(e.target.value)}

        type="date"

        className="bg-gray-800 p-3 rounded w-full mt-2"

      />




      <label className="text-gray-400 block mt-5">
        Upload ID Document
      </label>


      <input

        type="file"

        onChange={(e)=>setFile(e.target.files[0])}

        className="mt-2"

      />




      <button

        disabled={loading}

        onClick={submitVerification}

        className="mt-6 bg-blue-500 px-6 py-3 rounded w-full"

      >

        {loading ? "Submitting..." : "Submit Verification"}

      </button>



    </div>

  );

}


export default Verification;