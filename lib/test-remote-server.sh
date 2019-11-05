#!/bin/bash

# Connect to cloud infrastructure and run integration tests.


# TESTNET full node
export RPC_BASEURL=http://142.93.13.2:8332/
export RPC_USERNAME=bitcoin
export RPC_PASSWORD=password
export NETWORK=mainnet

# Team DO QA Testnet Insight Server
export BITCOINCOM_BASEURL=http://13.53.188.172:3002/api/

# Testnet SLPDB
export SLPDB_URL=https://slpdb.bchdata.cash/

# Testnet Bitcore Node API
#export BITCORE_URL=http://decatur.hopto.org/
export BITCORE_URL=http://68.183.106.43:3000/

# Testnet Blockbook
export BLOCKBOOK_URL=https://157.230.214.175:9131/
#export BLOCKBOOK_URL=https://bch.blockbook.api.openbazaar.org/
# Allow node.js to make network calls to https using self-signed certificate.
export NODE_TLS_REJECT_UNAUTHORIZED=0



export TEST=integration

npm run test

#export NETWORK=mainnet
#mocha --timeout 25000 test/v3/slp.js
