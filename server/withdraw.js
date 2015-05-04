var assert = require('assert');
var bc = require('./bitcoin_client');
var db = require('./database');
var request = require('request');
var nxtClient = require('./nxt_client');

// Doesn't validate
module.exports = function(userId, satoshis, withdrawalAddress, withdrawalId, callback) {
    assert(typeof userId === 'number');
    assert(satoshis > Math.pow(10,8));
    assert(typeof withdrawalAddress === 'string');
    assert(typeof callback === 'function');

    db.makeWithdrawal(userId, satoshis, withdrawalAddress, withdrawalId, function (err, fundingId) {
        if (err) {
            if (err.code === '23514')
                callback('NOT_ENOUGH_MONEY');
            else if(err.code === '23505')
                callback('SAME_WITHDRAWAL_ID');
            else
                callback(err);
            return;
        }

        assert(fundingId);

        var amount = satoshis - Math.pow(10, 8); // -1 NXT fee

        nxtClient.sendWithdrawal(amount, withdrawalAddress, function (err, hash) {
            if (err) {
                if (err === 'NOT_ENOUGH_FUNDS' || err === 'HOT_WALLET_OFFLINE') {
                    db.reverseWithdrawal(userId, satoshis, fundingId, function (err, result) {
                      return callback('HOT_WALLET_ERROR');
                    });
                } else {
                  return callback('FUNDING_QUEUED');
                }
            } else {
                db.setFundingsWithdrawalTxid(fundingId, hash, function (err) {
                  if (err) {
                    return callback(new Error('Could not set fundingId ' + fundingId + ' to ' + hash + ': \n' + err));
                  }

                  callback(null);
                });
            }
        });
    });
};

