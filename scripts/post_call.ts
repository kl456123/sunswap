import axios from "axios";
import quoteResp from "../data/res6.json";
import { TronWeb, utils } from "tronweb";
import { rpcUrlsForAllChains, routerAddressesForAllChains, Chain } from "../src/constants";
import smartExchangeRouterAbi from "../abis/smartExchangeRouter.json";
import { ethers } from "ethers";
import { encodeSwapRoute, prettyPrint } from "../src/utils";
import dotenv from "dotenv";

dotenv.config();

const baseUrl = "http://10.100.118.120:9305";
const smartExchangeRouterAddr = routerAddressesForAllChains[Chain.Mainnet].smartExchangeRouterAddr
const rpcUrl = rpcUrlsForAllChains[Chain.Mainnet];
// const baseUrl = 'http://localhost:9305'

interface Transaction {
  contractAddress: string;
  functionSelector: string;
  parameter: string;
  issuerAddress: string;
}

interface Fixture {
  fromToken: string;
  toToken: string;
  amountIn: number;
  slippage: number;
  recipient: string;
  sender: string;
  tronWeb: TronWeb;
  tx?: Transaction;
}

function encodeSwapRouteTest(fixture: Fixture) {
  const { fromToken, toToken, amountIn, recipient, tronWeb } = fixture;
  // send tx
  const smartExchangeRouter = tronWeb.contract(
    smartExchangeRouterAbi,
    smartExchangeRouterAddr,
  );
  const path = [fromToken, toToken];
  const poolVersion = ["v2"];
  const versionLen = [1];
  const fees = [300];
  const swapData = {
    amountIn,
    amountOutMin: 100,
    to: recipient,
    deadline: 100,
  };
  const encodedData = encodeSwapRoute(
    smartExchangeRouter,
    path,
    poolVersion,
    versionLen,
    fees,
    swapData,
  );
  return encodedData;
}

async function getSwapTransaction(fixture: Fixture) {
  const {
    fromToken,
    toToken,
    amountIn: amount,
    sender,
    recipient,
    slippage,
  } = fixture;
  const { data: quoteResp } = await axios.get(
    `${baseUrl}/v2/public/wallet-direct/aggregator/quote`,
    {
      params: {
        fromToken,
        toToken,
        amount,
        maxSplits: 1,
        maxSwapsPerPath: 2,
      },
    },
  );
  prettyPrint(quoteResp);
  const request = {
    swapRoute: quoteResp.data,
    from: sender,
    to: recipient,
    slippage,
  };
  const { data: swapResp } = await axios.post(
    `${baseUrl}/v2/public/wallet-direct/aggregator/swap-tx`,
    request,
  );
  const resp = swapResp.data;
  prettyPrint(resp);
  const transaction = resp.swapTransaction;
  return transaction;
}

async function aggregatorTest1(fixture: Fixture) {
  const { fromToken, toToken, sender, recipient } = fixture;
  // 100 trx
  const amount = ethers.parseUnits("10", 6).toString();
  const transaction = await getSwapTransaction(fixture);

  const provider = new ethers.JsonRpcProvider(
    "https://api.trongrid.io/jsonrpc",
    41,
  );
  const tx = {
    gas: "0x0",
    gasPrice: "0x0",
    value: "0x0",
    data: transaction.data,
    from: "0x" + TronWeb.address.toHex(transaction.from).slice(2),
    to: "0x" + TronWeb.address.toHex(transaction.to).slice(2),
  };

  const resultData = await provider.send("eth_call", [tx, "latest"]);
  const iface = new ethers.Interface(smartExchangeRouterAbi);
  console.log(iface.decodeFunctionResult("swapExactInput", resultData));
}

async function aggregatorTest2(fixture: Fixture) {
  const { data: quoteData } = await axios.post(
    `${baseUrl}/v2/private/wallet-direct/swap/aggregator/swap/get-quote`,
    {
      userId: 10,
      fromAddress: fixture.sender,
      toAddress: fixture.recipient,
      fromCoinAddress: fixture.fromToken,
      toCoinAddress: fixture.toToken,
      fromNetwork: "TRON",
      toNetwork: "TRON",
      fromCoinAmount: fixture.amountIn,
      toCoinAmount: 0,
      version: 2,
      mpVersion: "",
    },
  );
  const quoteResp = quoteData.data[0];
  prettyPrint(quoteResp);

  const { data: swapData } = await axios.post(
    `${baseUrl}/v2/private/wallet-direct/swap/aggregator/swap`,
    {
      vendor: quoteResp.vendor,
      side: "FROM",
      quoteId: quoteResp.quoteId,
      fromNetwork: "TRON",
      toNetwork: "TRON",
      fromCoinAddress: fixture.fromToken,
      toCoinAddress: fixture.toToken,
      fromCoinAmount: fixture.amountIn,
      slippage: fixture.slippage,
      fromWalletAddress: fixture.sender,
      toWalletAddress: fixture.recipient,
      extra: quoteResp.extra,
      version: 2,

      userId: 10,
      toCoinAmount: 0,
      mpVersion: "",
    },
    {
      headers: {
        "X-USER-ID": "100",
        "X-USER-EMAIL": "",
      },
    },
  );
  const swapResp = swapData.data;
  prettyPrint(swapResp);
}

async function aggregatorTest3(fixture: Fixture) {
  const { tronWeb, sender } = fixture;
  const transaction = await getSwapTransaction(fixture);
  const signedTransaction = await tronWeb.trx.sign(
    transaction,
    tronWeb.defaultPrivateKey,
  );
  // const broadcast = await tronWeb.trx.sendRawTransaction(signedTransaction);
}

async function main() {
  const API_KEY = "ffdbac96-0284-4df9-840c-5e5c32499698";
  const tronWeb = new TronWeb({
    fullHost: rpcUrl,
    headers: { "TRON-PRO-API-KEY": API_KEY },
    privateKey: process.env.PRIVATE_KEY,
  });
  const fromToken = "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR";
  const toToken = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  // send tokens to myself
  const sender = "TN9PHBz3SttooRXy4iJP1bKsk9azSSRMgr";
  const recipient = "TN9PHBz3SttooRXy4iJP1bKsk9azSSRMgr";
  const amountIn = 100000000;
  const fixture: Fixture = {
    fromToken,
    toToken,
    sender,
    recipient,
    amountIn,
    slippage: 100,
    tronWeb,
  };
  const smartExchangeRouter = tronWeb.contract(
    smartExchangeRouterAbi,
    smartExchangeRouterAddr,
  );
  const tx = {
    contractAddress: smartExchangeRouterAddr,
    functionSelector:
      smartExchangeRouter.methodInstances["swapExactInput"].functionSelector!,
    parameter: "0x",
    issuerAddress: sender,
  };
  fixture.tx = tx;
  // await aggregatorTest1(fixture);
  await aggregatorTest2(fixture);
  // await aggregatorTest3(fixture);
}

main();
