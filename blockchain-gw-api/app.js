const express = require("express");
const app = express();
const cors = require("cors");

const { Gateway, Wallets } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const path = require("path");
const {
  buildCAClient,
  registerAndEnrollUser,
  enrollAdmin,
} = require("./CAUtil.js");
const { buildCCPOrg1, buildWallet } = require("./AppUtil.js");

const channelName = "mychannel";
const chaincodeName = "sensorchain";
const mspOrg1 = "Org1MSP";
const walletPath = path.join(__dirname, "wallet");
const org1UserId = "appUser";

const ccp = buildCCPOrg1();

const caClient = buildCAClient(FabricCAServices, ccp, "ca.org1.example.com");

app.use(
  cors({
    origin: "*",
  })
);

app.get("/", async (req, res) => {
  const wallet = await buildWallet(Wallets, walletPath);

  const gateway = new Gateway();

  await gateway.connect(ccp, {
    wallet,
    identity: org1UserId,
    discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
  });

  // Build a network instance based on the channel where the smart contract is deployed
  const network = await gateway.getNetwork(channelName);

  // Get the contract from the network.
  const contract = network.getContract(chaincodeName);

  let result = await contract.evaluateTransaction('GetAllAssets');

  res.json(JSON.parse(result.toString()));
});

app.listen(8100, async () => {
  const wallet = await buildWallet(Wallets, walletPath);

  await enrollAdmin(caClient, wallet, mspOrg1);

  await registerAndEnrollUser(
    caClient,
    wallet,
    mspOrg1,
    org1UserId,
    "org1.department1"
  );

  console.log("Started Successfully");
});
