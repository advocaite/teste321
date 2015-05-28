define(['lib/react', 'lib/clib', 'lib/lodash'], function(React, Clib, _) {
  var D = React.DOM;

  return React.createClass({
    displayName: 'usersPlaying',

    propTypes: {
      engine: React.PropTypes.object.isRequired
    },

    render: function() {
      var self = this;

      var usersWonCashed = [];
      var usersLostPlaying = [];

      var trUsersWonCashed;
      var trUsersLostPlaying;
      var trMe;

      var tHead;
      var tBody;

      var containerClass;
      var tableClass;

      //In progress: Users with cashed out are users chased
      //Ended: Users with cashed are users Won
      _.forEach(self.props.engine.playerInfo, function(value, key, collection) {
        //if(key == self.props.engine.username)
        //    return;
        if(value.stopped_at)
          usersWonCashed.push({ username: key, info: value });
        else
          usersLostPlaying.push({ username: key, info: value });
      });

      var usersWonCashedSorted = _.sortBy(usersWonCashed, function(o) {
        return o.info.stopped_at;
      }).reverse();

      var usersLostPlayingSorted = _.sortBy(usersLostPlaying, function(o) {
        return o.info.bet;
      }).reverse();

      //Users Playing and users cahed
      if(self.props.engine.gameState === 'IN_PROGRESS' || self.props.engine.gameState === 'STARTING') {

        trUsersLostPlaying = [];
        for(var i=0, length = usersLostPlayingSorted.length; i < length; i++) {

          trUsersLostPlaying.push( D.tr({ className: 'user-playing', key: 'user' + i },
            D.td(null, usersLostPlayingSorted[i].username),
            D.td(null, Clib.formatSatoshis(usersLostPlayingSorted[i].info.bet, 0)),
            D.td(null, '-'),
            D.td(null, '-')
          ));
        }

        trUsersWonCashed = [];
        for (var i=0, length = usersWonCashedSorted.length; i < length; i++) {
          var user = usersWonCashedSorted[i];
          var bet = user.info.bet;
          trUsersWonCashed.push( D.tr({ className: 'user-cashed', key: 'user' + i },
            D.td(null, user.username),
            D.td(null, Clib.formatSatoshis(bet, 0)),
            D.td(null, user.info.stopped_at/100 + 'x'),
            D.td(null, Clib.formatSatoshis(((user.info.stopped_at / 100) * bet) - bet))
          ));
        }

        tBody = D.tbody({ className: '' },
            trUsersLostPlaying,
            trUsersWonCashed
        );

        containerClass = 'players-container users-playing-container';
        tableClass = 'users-playing';

      //Users Lost and users Won
      } else if(self.props.engine.gameState === 'ENDED') {

        trUsersLostPlaying = usersLostPlayingSorted.map(function(entry, i) {
          var bonus = entry.info.bonus;
          var profit = '-' + Clib.formatSatoshis(entry.info.bet);

          if (bonus)
            profit = profit + ' (+' + Clib.formatSatoshis(bonus) + ')';

          return D.tr({ className: 'user-lost', key: 'user' + i },
            D.td(null, entry.username),
            D.td(null, Clib.formatSatoshis(entry.info.bet, 0)),
            D.td(null, '-'),
            D.td(null, profit)
          );
        });

        trUsersWonCashed = usersWonCashedSorted.map(function(entry, i) {
          var bet = entry.info.bet;
          var bonus = entry.info.bonus;
          var stopped = entry.info.stopped_at;
          var profit = Clib.formatSatoshis(bet * (stopped - 100) / 100);

          if (bonus)
            profit = profit + ' (+' + Clib.formatSatoshis(bonus) + ')';

          return D.tr(
            { className: 'user-won', key: 'user' + i },
            D.td(null, entry.username),
            D.td(null, stopped / 100, 'x'),
            D.td(null, Clib.formatSatoshis(bet, 0)),
            D.td(null, profit)
          );
        });


        tBody = D.tbody({ className: '' },
            trUsersLostPlaying,
            trUsersWonCashed
        );

        containerClass = 'players-container users-cashed-container';
        tableClass = 'users-summary';
      }

      return D.div({ className: containerClass },
        D.div({ className: 'header-bg'}),
        D.div({ className: 'table-inner'},
          D.table({ className: tableClass },
            D.thead(null,
              D.tr(null,
                D.th(null,
                  D.div({ className:'th-inner'}, 'Player')
                ),
                D.th(null,
                  D.div({ className:'th-inner'}, 'Bet')
                ),
                D.th(null,
                  D.div({ className:'th-inner'}, 'Pay')
                ),
                D.th(null,
                  D.div({ className:'th-inner'}, 'Profit')
                )
              )
            ),
            tBody
          )
        )
      );
    }

  });
});
