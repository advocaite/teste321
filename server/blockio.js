var BigNumber = require('bignumber.js');
var BlockIo = require('block_io');
var constants = require('./constants');

var BLOCK_SECRET_KEY = process.env.BLOCK_SECRET_KEY;
if (!BLOCK_SECRET_KEY) console.log('Must set BLOCK_SECRET_KEY');
var BLOCK_API_KEY = process.env.BLOCK_BITCOIN_KEY;
if (!BLOCK_API_KEY) console.log('Must set BLOCK_BITCOIN_KEY');
var BLOCK_WITHDRAWAL_ADDRESS = process.env.BLOCK_BITCOIN_WITHDRAWAL_ADDRESS;
if (!BLOCK_WITHDRAWAL_ADDRESS) console.log('Must set BLOCK_**COIN**_WITHDRAWAL_ADDRESS');

var block_io = new BlockIo(BLOCK_API_KEY, BLOCK_SECRET_KEY, 2);

module.exports = {
  createDepositAddress: function(userId, callback) {
    block_io.get_new_address({}, function(err, result) {
      console.log('get_new_address err', err);
      if (result && result.status === "success" && result.data.address) {
        return callback(null, result.data.address);
      } else {
        return callback('ERR_CREATING_ADDRESS');
      }
    });
  },
  sendToWithdrawalAddress: function(amount, from, callback) {
    var data = {
      'amounts': new BigNumber(amount).minus(constants.FEE_WHOLE).toNumber(),
      'from_addresses': from,
      'to_addresses': BLOCK_WITHDRAWAL_ADDRESS,
      'pin': BLOCK_SECRET_KEY
    };
    console.log('sendToWithdrawalAddress data');
    console.log(data);

    block_io.withdraw_from_addresses(data, function(err, result) {
      console.log('sendToWithdrawalAddress err', err);
      if (result && result.status === "success" && result.data.txid) {
        return callback(null, result.data.txid);
      } else {
        return callback('ERR_SENDING');
      }
    });
  },
  sendWithdrawal: function(amount, to, callback) {
    var data = {
      'amounts': new BigNumber(amount).minus(constants.FEE_WHOLE).toNumber(),
      'from_addresses': BLOCK_WITHDRAWAL_ADDRESS,
      'to_addresses': to,
      'pin': BLOCK_SECRET_KEY
    };
    console.log('withdraw data');
    console.log(data);

    block_io.withdraw_from_addresses(data, function(err, result) {
      console.log('withdraw err', err);
      if (result && result.status === "success" && result.data.txid) {
        return callback(null, result.data.txid);
      } else {
        return callback('ERR_SENDING');
      }
    });
  }
};
