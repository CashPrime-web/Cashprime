import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";

export async function getCryptoPrices() {
  try {
    const response = await axios.get(
      `${BASE_URL}/simple/price`,
      {
        params: {
          ids: "bitcoin,ethereum,solana,binancecoin,ripple,dogecoin",
          vs_currencies: "usd",
          include_24hr_change: true,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Crypto API error:", error);
    return null;
  }
}