var database = require('./database');
var timeago = require('timeago');

var stats;
var generated;
var bankrollOffset = parseInt(process.env.BANKROLL * Math.pow(10,8)) || 1000000; // 1M NXT

function getSiteStats() {
    database.getSiteStats(function(err, results) {
        if (err) {
            console.error('[INTERNAL_ERROR] Unable to get site stats: \n' + err);
            return;
        }

        stats = results;
        generated = new Date();
    });
}

setInterval(getSiteStats, 1000 * 60 * 5);
getSiteStats();

exports.stats = function(req, res, next) {
    if (!stats) {
        return next('Stats are loading');
    }
    var user = req.user;

    stats.bankroll_offset = bankrollOffset;

    res.render('stats', { user: user, generated: timeago(generated), stats: stats });

};

exports.index = function(req, res, next) {
    if (!stats) {
        return next('Stats are loading');
    }
    var user = req.user;

    stats.bankroll_offset = bankrollOffset;

    res.render('index', { user: user, generated: timeago(generated), stats: stats });

};
