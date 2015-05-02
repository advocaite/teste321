var database = require('./database');

exports.callback = function (req, res) {
  console.log(req.headers);
  console.log(req.body);
  res.send('ok');
};