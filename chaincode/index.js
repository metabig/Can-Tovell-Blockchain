'use strict';

const sensorUpdater = require('./lib/sensorUpdater');

module.exports.SensorUpdater = sensorUpdater;
module.exports.contracts = [sensorUpdater];