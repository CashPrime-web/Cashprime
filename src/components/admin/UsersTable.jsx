import { useState } from "react";
console.log("USERS TABLE LOADED");
function UsersTable({ users, setUsers, updateUser }) {


  const handleChange = (id, field, value) => {

    const updatedUsers = users.map((user)=>{

      if(user.id === id){

        return {

          ...user,

          wallet:{
            ...user.wallet,

            [field]: Number(value)

          }

        };

      }

      return user;

    });


    setUsers(updatedUsers);

  };



  return (

    <div className="bg-gray-900 p-6 rounded-xl mb-8">

      <h2 className="text-xl font-bold mb-4">
        Users Management
      </h2>


      <div className="overflow-x-auto">

      <table className="w-full text-left text-sm">


        <thead className="text-gray-400">

          <tr>

            <th className="p-3">
              Email
            </th>

            <th className="p-3">
              Status
            </th>

            <th className="p-3">
              Balance
            </th>

            <th className="p-3">
              Bonus
            </th>

            <th className="p-3">
              Total Deposit
            </th>

            <th className="p-3">
              Action
            </th>

          </tr>

        </thead>



        <tbody>


        {users.map((user)=>(


          <tr
          key={user.id}
          className="border-t border-gray-800"
          >


            <td className="p-3">
              {user.email}
            </td>



            <td className="p-3">


              <select

              value={user.status || "Pending"}

              onChange={(e)=>{

                const updated = users.map((u)=>

                  u.id === user.id

                  ?

                  {
                    ...u,
                    status:e.target.value
                  }

                  :

                  u

                );


                setUsers(updated);

              }}


              className="bg-gray-800 p-2 rounded"

              >


                <option>
                  Pending
                </option>


                <option>
                  Active
                </option>


                <option>
                  Blocked
                </option>


              </select>


            </td>




            <td className="p-3">


              <input

              type="number"

              value={user.wallet?.balance || 0}

              onChange={(e)=>
                handleChange(
                  user.id,
                  "balance",
                  e.target.value
                )
              }

              className="bg-gray-800 p-2 rounded w-28"

              />


            </td>




            <td className="p-3">


              <input

              type="number"

              value={user.wallet?.bonus || 0}

              onChange={(e)=>
                handleChange(
                  user.id,
                  "bonus",
                  e.target.value
                )
              }


              className="bg-gray-800 p-2 rounded w-28"


              />


            </td>




            <td className="p-3">


              <input

              type="number"

              value={user.wallet?.total_deposit || 0}

              onChange={(e)=>
                handleChange(
                  user.id,
                  "total_deposit",
                  e.target.value
                )
              }


              className="bg-gray-800 p-2 rounded w-28"


              />


            </td>




            <td className="p-3">


              <button

              onClick={()=>updateUser(user)}

              className="bg-blue-500 px-4 py-2 rounded"

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