"use strict";

/*
Deploy instructions:
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn sensorchain -ccp /home/metabig/first-run-hyperledger/chaincode -ccl javascript
peer chaincode query -C mychannel -n sensorchain -c '{"Args":["QueryAssets","{\"selector\":{\"docType\":\"sensor\"}}"]}' | jq
peer chaincode query -C mychannel -n sensorchain -c '{"Args":["GetAssetHistory","sensor2"]}' | jq
*/

const { Contract } = require("fabric-contract-api");

class SensorUpdater extends Contract {
  // CreateAsset - create a new asset, store into chaincode state
  async CreateAsset(ctx, id, name, unit, value, deposit, type, min, max) {
    const exists = await this.AssetExists(ctx, id);
    if (exists) {
      throw new Error(`The asset ${id} already exists`);
    }

    // ==== Create asset object and marshal to JSON ====
    let device = {
      docType: type,
      id: id,
      name: name,
      value: value,
      deposit: deposit,
      unit: unit,
      min: min,
      max: max,
    };

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(device)));
  }

  // ReadAsset returns the asset stored in the world state with given id.
  async ReadAsset(ctx, id) {
    const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`Asset ${id} does not exist`);
    }

    return assetJSON.toString();
  }

  // delete - remove a asset key/value pair from state
  async DeleteAsset(ctx, id) {
    if (!id) {
      throw new Error("Asset name must not be empty");
    }

    let exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`Asset ${id} does not exist`);
    }

    // to maintain the color~name index, we need to read the asset first and get its color
    let valAsbytes = await ctx.stub.getState(id); // get the asset from chaincode state
    let jsonResp = {};
    if (!valAsbytes) {
      jsonResp.error = `Asset does not exist: ${id}`;
      throw new Error(jsonResp);
    }
    let assetJSON;
    try {
      assetJSON = JSON.parse(valAsbytes.toString());
    } catch (err) {
      jsonResp = {};
      jsonResp.error = `Failed to decode JSON of: ${id}`;
      throw new Error(jsonResp);
    }
    await ctx.stub.deleteState(id); //remove the asset from chaincode state

    // delete the index
    let indexName = "color~name";
    let colorNameIndexKey = ctx.stub.createCompositeKey(indexName, [
      assetJSON.color,
      assetJSON.assetID,
    ]);
    if (!colorNameIndexKey) {
      throw new Error(" Failed to create the createCompositeKey");
    }
    //  Delete index entry to state.
    await ctx.stub.deleteState(colorNameIndexKey);
  }

  // TransferAsset transfers a asset by setting a new owner name on the asset
  async UpdateDevice(ctx, deviceId, newValue) {
    let deviceAsBytes = await ctx.stub.getState(deviceId);
    if (!deviceAsBytes || !deviceAsBytes.toString()) {
      throw new Error(`Asset ${deviceId} does not exist`);
    }
    let deviceToUpdate = {};
    try {
      deviceToUpdate = JSON.parse(deviceAsBytes.toString()); //unmarshal
    } catch (err) {
      let jsonResp = {};
      jsonResp.error = "Failed to decode JSON of: " + deviceId;
      throw new Error(jsonResp);
    }
    deviceToUpdate.value = parseFloat(newValue); //change the owner

    let deviceJSONasBytes = Buffer.from(JSON.stringify(deviceToUpdate));
    await ctx.stub.putState(deviceId, deviceJSONasBytes); //rewrite the asset
  }

  // GetAssetsByRange performs a range query based on the start and end keys provided.
  // Read-only function results are not typically submitted to ordering. If the read-only
  // results are submitted to ordering, or if the query is used in an update transaction
  // and submitted to ordering, then the committing peers will re-execute to guarantee that
  // result sets are stable between endorsement time and commit time. The transaction is
  // invalidated by the committing peers if the result set has changed between endorsement
  // time and commit time.
  // Therefore, range queries are a safe option for performing update transactions based on query results.
  async GetAssetsByRange(ctx, startKey, endKey) {
    let resultsIterator = await ctx.stub.getStateByRange(startKey, endKey);
    let results = await this._GetAllResults(resultsIterator, false);

    return JSON.stringify(results);
  }

  // TransferAssetByColor will transfer assets of a given color to a certain new owner.
  // Uses a GetStateByPartialCompositeKey (range query) against color~name 'index'.
  // Committing peers will re-execute range queries to guarantee that result sets are stable
  // between endorsement time and commit time. The transaction is invalidated by the
  // committing peers if the result set has changed between endorsement time and commit time.
  // Therefore, range queries are a safe option for performing update transactions based on query results.
  // Example: GetStateByPartialCompositeKey/RangeQuery
  async TransferAssetByColor(ctx, color, newOwner) {
    // Query the color~name index by color
    // This will execute a key range query on all keys starting with 'color'
    let coloredAssetResultsIterator =
      await ctx.stub.getStateByPartialCompositeKey("color~name", [color]);

    // Iterate through result set and for each asset found, transfer to newOwner
    let responseRange = await coloredAssetResultsIterator.next();
    while (!responseRange.done) {
      if (!responseRange || !responseRange.value || !responseRange.value.key) {
        return;
      }

      let objectType;
      let attributes;
      ({ objectType, attributes } = await ctx.stub.splitCompositeKey(
        responseRange.value.key
      ));

      console.log(objectType);
      let returnedAssetName = attributes[1];

      // Now call the transfer function for the found asset.
      // Re-use the same function that is used to transfer individual assets
      await this.TransferAsset(ctx, returnedAssetName, newOwner);
      responseRange = await coloredAssetResultsIterator.next();
    }
  }

  // QueryAssetsByOwner queries for assets based on a passed in owner.
  // This is an example of a parameterized query where the query logic is baked into the chaincode,
  // and accepting a single query parameter (owner).
  // Only available on state databases that support rich query (e.g. CouchDB)
  // Example: Parameterized rich query
  async QueryAssetsByOwner(ctx, owner) {
    let queryString = {};
    queryString.selector = {};
    queryString.selector.docType = "asset";
    queryString.selector.owner = owner;
    return await this.GetQueryResultForQueryString(
      ctx,
      JSON.stringify(queryString)
    ); //shim.success(queryResults);
  }

  // Example: Ad hoc rich query
  // QueryAssets uses a query string to perform a query for assets.
  // Query string matching state database syntax is passed in and executed as is.
  // Supports ad hoc queries that can be defined at runtime by the client.
  // If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
  // Only available on state databases that support rich query (e.g. CouchDB)
  async QueryAssets(ctx, queryString) {
    return await this.GetQueryResultForQueryString(ctx, queryString);
  }

  // GetQueryResultForQueryString executes the passed in query string.
  // Result set is built and returned as a byte array containing the JSON results.
  async GetQueryResultForQueryString(ctx, queryString) {
    let resultsIterator = await ctx.stub.getQueryResult(queryString);
    let results = await this._GetAllResults(resultsIterator, false);

    return JSON.stringify(results);
  }

  // Example: Pagination with Range Query
  // GetAssetsByRangeWithPagination performs a range query based on the start & end key,
  // page size and a bookmark.
  // The number of fetched records will be equal to or lesser than the page size.
  // Paginated range queries are only valid for read only transactions.
  async GetAssetsByRangeWithPagination(
    ctx,
    startKey,
    endKey,
    pageSize,
    bookmark
  ) {
    const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination(
      startKey,
      endKey,
      pageSize,
      bookmark
    );
    let results = {};

    results.results = await this._GetAllResults(iterator, false);

    results.ResponseMetadata = {
      RecordsCount: metadata.fetchedRecordsCount,
      Bookmark: metadata.bookmark,
    };

    return JSON.stringify(results);
  }

  // Example: Pagination with Ad hoc Rich Query
  // QueryAssetsWithPagination uses a query string, page size and a bookmark to perform a query
  // for assets. Query string matching state database syntax is passed in and executed as is.
  // The number of fetched records would be equal to or lesser than the specified page size.
  // Supports ad hoc queries that can be defined at runtime by the client.
  // If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
  // Only available on state databases that support rich query (e.g. CouchDB)
  // Paginated queries are only valid for read only transactions.
  async QueryAssetsWithPagination(ctx, queryString, pageSize, bookmark) {
    const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(
      queryString,
      pageSize,
      bookmark
    );
    let results = {};

    results.results = await this._GetAllResults(iterator, false);

    results.ResponseMetadata = {
      RecordsCount: metadata.fetchedRecordsCount,
      Bookmark: metadata.bookmark,
    };

    return JSON.stringify(results);
  }

  // GetAssetHistory returns the chain of custody for an asset since issuance.
  async GetAssetHistory(ctx, assetName) {
    let resultsIterator = await ctx.stub.getHistoryForKey(assetName);
    let results = await this._GetAllResults(resultsIterator, true);

    return JSON.stringify(results);
  }

  // AssetExists returns true when asset with given ID exists in world state
  async AssetExists(ctx, assetName) {
    // ==== Check if asset already exists ====
    let assetState = await ctx.stub.getState(assetName);
    return assetState && assetState.length > 0;
  }

  // This is JavaScript so without Funcation Decorators, all functions are assumed
  // to be transaction functions
  //
  // For internal functions... prefix them with _
  async _GetAllResults(iterator, isHistory) {
    let allResults = [];
    let res = await iterator.next();
    while (!res.done) {
      if (res.value && res.value.value.toString()) {
        let jsonRes = {};
        console.log(res.value.value.toString("utf8"));
        if (isHistory && isHistory === true) {
          jsonRes.TxId = res.value.txId;
          jsonRes.Timestamp = res.value.timestamp;
          try {
            jsonRes.Value = JSON.parse(res.value.value.toString("utf8"));
          } catch (err) {
            console.log(err);
            jsonRes.Value = res.value.value.toString("utf8");
          }
        } else {
          jsonRes.Key = res.value.key;
          try {
            jsonRes.Record = JSON.parse(res.value.value.toString("utf8"));
          } catch (err) {
            console.log(err);
            jsonRes.Record = res.value.value.toString("utf8");
          }
        }
        allResults.push(jsonRes);
      }
      res = await iterator.next();
    }
    iterator.close();
    return allResults;
  }

  // InitLedger creates sample assets in the ledger
  async InitLedger(ctx) {
    const assets = [
      {
        id: "Cabalímetre1",
        name: "Cabalímetre",
        unit: "m³/h",
        value: 500,
        deposit: "Dipòsit de capçalera",
        type: "sensor",
        //El cabal d'entrada és x i determina el valor de la resa de cabals.
      },
      {
        id: "Conductivitat2",
        name: "Conductivitat elèctrica",
        unit: "μS/m",
        value: 5234,
        deposit: "Dipòsit de capçalera",
        type: "sensor",
        min: 5000,
        max: 12000,
        //Els paràmetres són 5000-12000
      },
      {
        id: "Amoni3",
        name: "Amoni",
        unit: "mg NH₄-N/l",
        value: 17,
        deposit: "Dipòsit de capçalera",
        type: "sensor",
        min: 10,
        max: 30,
        //He escrit amoni 1 perquè és el sensor del primer depòsit.
        //Els paràmetres són 10-30.
      },
      {
        id: "TOC4",
        name: "Carboni Orgànic Total",
        unit: "mg/l",
        value: 12,
        deposit: "Dipòsit de capçalera",
        type: "sensor",
        min: 10,
        max: 15,
        //TOC vol dir Carboni Orgànic Total.
        //Els paràmetres són 10-15
      },
      {
        id: "Cabalímetre5",
        name: "Cabalímetre",
        unit: "m³/h",
        value: 400,
        deposit: "Primera osmosi inversa",
        type: "sensor",
        //El seu valor ha de ser 0,8x
      },
      {
        id: "Conductivitat6",
        name: "Conductivitat elèctrica",
        unit: "μS/m",
        value: 420,
        deposit: "Primera osmosi inversa",
        type: "sensor",
        min: 0,
        max: 500,
        //Els paràmetres són x<500
      },
      {
        id: "Amoni7",
        name: "Amoni",
        unit: "mg NH₄-N/l",
        value: 4,
        deposit: "Primera osmosi inversa",
        type: "sensor",
        min: 0,
        max: 5,
        //Els paràmetres són x<5
      },
      {
        id: "TOC8",
        name: "Carboni Orgànic Total",
        unit: "mg/l",
        value: 2,
        deposit: "Primera osmosi inversa",
        type: "sensor",
        min: 0,
        max: 3,
        //TOC vol dir Carboni Orgànic Total.
        //x<3
      },
      {
        id: "Cabalímetre9",
        name: "Cabalímetre",
        unit: "m³/h",
        value: 300,
        deposit: "Segona osmosi inversa",
        type: "sensor",
        //El seu valor ha de ser 0,6x
      },
      {
        id: "Conductivitat10",
        name: "Conductivitat elèctrica",
        unit: "μS/m",
        value: 20,
        deposit: "Segona osmosi inversa",
        type: "sensor",
        min: 0,
        max: 100,
        //Els paràmetres són x<100
      },
      {
        id: "Amoni11",
        name: "Amoni",
        unit: "mg NH₄-N/l",
        value: 0.4,
        deposit: "Segona osmosi inversa",
        type: "sensor",
        min: 0,
        max: 1,
        //Els paràmetres són x<1
      },
      {
        id: "TOC12",
        name: "Carboni Orgànic Total",
        unit: "mg/l",
        value: 0.2,
        deposit: "Segona osmosi inversa",
        type: "sensor",
        min: 0,
        max: 1,
        //x<1
      },
      {
        id: "Potencial13",
        name: "Potencial redox",
        unit: "mV",
        value: 554,
        deposit: "Oxidació avançada (UV-AOP)",
        type: "sensor",
        min: 0,
        max: 400,
        //Els paràmetres són x>400.
        //Aquesta mesura només es pren a la 5ta fase (UV-AOP).
      },
      {
        id: "Cabalímetre14",
        name: "Cabalímetre",
        unit: "m³/h",
        value: 500,
        deposit: "Dipòsit de sortida (remineralització)",
        type: "sensor",
        //El seu valor és diferent a x perquè és el valor de l'aigua produïda (indistint)
      },
      {
        id: "Conductivitat15",
        name: "Conductivitat elèctrica",
        unit: "μS/m",
        value: 420,
        deposit: "Dipòsit de sortida (remineralització)",
        type: "sensor",
        min: 0,
        max: 500,
        //Els paràmetres són x<500
      },
      {
        id: "Amoni16",
        name: "Amoni",
        unit: "mg NH₄-N/l",
        value: 0.4,
        deposit: "Dipòsit de sortida (remineralització)",
        type: "sensor",
        min: 0,
        max: 1,
        //Els paràmetres són x<1
      },
      {
        id: "TOC17",
        name: "Carboni Orgànic Total",
        unit: "mg/l",
        value: 0.2,
        deposit: "Dipòsit de sortida (remineralització)",
        type: "sensor",
        min: 0,
        max: 1,
        //x<1
      },
    ];

    for (const asset of assets) {
      await this.CreateAsset(
        ctx,
        asset.id,
        asset.name,
        asset.unit,
        asset.value,
        asset.deposit,
        asset.type,
        asset.min,
        asset.max
      );
    }
  }
}

module.exports = SensorUpdater;
