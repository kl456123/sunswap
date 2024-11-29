import { Call, Pool, Token } from "./types";
import { utils, Contract, TronWeb } from "tronweb";
import _ from "lodash";
import poolV2Abi from "../abis/poolV2.json";
import erc20Abi from "../abis/erc20.json";
import fs from "fs";
import { ethers } from "ethers";

export function generateCalls(
  contract: Contract,
  funcName: string,
  args: any[][],
) {
  const method = contract.methodInstances[funcName];
  const calls: Call[] = args.map((arg) => {
    const encodedData = utils.abi.encodeParamsV2ByABI(method.abi, arg);
    const callData = "0x" + method.signature.concat(encodedData.slice(2));
    return {
      callData,
      target: TronWeb.address.toHex(contract.address as string),
    };
  });

  return calls;
}

export function encodeCallDataForQuoteFromUniV2(
  amounts: number[],
  path: string[],
  multicall3: Contract,
  routerV2: Contract,
) {
  const args = amounts.map((amount) => [amount, path]);
  const calls = generateCalls(routerV2, "getAmountsOut", args);
  const calldata = encodeMultiCallData(multicall3, calls);
  return calldata;
}

export function encodeCallDataForQuoteFromUniV3(
  amounts: number[],
  path: string[],
  fees: number[],
  multicall3: Contract,
  quoterV3: Contract,
) {
  const args = amounts.map((amount) => [toUniswapPath(path, fees), amount]);
  const calls = generateCalls(quoterV3, "quoteExactInput", args);
  const calldata = encodeMultiCallData(multicall3, calls);
  return calldata;
}

export function encodeMultiCallData(multicall3: Contract, calls: Call[]) {
  const method = multicall3.methodInstances["aggregate"];
  console.log(calls);
  const encodedData = utils.abi.encodeParamsV2ByABI(method.abi, [
    calls.map((call) => [call.target, call.callData]),
  ]);
  const data = "0x" + method.signature.concat(encodedData.slice(2));
  return { data, to: TronWeb.address.toHex(multicall3.address as string) };
}

export async function multiCall(
  multicall3: Contract,
  contract: Contract,
  funcName: string,
  args: any[][],
) {
  const method = contract.methodInstances[funcName];
  const calls: Call[] = generateCalls(contract, funcName, args);

  const {
    returnData,
    blockNumber,
  }: { returnData: string[]; blockNumber: number } = await multicall3
    .aggregate(calls.map((call) => [call.target, call.callData]))
    .call();

  // parse returned data
  const result = returnData.map((output) => {
    const decodedData = utils.abi.decodeParamsV2ByABI(method.abi, output);
    return decodedData;
  });
  return result;
}

export async function quoteFromUniV2(
  amounts: number[],
  path: string[],
  multicall3: Contract,
  routerV2: Contract,
) {
  const args = amounts.map((amount) => [amount, path]);
  const results = await multiCall(multicall3, routerV2, "getAmountsOut", args);

  // parse returned data
  const quoteAmounts = results.map((amounts) => {
    return amounts[amounts.length - 1];
  });
  return quoteAmounts;
}

function toUniswapPath(path: string[], fees: number[]) {
  const evmPath = path.map((addr) =>
    addr.substr(0, 2) == "0x" || "41"
      ? "0x" + addr.slice(2)
      : "0x" + TronWeb.address.toHex(addr).slice(2),
  );
  const types: string[] = ["address"];
  const values: any[] = [evmPath[0]];
  fees.forEach((fee, i) => {
    types.push("uint24", "address");
    values.push(fee, evmPath[i + 1]);
  });
  return ethers.solidityPacked(types, values);
}

export async function quoteFromUniV3(
  amounts: number[],
  path: string[],
  fees: number[],
  multicall3: Contract,
  quoterV3: Contract,
) {
  const args = amounts.map((amount) => [toUniswapPath(path, fees), amount]);
  const quoteAmounts = await multiCall(
    multicall3,
    quoterV3,
    "quoteExactInput",
    args,
  );

  return quoteAmounts;
}

async function fetchToken(token: Contract): Promise<Token> {
  const [decimal, symbol] = await Promise.all([
    token.decimals().call(),
    token.symbol().call(),
  ]);
  return {
    decimal: Number(decimal),
    symbol,
    address: TronWeb.address.fromHex(token.address as string),
  };
}

async function fetchPool(
  pool: Contract,
  tokenCache: Record<string, Token>,
): Promise<Pool> {
  const [
    tokenId0,
    tokenId1,
    { _reserve0: reserve0, _reserve1: reserve1 },
    totalSupply,
  ] = await Promise.all([
    pool.token0().call(),
    pool.token1().call(),
    pool.getReserves().call(),
    pool.totalSupply().call(),
  ]);

  let tokenInfo0, tokenInfo1;
  if (tokenCache[tokenId0] === undefined) {
    const token0 = new Contract(pool.tronWeb, erc20Abi, tokenId0);
    tokenInfo0 = await fetchToken(token0);
    tokenCache[tokenId0] = tokenInfo0;
  } else {
    tokenInfo0 = tokenCache[tokenId0];
  }

  if (tokenCache[tokenId1] === undefined) {
    const token1 = new Contract(pool.tronWeb, erc20Abi, tokenId1);
    tokenInfo1 = await fetchToken(token1);
    tokenCache[tokenId1] = tokenInfo1;
  } else {
    tokenInfo1 = tokenCache[tokenId1];
  }

  const poolInfo = {
    address: pool.address as string,
    token0: tokenInfo0,
    token1: tokenInfo1,
    reserve0,
    reserve1,
    totalSupply,
  };
  return poolInfo;
}

export async function fetchAllPools(
  factoryV2: Contract,
  multicall3: Contract,
  options: { chunkSize: number; saveFreq: number } = {
    chunkSize: 2,
    saveFreq: 100,
  },
) {
  const { chunkSize, saveFreq } = options;
  const numPools = await factoryV2.allPairsLength().call();
  const poolIndices = Array.from(Array(1000).keys());
  const poolChunksIndices = _.chunk(poolIndices, chunkSize);

  console.log(
    `num of total pools: ${numPools}, num of total chunks: ${poolChunksIndices.length}`,
  );

  let poolInfos: Pool[] = [];

  const tokenCache: Record<string, Token> = {};

  let pendingProcessedNum = 0;
  let totalProcessedNum = 0;

  for (const poolChunkIndices of poolChunksIndices) {
    const args = poolChunkIndices.map((num) => [num]);
    const result = await multiCall(
      multicall3,
      factoryV2,
      "allPairs(uint256)",
      args,
    );
    const poolIds = result
      .flat()
      .map((poolId) => TronWeb.address.fromHex(poolId));

    // fetch pools info
    for (const poolId of poolIds) {
      const pool = new Contract(factoryV2.tronWeb, poolV2Abi, poolId);
      const poolInfo = await fetchPool(pool, tokenCache);
      poolInfos.push(poolInfo);
    }

    totalProcessedNum += poolIds.length;
    pendingProcessedNum += poolIds.length;

    if (pendingProcessedNum > saveFreq) {
      console.log(
        `num of procesed pools: ${pendingProcessedNum}, num of total procssed pools: ${totalProcessedNum}`,
      );
      // save to disk
      saveData("./sunpools.json", poolInfos);
      // reset
      poolInfos = [];
      pendingProcessedNum = 0;
    }
  }
}

export function loadData(filename: string) {
  let jsonData: Pool[] = [];
  if (fs.existsSync(filename)) {
    jsonData = JSON.parse(fs.readFileSync(filename, "utf-8"));
  }
  return jsonData;
}

export function saveData(filename: string, data: Pool[]) {
  let jsonData: Pool[] = [];
  if (fs.existsSync(filename)) {
    jsonData = JSON.parse(fs.readFileSync(filename, "utf-8"));
  }

  // merge two list
  jsonData = _(jsonData)
    .concat(data)
    .uniqBy((item) => item.address)
    .value();

  fs.writeFileSync(
    filename,
    JSON.stringify(
      jsonData,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );
  console.log("success to save!");
}

export function encodeSwapRoute(
  smartExchangeRouter: Contract,
  path: string[],
  poolVersion: string[],
  versionLen: number[],
  fees: number[],
  swapData: {
    amountIn: string | number;
    amountOutMin: string | number;
    to: string;
    deadline: number;
  },
) {
  const method = smartExchangeRouter.methodInstances["swapExactInput"];

  const encodedData = utils.abi.encodeParamsV2ByABI(method.abi, [
    path,
    poolVersion,
    versionLen,
    fees,
    [swapData.amountIn, swapData.amountOutMin, swapData.to, swapData.deadline],
  ]);
  return encodedData;
}

export function prettyPrint(obj: any) {
  console.log(JSON.stringify(obj, null, 4));
}
