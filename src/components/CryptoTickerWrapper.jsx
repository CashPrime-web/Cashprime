import { useLocation } from "react-router-dom";
import CryptoTicker from "./CryptoTicker";

function CryptoTickerWrapper(){

  const location = useLocation();

  if(location.pathname === "/admin"){
    return null;
  }

  return <CryptoTicker />;

}

export default CryptoTickerWrapper;