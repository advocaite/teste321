var BlockIo = require('block_io');

var BLOCK_SECRET_KEY = process.env.BLOCK_SECRET_KEY;
if (!BLOCK_SECRET_KEY) console.log('Must set BLOCK_SECRET_KEY');
var BLOCK_API_KEY = process.env.BLOCK_BITCOIN_KEY;
if (!BLOCK_API_KEY) console.log('Must set BLOCK_BITCOIN_KEY');

var block_io = new BlockIo(BLOCK_API_KEY, BLOCK_SECRET_KEY, 2);

module.exports = {
    createDepositAddress: function(userId, callback) {
        block_io.get_new_address({}, function (err, result) {
            console.log('block_io err', err);
            if (result && result.status === "success" && result.data.address) {
                return callback(null, result.data.address);
            } else {
                return callback('ERR_CREATING_ADDRESS');
            }
        });
    }
};