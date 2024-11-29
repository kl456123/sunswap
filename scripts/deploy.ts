import { TronWeb, Contract } from 'tronweb'



async function prepare(tronWeb: TronWeb, senderAddress: string, wtrx: Contract) {
    // prepare mock token
  // console.log(await wtrx.balanceOf(senderAddress).call())
  console.log(await tronWeb.trx.getBalance(senderAddress));
  await wtrx.deposit().send({feeLimit: 100 * 1e6, callValue: 1*1e6,
                                        shouldPollResponse:true
  });
}

async function main() {
}
