import axios from "axios";

import { Pool } from "../src/types";
import { saveData, loadData } from "../src/utils";
import { TronWeb } from "tronweb";
import { rpcUrl } from "../src/constants";
import poolV3Abi from "../abis/poolV3.json";

async function fetchResult(scrollId: number, limit = 10) {
  const baseUrl = "https://pro-api.coinmarketcap.com";
  const apiKey = "a8e66741-a678-49c1-9888-0186331c9daa";
  const route = "/v4/dex/spot-pairs/latest";
  const resp = await axios.get(baseUrl + route, {
    headers: {
      "X-CMC_PRO_API_KEY": apiKey,
      Accept: "application/json",
    },
    params: {
      scroll_id: scrollId,
      limit,
      convert: "USD",
      network_slug: "tron",
      dex_slug: "sunswap-v3",
    },
  });
  const { data: dexPairs }: { data: any[] } = resp.data;
  if (dexPairs.length == 0) {
    return { dexPairs: [], scrollId: null };
  }
  return { dexPairs, scrollId: dexPairs[dexPairs.length - 1].scroll_id };
}

async function main() {
  const filename = "./cmc_sunpoolsv3.json";
  const API_KEY = "ffdbac96-0284-4df9-840c-5e5c32499698";
  const tronWeb = new TronWeb({
    fullHost: rpcUrl,
    headers: { "TRON-PRO-API-KEY": API_KEY },
    privateKey: "01",
  });

  let scrollId = 0;

  while (true) {
    let { dexPairs, scrollId: nextScrollId } = await fetchResult(scrollId);
    if (dexPairs.length == 0) {
      break;
    }
    scrollId = nextScrollId;

    const pools: Pool[] = dexPairs.map((pair) => {
      return {
        address: pair.contract_address,
        token0: {
          symbol: pair.base_asset_symbol,
          address: pair.base_asset_contract_address,
        },
        token1: {
          symbol: pair.quote_asset_symbol,
          address: pair.quote_asset_contract_address,
        },
        liquidity: pair.quote[0].liquidity,
      };
    });

    saveData(filename, pools);
  }

  // postpreprocess
  const pools = loadData(filename);
  for (const pool of pools) {
    const poolV3 = tronWeb.contract(poolV3Abi, pool.address);
    const feeTier: bigint = await poolV3.fee().call();
    pool.feeTier = Number(feeTier);
  }
  saveData("./cmc_sunpoolsv3_pro.json", pools);
}

main();
