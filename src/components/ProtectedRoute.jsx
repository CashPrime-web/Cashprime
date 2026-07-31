import { Navigate } from "react-router-dom";


function ProtectedRoute({ children }) {

  const user = localStorage.getItem(
    "cashprime_user"
  );


  if (!user) {

    return <Navigate to="/login" />;

  }


  return children;

}


export default ProtectedRoute;