export enum Chain {
  Mainnet,
  Shasta,
}

export const rpcUrlsForAllChains = {
  [Chain.Mainnet]: "https://api.trongrid.io",
  [Chain.Shasta]: "https://api.shasta.trongrid.io",
};

export const routerAddressesForAllChains = {
  [Chain.Mainnet]: {
    factoryV2Addr: "TKWJdrQkqHisa1X8HUdHEfREvTzw4pMAaY",
    factoryV3Addr: "TThJt8zaJzJMhCEScH7zWKnp5buVZqys9x",
    routerV2Addr: "TXF1xDbVGdxFGbovmmmXvBGu8ZiE3Lq4mR",
    routerV3Addr: "TQAvWQpT9H916GckwWDJNhYZvQMkuRL7PN",
    quoterV3Addr: "TLhZ48yfHygMLM2uZr87zJJusHjGen97gh",
    multicall3Addr: "TEazPvZwDjDtFeJupyo7QunvnrnUjPH8ED",
    smartExchangeRouterAddr: "TJ4NNy8xZEqsowCBhLvZ45LCqPdGjkET5j",
  },
  [Chain.Shasta]: {
    factoryV2Addr: "TBmhLF4smLAotY5ihsXzd3wSAxqfvoPMRE",
    routerV2Addr: "TPnTVkeymNYy32VurhGeycx9UkqB7gJb5M",
    multicall3Addr: "TG2ss5TN1BWHeJ4ZR54KRZsLGi9qU38CZg",

    factoryV3Addr: "",
    routerV3Addr: "",
    quoterV3Addr: "",
    smartExchangeRouterAddr: "",
  },
};

export const tokensForAllChains = {
  [Chain.Mainnet]: {
    WTRX: {
      symbol: "WTRX",
      decimal: 6,
      address: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR",
    },
    USDT: {
      symbol: "USDT",
      address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      decimal: 6,
    },
  },
  [Chain.Shasta]: {
    WTRX: {
      symbol: "WTRX",
      decimal: 6,
      address: "TLi1ygS2MEr926gyFUWYNxeBJ24yVGDZse",
    },
    USDT: {
      symbol: "USDT",
      address: "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs",
      decimal: 6,
    },
    MEME: {
      symbol: "MEME",
      address: "TA3HgieqKUBXEt799FDZmGibzn69dH9z8P",
      decimal: 6,
    },
  },
};
