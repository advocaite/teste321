var database = require('./database');

exports.callback = function (req, res) {
  var secret = req.query.secret;

  if (secret !== process.env.DEPOSIT_SECRET) {
    return res.render('error');
  }

  var body = req.body;
  var transaction = body.transaction;
  var userId = body.message;
  var amount = body.amountNQT;

  database.insertDeposit(userId, transaction, amount, function (err) {
    if (err) {
      return res.render('error');
    } else {
      return res.send('ok');
    }
  });
};