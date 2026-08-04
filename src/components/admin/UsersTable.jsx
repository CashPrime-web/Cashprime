import { useState } from "react";
console.log("USERS TABLE LOADED");

function UsersTable({ users, setUsers, updateUser }) {
  const handleChange = (id, field, value) => {
    const updatedUsers = users.map((user) => {
      if (user.id === id) {
        return {
          ...user,
          wallet: {
            ...user.wallet,
            [field]: Number(value)
          }
        };
      }
      return user;
    });

    setUsers(updatedUsers);
  };

  // Specifieke functie voor het wijzigen van de status
  const handleStatusChange = (id, newStatus) => {
    const updatedUsers = users.map((u) =>
      u.id === id ? { ...u, status: newStatus } : u
    );
    setUsers(updatedUsers);
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl mb-8 text-white">
      <h2 className="text-xl font-bold mb-4">Users Management & Referrals</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400 border-b border-gray-800">
            <tr>
              <th className="p-3">Naam & Email</th>
              <th className="p-3">Gebracht door (Upline)</th>
              <th className="p-3">Status</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Bonus</th>
              <th className="p-3">Total Deposit</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                
                {/* Naam en Email */}
                <td className="p-3">
                  <div className="font-semibold">{user.name || "Geen naam"}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </td>

                {/* Upline / Gebracht door */}
                <td className="p-3 font-medium text-blue-400">
                  {user.referred_by ? `@${user.referred_by}` : "Direct / Geen"}
                </td>

                {/* Status */}
                <td className="p-3">
                  <select
                    value={user.status || "Pending"}
                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                    className="bg-gray-800 p-2 rounded text-white border border-gray-700 focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </td>

                {/* Balance */}
                <td className="p-3">
                  <input
                    type="number"
                    value={user.wallet?.balance || 0}
                    onChange={(e) => handleChange(user.id, "balance", e.target.value)}
                    className="bg-gray-800 p-2 rounded w-28 text-white"
                  />
                </td>

                {/* Bonus */}
                <td className="p-3">
                  <input
                    type="number"
                    value={user.wallet?.bonus || 0}
                    onChange={(e) => handleChange(user.id, "bonus", e.target.value)}
                    className="bg-gray-800 p-2 rounded w-28 text-white"
                  />
                </td>

                {/* Total Deposit */}
                <td className="p-3">
                  <input
                    type="number"
                    value={user.wallet?.total_deposit || 0}
                    onChange={(e) => handleChange(user.id, "total_deposit", e.target.value)}
                    className="bg-gray-800 p-2 rounded w-28 text-white"
                  />
                </td>

                {/* Save Action */}
                <td className="p-3">
                  <button
                    onClick={() => updateUser(user)}
                    className="bg-blue-600 hover:bg-blue-500 transition px-4 py-2 rounded font-bold text-xs"
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