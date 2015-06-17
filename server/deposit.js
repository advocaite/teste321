var BigNumber = require('bignumber.js');
var database = require('./database');
var blockio = require('./blockio');

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

  if (Number(body.balance_change) > 0 && body.is_green) {
    // send funds to main withdrawal address
    blockio.sendToWithdrawalAddress(body.amount_received, address, function() {});
  }

  if (body.confirmations != 1 || Number(body.balance_change) < 0 || body.address === process.env.BLOCK_BITCOIN_WITHDRAWAL_ADDRESS) {
    console.log(body.confirmations);
    console.log(amount);
    return res.send('ok');
  }

  var transaction = body.txid;
  var address = body.address;

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
