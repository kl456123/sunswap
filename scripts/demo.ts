import { TronWeb } from "tronweb";
import { ethers } from 'ethers'
import {
  rpcUrlsForAllChains,
  tokensForAllChains,
  routerAddressesForAllChains,
  Chain,
} from "../src/constants";
import factoryV2Abi from "../abis/factoryV2.json";
import routerV2Abi from "../abis/routerV2.json";
import quoterV3Abi from "../abis/quoterV3.json";
import wtrxAbi from "../abis/wtrx.json";
import erc20Abi from "../abis/erc20.json";
import multicall3Abi from "../abis/multicall3.json";
import { Token, Call } from "../src/types";
import {
  quoteFromUniV2,
  quoteFromUniV3,
  fetchAllPools,
  encodeCallDataForQuoteFromUniV2,
  encodeCallDataForQuoteFromUniV3,
} from "../src/utils";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const chain = Chain.Shasta;
  // 9f757178-eb18-47f9-a7ee-15ba2a731e24
  const API_KEY = "ffdbac96-0284-4df9-840c-5e5c32499698";
  const tronWeb = new TronWeb({
    fullHost: rpcUrlsForAllChains[chain],
    headers: { "TRON-PRO-API-KEY": API_KEY },
    privateKey: process.env.PRIVATE_KEY,
  });
  const {
    routerV2Addr,
    routerV3Addr,
    multicall3Addr,
    factoryV2Addr,
    quoterV3Addr,
  } = routerAddressesForAllChains[chain];
  const tokens = tokensForAllChains[chain];
  const factoryV2 = tronWeb.contract(
    factoryV2Abi.entrys as unknown as any,
    factoryV2Addr,
  );
  const routerV2 = tronWeb.contract(routerV2Abi, routerV2Addr);
  const quoterV3 = tronWeb.contract(quoterV3Abi, quoterV3Addr);
  const multicall3 = tronWeb.contract(multicall3Abi, multicall3Addr);
  const usdt = tronWeb.contract(erc20Abi, tokens.USDT.address);

  const inputTokenAmount = 1e5;
  const path: string[] = [tokens.WTRX.address, tokens.MEME.address];
  // const path = ["0x75c9f12833aa01f24c4f9dc8ff5f9f8e3a1bc858", "0x00c592dcb421406b4d29cd85c10c30ec3d50dd92"]
  const amounts = [inputTokenAmount];
  const fees = [3000];
  const sender = tronWeb.defaultAddress.base58;

  // const quoteAmounts = await quoteFromUniV3(amounts, path, fees, multicall3, quoterV3);
  // const quoteAmounts = await quoteFromUniV2(
    // amounts,
    // path,
    // multicall3,
    // routerV2,
  // );
  // console.log(quoteAmounts);

  // const senderAddress  = tronWeb.defaultAddress.base58;
  const wtrx = tronWeb.contract(wtrxAbi, tokens.WTRX.address);
  console.log(await wtrx.balanceOf(sender).call());
  // await wtrx.deposit().send({feeLimit: 100 * 1e6, callValue: 1*1e6,
                                        // shouldPollResponse:true
  // });
  // await wtrx.approve(routerV2.address, ethers.MaxUint256).send({
      // feeLimit: 100*1e6,
      // shouldPollResponse:true
      // });

  // console.log(await tronWeb.trx.getBalance(tronWeb.defaultAddress.base58));
  // console.log(encodeCallDataForQuote(amounts, path, multicall3, routerV2));
  // console.log(encodeCallDataForQuoteFromUniV3(amounts, path, fees, multicall3, quoterV3));
    // console.log(tronWeb.address.fromHex(await routerV2.factory().call()));
    // const res = await routerV2.getAmountsOut(inputTokenAmount, ["TSsj3nsEWiYm81MGzCByjEtGVygh5sRBqd", "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs"]).call();
    await routerV2.swapExactTokensForTokens(
        inputTokenAmount, 0, path, sender, ethers.MaxUint256).send({feeLimit: 1000*1e6, shouldPollResponse:true});

    // console.log(await tronWeb.trx.getCurrentBlock())
    // console.log(res)
    // await routerV2.swapExactTokensForTokens(
        // inputTokenAmount,
        // 0,
        // path,
        // sender,
        // ethers.MaxUint256
    // ).send({
        // feeLimit: 1000 * 1e6,
        // shouldPollResponse: true,
    // });

  // console.log(routerV2.methodInstances['getAmountsOut'].signature)

  // console.log(tronWeb.address.fromHex(path[0]));
  // console.log(tronWeb.address.fromHex(path[1]));
  // console.log(tronWeb.address.toHex('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'));
  // console.log('41e95812d8d5b5412d2b9f3a4d5a87ca15c5c51f33'.length)
  // await fetchAllPools(factoryV2, multicall3);
}

main();
