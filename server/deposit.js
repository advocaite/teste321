var BigNumber = require('bignumber.js');
var database = require('./database');
var blockio = require('./blockio');
var constants = require('./constants');

exports.callback = function(req, res) {
  var secret = req.query.secret;

  console.log(req.body);

  if (secret !== process.env.DEPOSIT_SECRET) {
    return res.status(500).render('error');
  }

  if (!req.body.data) {
    console.log('no req.body.data');
    return res.status(500).render('error');
  }

  var body = req.body.data;
  var amount = new BigNumber(body.amount_received).times(Math.pow(10, 8)).toNumber();
  var address = body.address;

  if (Number(body.balance_change) > 0 && body.confirmations === constants.MIN_SEND_CONFIRMATIONS && body.address !== process.env.BLOCK_BITCOIN_WITHDRAWAL_ADDRESS) {
    blockio.sendToWithdrawalAddress(body.amount_received, address, function() {});
  }

  if (body.confirmations !== 1 || Number(body.balance_change) < 0 || body.address === process.env.BLOCK_BITCOIN_WITHDRAWAL_ADDRESS) {
    return res.send('ok');
  }

  var transaction = body.txid;

  database.getUserFromDepositAddress(address, function(err, result) {
    console.log('get user err', err);
    if (err) {
      return res.status(500).render('error');
    } else {
      database.insertDeposit(result.id, transaction, amount, function(err) {
        console.log('insert deposit err', err);
        if (err) {
          return res.status(500).render('error');
        } else {
          return res.send('ok');
        }
      });
    }
  });


};
