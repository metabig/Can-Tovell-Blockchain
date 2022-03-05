import  random

prev = 0.4
diff = 20

with open("script.sh", 'a') as f:
    for x in range(50):
        prev = prev*100
        prev = random.randint(int(prev-diff), int(prev+diff))/100
        if (prev < 0):
            prev = 0
        line = """peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "/home/metabig/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n  sensorchain --peerAddresses localhost:7051 --tlsRootCertFiles "/home/metabig/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "/home/metabig/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"UpdateDevice","Args":["Amoni11",\"""" + str(prev) + '"]}\''
        print(line, file=f)