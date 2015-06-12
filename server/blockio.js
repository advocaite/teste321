var BlockIo = require('block_io');

var BLOCK_SECRET_KEY = process.env.BLOCK_SECRET_KEY;
if (!BLOCK_SECRET_KEY) console.log('Must set BLOCK_SECRET_KEY');
var BLOCK_API_KEY = process.env.BLOCK_BITCOIN_KEY;
if (!BLOCK_API_KEY) console.log('Must set BLOCK_BITCOIN_KEY');

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
  sendToWithdrawalAddress: function(amount, from) {
    var fee = 0.00001;
    block_io.withdraw_from_addresses({
      'amounts': amount - fee,
      'from_addresses': from,
      'to_addresses': BLOCK_BITCOIN_WITHDRAWAL_ADDRESS,
      'pin': BLOCK_SECRET_KEY
    }, function(err, result) {
      console.log('withdraw_from_addresses err', err);
      if (result && result.status === "success" && result.data.txid) {
        return callback(null, result.data.txid);
      } else {
        return callback('ERR_SENDING');
      }        
    });
  }
};
