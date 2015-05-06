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

setInterval(getSiteStats, 1000 * 60 * 20);
getSiteStats();

function refreshView() {

    query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;', function(err) {
        if (err) {
            console.error('[INTERNAL_ERROR] unable to refresh leaderboard got: ', err);
        } else {
            console.log('leaderboard refreshed');
        }

        setTimeout(refreshView, 10 * 60 * 1000);
    });

}
setTimeout(refreshView, 1000);

exports.index = function(req, res, next) {
    if (!stats) {
        return next('Stats are loading');
    }
    var user = req.user;

    stats.bankroll_offset = bankrollOffset;

    res.render('stats', { user: user, generated: timeago(generated), stats: stats });

};
