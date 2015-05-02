var database = require('./database');

exports.callback = function (req, res) {
  var transaction = req.body;

  console.log(transaction);
  res.send('ok');
};