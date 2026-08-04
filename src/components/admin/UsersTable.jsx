import React, { useState } from 'react';

function UsersTable({ users, setUsers, updateUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter((u) => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.referred_by && u.referred_by.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-bold">User Management & Referrals</h2>
        <input
          type="text"
          placeholder="Zoek op naam, email of referral..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white w-full md:w-72"
        />
      </div>

      {/* Hier maken we de tabel schuifbaar naar boven/beneden én links/rechts */}
      <div className="max-h-[350px] overflow-y-auto overflow-x-auto border border-gray-800 rounded-lg">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="text-gray-400 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Balance ($)</th>
              <th className="p-3">Bonus ($)</th>
              <th className="p-3">Total Deposit ($)</th>
              <th className="p-3">Referral Code</th>
              <th className="p-3">Referred By</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr key={user.id || index} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-3 font-medium">{user.name || "-"}</td>
                <td className="p-3 text-gray-300">{user.email || "-"}</td>
                <td className="p-3">
                  <select
  value={user.status || "Active"}
  onChange={(e) => {
    const updated = [...users];
    const targetIndex = updated.findIndex((u) => u.id === user.id);
    updated[targetIndex].status = e.target.value;
    setUsers(updated);
  }}
  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
>
  <option value="Active">Active</option>
  <option value="Pending">Pending</option>
  <option value="Blocked">Blocked</option>
</select>
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    value={user.wallet?.balance ?? 0}
                    onChange={(e) => {
                      const updated = [...users];
                      const targetIndex = updated.findIndex((u) => u.id === user.id);
                      updated[targetIndex].wallet.balance = e.target.value;
                      setUsers(updated);
                    }}
                    className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    value={user.wallet?.bonus ?? 0}
                    onChange={(e) => {
                      const updated = [...users];
                      const targetIndex = updated.findIndex((u) => u.id === user.id);
                      updated[targetIndex].wallet.bonus = e.target.value;
                      setUsers(updated);
                    }}
                    className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    value={user.wallet?.total_deposit ?? 0}
                    onChange={(e) => {
                      const updated = [...users];
                      const targetIndex = updated.findIndex((u) => u.id === user.id);
                      updated[targetIndex].wallet.total_deposit = e.target.value;
                      setUsers(updated);
                    }}
                    className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  />
                </td>
                <td className="p-3 text-amber-400 font-mono text-xs">{user.referral_code || "-"}</td>
                <td className="p-3 text-gray-400">{user.referred_by || "-"}</td>
                <td className="p-3">
                  <button
                    onClick={() => updateUser(user)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded text-xs transition"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UsersTable;