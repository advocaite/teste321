var database = require('./database');

exports.callback = function () {
  var transaction = req.body;

  console.log(transaction);
};