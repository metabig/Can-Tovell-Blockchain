const express = require("express");
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

const gateway = new Gateway();

const getContract = async () => {
  const network = await gateway.getNetwork(channelName);
  return network.getContract(chaincodeName);
};

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

app.post("/api/sensors", async (req, res) => {
  const device = req.body;
  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);
  
  console.log(device)
  let result = await contract.submitTransaction(
    "CreateAsset",
    device.id,
    device.unit,
    device.value,
    device.type
  );
  res.status(200).json(device);
});


//peer chaincode query -C mychannel -n sensorchain -c '{"Args":["QueryAssets","{\"selector\":{\"docType\":\"sensor\"}}"]}' | jq
app.get("/api/sensors", async (req, res) => {
  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

  let result = await contract.evaluateTransaction(
    "QueryAssets",
    '{"selector":{"docType":"sensor"}}'
  );

  res.json(JSON.parse(result.toString()));
});

app.patch("/api/device/:id", async (req, res) => {
  const device = req.body;
  const contract = await getContract();
  const result = await contract.submitTransaction(
    "UpdateDevice",
    req.params.id,
    device.value
  );
  res.status(200).send({ device: device, response: result });
});

//peer chaincode query -C mychannel -n sensorchain -c '{"Args":["GetAssetHistory","sensor2"]}' | jq
app.get("/api/history/:id", async (req, res) => {
  const contract = await getContract();
  const result = await contract.submitTransaction(
    "GetAssetHistory",
    req.params.id
  );
  res.status(200).send(result);
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

  await gateway.connect(ccp, {
    wallet,
    identity: org1UserId,
    discovery: { enabled: true, asLocalhost: true },
  });
  // const network = await gateway.getNetwork(channelName);
  // const contract = network.getContract(chaincodeName);
  // await contract.submitTransaction("InitLedger");
  // console.log("[InitLedger]: Function completed");
  console.log("Started Successfully on port 8100");
});
