import axios from "axios";

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
console.log(API_KEY);

const BASE_URL = "https://www.alphavantage.co/query";

export async function getStockPrice(symbol) {
  const response = await axios.get(BASE_URL, {
    params: {
      function: "GLOBAL_QUOTE",
      symbol: symbol,
      apikey: API_KEY,
    },
  });

  console.log(symbol, response.data);

  return response.data;
}