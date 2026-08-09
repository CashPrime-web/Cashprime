import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Verification() {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setStatus(data[0].status);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!frontFile || !backFile) {
      setMessage("Please upload both the front and back of your ID.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload voorkant naar Supabase Storage (zorg dat je een bucket hebt genaamd 'kyc-documents')
      const frontFileName = `${user.id}/front_${Date.now()}`;
      const { error: frontError } = await supabase.storage
        .from("kyc-documents")
        .upload(frontFileName, frontFile);

      if (frontError) throw frontError;

      const { data: frontPublicUrl } = supabase.storage
        .from("kyc-documents")
        .getPublicUrl(frontFileName);

      // 2. Upload achterkant naar Supabase Storage
      const backFileName = `${user.id}/back_${Date.now()}`;
      const { error: backError } = await supabase.storage
        .from("kyc-documents")
        .upload(backFileName, backFile);

      if (backError) throw backError;

      const { data: backPublicUrl } = supabase.storage
        .from("kyc-documents")
        .getPublicUrl(backFileName);

      // 3. Opslaan in de 'verifications' tabel
      const { error: dbError } = await supabase
        .from("verifications")
        .insert([
          {
            user_id: user.id,
            front_url: frontPublicUrl.publicUrl,
            back_url: backPublicUrl.publicUrl,
            status: "Pending",
          }
        ]);

      if (dbError) throw dbError;

      setStatus("Pending");
      setMessage("ID documents submitted successfully! Awaiting admin review.");
    } catch (err) {
      console.error(err);
      setMessage("Error uploading documents: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#161d2a] border border-slate-800 p-8 rounded-2xl shadow-xl text-white">
      <h2 className="text-2xl font-bold mb-2">ID Verification</h2>
      <p className="text-slate-400 text-sm mb-6">
        Please upload clear pictures of the front and back of your official identification document.
      </p>

      {status === "Approved" ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-center font-semibold">
          Your account is fully verified! 
        </div>
      ) : status === "Pending" ? (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl text-center font-semibold">
          Your documents are currently under review by our admin team. Please check back later.
        </div>
      ) : (
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Front of ID Document
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFrontFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-[#0b0e14] border border-slate-800 rounded-xl p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Back of ID Document
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBackFile(e.target.files[0])}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-[#0b0e14] border border-slate-800 rounded-xl p-2"
            />
          </div>

          {message && (
            <p className={`text-sm ${status === "Pending" ? "text-emerald-400" : "text-red-400"}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            {loading ? "Uploading Documents..." : "Submit for Verification"}
          </button>
        </form>
      )}
    </div>
  );
}