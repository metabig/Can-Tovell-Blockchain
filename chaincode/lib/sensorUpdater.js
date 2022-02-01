'use strict';

/*
Deploy instructions:
./network.sh up createChannel -ca
./network.sh deployCC -ccn sensorchain -ccp /home/metabig/first-run-hyperledger/chaincode -ccl javascript
*/

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class SensorUpdater extends Contract {

    async InitLedger(ctx) {
        const devices = [
            {
                ID: 'sensor1',
                Unit: 'degree',
                Value: 15,
            },
        ];

        for (const device of devices) {
            device.docType = 'sensor';
            // example of how to *write to world state deterministically*
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(device.ID, Buffer.from(stringify(sortKeysRecursive(device))));
        }
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const deviceJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!deviceJSON || deviceJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return deviceJSON.toString();
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdateAsset(ctx, id, unit, value) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Unit: unit,
            Value: value,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const deviceJSON = await ctx.stub.getState(id);
        return deviceJSON && deviceJSON.length > 0;
    }
}

module.exports = SensorUpdater;
