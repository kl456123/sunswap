#!/bin/bash

API_KEY=a8e66741-a678-49c1-9888-0186331c9daa
BASE_URL=https://pro-api.coinmarketcap.com
# TRON
NETWOKR_ID=47
ROUTE=/v4/dex/spot-pairs/latest
# URL=https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=5000&convert=USD
curl -H "X-CMC_PRO_API_KEY: ${API_KEY}" -H "Accept: application/json" -d "scroll_id=0&limit=2&convert=USD&network_slug=tron&dex_slug=sunswap-v3" -G ${BASE_URL}${ROUTE}
