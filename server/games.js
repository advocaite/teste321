 var assert = require('better-assert');
 var async = require('async');
 var timeago = require('timeago');
 var database = require('./database');
 var currentWeekNumber = require('current-week-number');

 /**
  * GET
  * Public API
  * Show a single game info
  **/
exports.show = function(req, res, next) {
    var user = req.user;
    var gameId = parseInt(req.params.id);

    if (!gameId || typeof gameId !== 'number') return res.render('404');

    database.getGame(gameId, function(err, game) {
        if (err) {
            if (err === 'GAME_DOES_NOT_EXISTS')
                return res.render('404');

            return next(new Error('Unable to get game: \n' + err));
        }

        database.getGamesPlays(game.id, function(err, plays) {
            if (err)
                return next(new Error('Unable to get game information: \n' + err)); //If getGame worked this should work too

            game.timeago = timeago(game.created);
            res.render('game', { game: game, plays: plays, user: user });
        });
    });
};

 /**
  * GET
  * Public API
  * Shows the leader board
  **/
 exports.getLeaderBoard = function(req, res, next) {
     var user = req.user;
     var by = req.query.by;

     var byDb, order;
     switch(by) {
         case 'net_desc':
             byDb = 'net_profit';
             order = 'DESC';
             break;
         case 'net_asc':
             byDb = 'net_profit';
             order = 'ASC';
             break;
         case 'gross_desc':
             byDb = 'gross_profit';
             order = 'DESC';
             break;
         case 'wagered_desc':
              byDb = 'wagered';
              order = 'DESC';
              break;
         default :
             byDb = 'net_profit';
             order = 'DESC';
     }

     database.getLeaderBoard(byDb, order ,function(err, leaders) {
         if (err)
             return next(new Error('Unable to get leader board: \n' + err));

        res.render('leaderboard', {
          user: user,
          leaders: leaders,
          sortBy: byDb,
          order: order,
          week: currentWeekNumber(),
          year: new Date().getFullYear()
        });
     });
 };

 exports.getWeeklyLeaderBoard = function(req, res, next) {
     var user = req.user;
     var week = Number(req.query.week);
     var year = Number(req.query.year);

     var nextWeek = week + 1;
     var nextYear = year;
     var previousWeek = week - 1;
     var previousYear = year;

     if (nextWeek > 52) {
       nextWeek = 1;
       nextYear++;
     } else if (previousWeek < 1) {
       previousWeek = 52;
       previousYear--;
     }

     database.getWeeklyLeaderBoards(year, week, function(err, result) {
       if (err) return next(new Error('Unable to get leader board: \n' + err));

       return res.render('weekly-leaderboard', {
         user: user,
         net_leaders: result.net,
         wagered_leaders: result.wagered,
         week: week,
         year: year,
         nextWeek: nextWeek,
         nextYear: nextYear,
         previousWeek: previousWeek,
         previousYear: previousYear
       });
     });
 };
