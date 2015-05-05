var querystring = require('querystring');
var axios = require('axios');
var assert = require('better-assert');

var client = {
  host: process.env.NXT_HOST,
  sendWithdrawal: function (amount, recipient, callback) {
    assert(this.host);

    var url = this.host + '/nxt?';
    var params = {
      requestType: 'sendMoney',
      recipient: recipient,
      amountNQT: amount,
      feeNQT: Math.pow(10, 8),
      deadline: 1440,
      secretPhrase: process.env.DEPOSIT_PASSPHRASE
    };

    url += querystring.stringify(params);

    console.log('withdrawalUrl:', url);

    axios.post(url, null).then(function (response) {
      console.log('withdrawal response:');
      console.log(response);
      if (response && response.data && response.data.transaction) {
        callback(null, response.data.transaction);
      } else if (response && response.data.errorCode) {
        if(response.data.errorCode == 6) { // Not enough funds
          return callback('NOT_ENOUGH_FUNDS');
        }
        return callback('HOT_WALLET_OFFLINE');
      }
    }).catch(function () {
      return callback('HOT_WALLET_OFFLINE');
    });
  }
};

module.exports = client;
