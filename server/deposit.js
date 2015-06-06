var database = require('./database');

exports.callback = function (req, res) {
  var secret = req.query.secret;
  
  console.log(req.body);

  if (secret !== process.env.DEPOSIT_SECRET) {
    return res.status(500).render('error');
  }

  if (!req.body.data) {
    return res.status(500).render('error');
  }

  var body = req.body.data;
  var amount = Number(body.amount_received) * Math.pow(10, 8);

  if (body.confirmations < 1 || amount < 0) {
    return res.render('error');
  }

  var transaction = body.txid;
  var address = body.address;

  database.getUserFromDepositAddress(address, function (err, result) {
    if (err) {
      return res.status(500).render('error');
    } else {
      database.insertDeposit(result.id, transaction, amount, function (err) {
        if (err) {
          return res.status(500).render('error');
        } else {
          return res.send('ok');
        }
      });
    }
  });


};