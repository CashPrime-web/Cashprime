import React, { useState } from 'react';

function UsersTable({ users, setUsers, updateUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter((u) =>
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.referred_by && u.referred_by.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleWalletChange = (userId, field, value) => {
    const updated = users.map((user) => {
      if (user.id === userId) {
        return {
          ...user,
          wallet: {
            ...user.wallet,
            [field]: value === '' ? '' : value
          }
        };
      }
      return user;
    });
    setUsers(updated);
  };

  const handleStatusChange = (userId, newStatus) => {
    const updated = users.map((user) => {
      if (user.id === userId) {
        return { ...user, status: newStatus };
      }
      return user;
    });
    setUsers(updated);
  };

  const handleSave = (user) => {
    const currentBalance = Number(user.wallet?.balance || 0);
    const currentCrypto = Number(user.wallet?.cryptoValue || 0);
    const currentBonus = Number(user.wallet?.bonus || 0);
    const currentTrading = Number(user.wallet?.trading_balance || 0);
    const calculatedTotalValuation = currentBalance + currentCrypto + currentBonus + currentTrading;

    updateUser({
      ...user,
      wallet: {
        ...user.wallet,
        balance: currentBalance,
        crypto_value: currentCrypto,
        cryptoValue: currentCrypto,
        bonus: currentBonus,
        trading_balance: currentTrading,
        total_deposit: Number(user.wallet?.total_deposit || 0),
        total_valuation: calculatedTotalValuation
      }
    });
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-white tracking-wide">User Management & Referrals</h2>
        <input
          type="text"
          placeholder="Zoek op naam, email of referral..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-full md:w-80 transition"
        />
      </div>

      <div className="max-h-[450px] overflow-y-auto overflow-x-auto border border-gray-800 rounded-lg">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <thead className="text-gray-400 border-b border-gray-800 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
            <tr>
              <th className="p-3.5">Name</th>
              <th className="p-3.5">Email</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Balance ($)</th>
              <th className="p-3.5">Crypto ($)</th>
              <th className="p-3.5">Bonus ($)</th>
              <th className="p-3.5">Total Val. ($)</th> 
              <th className="p-3.5">Trading ($)</th>
              <th className="p-3.5">Deposit ($)</th>
              <th className="p-3.5">Ref. Code</th>
              <th className="p-3.5">Referred By</th>
              <th className="p-3.5 text-center">Group Refs</th>
              <th className="p-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="13" className="text-center py-8 text-gray-500">
                  Geen gebruikers gevonden.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => {
                const userCode = user.referral_code || user.name || user.email?.split('@')[0];
                const groupReferralsCount = users.filter(
                  (u) => u.referred_by && userCode && u.referred_by.toLowerCase() === userCode.toLowerCase()
                ).length;

                const currentBalance = Number(user.wallet?.balance || 0);
                const currentCrypto = Number(user.wallet?.cryptoValue || 0);
                const currentBonus = Number(user.wallet?.bonus || 0);
                const currentTrading = Number(user.wallet?.trading_balance || 0);
                
                const calculatedTotalValuation = currentBalance + currentCrypto + currentBonus + currentTrading;

                return (
                  <tr key={user.id || index} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-3.5 font-medium text-white">
                      {user.name || "-"}
                    </td>

                    <td className="p-3.5 text-gray-300">
                      {user.email || "-"}
                    </td>

                    <td className="p-3.5">
                      <select
                        value={user.status || "Active"}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>

                    <td className="p-3.5">
                      <input
                        type="number"
                        step="any"
                        value={user.wallet?.balance ?? ""}
                        onChange={(e) => handleWalletChange(user.id, 'balance', e.target.value)}
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    <td className="p-3.5">
                      <input
                        type="number"
                        step="any"
                        value={user.wallet?.cryptoValue ?? ""}
                        onChange={(e) => handleWalletChange(user.id, 'cryptoValue', e.target.value)}
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    <td className="p-3.5">
                      <input
                        type="number"
                        step="any"
                        value={user.wallet?.bonus ?? ""}
                        onChange={(e) => handleWalletChange(user.id, 'bonus', e.target.value)}
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    <td className="p-3.5 text-emerald-400 font-bold">
                      ${calculatedTotalValuation.toFixed(2)}
                    </td>

                    <td className="p-3.5">
                      <input
                        type="number"
                        step="any"
                        value={user.wallet?.trading_balance ?? ""}
                        onChange={(e) => handleWalletChange(user.id, 'trading_balance', e.target.value)}
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    <td className="p-3.5">
                      <input
                        type="number"
                        step="any"
                        value={user.wallet?.total_deposit ?? ""}
                        onChange={(e) => handleWalletChange(user.id, 'total_deposit', e.target.value)}
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    <td className="p-3.5 text-amber-400 font-mono text-xs">
                      {user.referral_code || "-"}
                    </td>

                    <td className="p-3.5 text-gray-400">
                      {user.referred_by || "-"}
                    </td>

                    <td className="p-3.5 font-bold text-blue-400 text-center">
                      {groupReferralsCount}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleSave(user)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition shadow-sm"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UsersTable;