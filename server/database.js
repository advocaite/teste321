var assert = require('assert');
var uuid = require('uuid');

var async = require('async');
var lib = require('./lib');
var pg = require('pg');
var passwordHash = require('password-hash');
var speakeasy = require('speakeasy');

var databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl)
    throw new Error('must set DATABASE_URL environment var');

console.log('DATABASE_URL: ', databaseUrl);

pg.types.setTypeParser(20, function(val) { // parse int8 as an integer
    return val === null ? null : parseInt(val);
});

// callback is called with (err, client, done)
function connect(callback) {
    return pg.connect(databaseUrl, callback);
}

function query(query, params, callback) {
    //third parameter is optional
    if (typeof params == 'function') {
        callback = params;
        params = [];
    }

    doIt();
    function doIt() {
        connect(function(err, client, done) {
            if (err) return callback(err);
            client.query(query, params, function(err, result) {
                done();
                if (err) {
                    if (err.code === '40P01') {
                        console.log('Warning: Retrying deadlocked transaction: ', query, params);
                        return doIt();
                    }
                    return callback(err);
                }

                callback(null, result);
            });
        });
    }
}

exports.query = query;


// runner takes (client, callback)

// callback should be called with (err, data)
// client should not be used to commit, rollback or start a new transaction

// callback takes (err, data)

function getClient(runner, callback) {
    doIt();

    function doIt() {
        connect(function (err, client, done) {
            if (err) return callback(err);

            function rollback(err) {
                client.query('ROLLBACK', done);

                if (err.code === '40P01') {
                    console.log('Warning: Retrying deadlocked transaction..');
                    return doIt();
                }

                callback(err);
            }

            client.query('BEGIN', function (err) {
                if (err)
                    return rollback(err);

                runner(client, function (err, data) {
                    if (err)
                        return rollback(err);

                    client.query('COMMIT', function (err) {
                        if (err)
                            return rollback(err);

                        done();
                        callback(null, data);
                    });
                });
            });
        });
    }


}

//Returns a sessionId
exports.createUser = function(username, password, email, callback) {
    assert(username && password);

    getClient(
        function(client, callback) {
            var hashedPassword = passwordHash.generate(password);

            client.query('SELECT COUNT(*) count FROM users WHERE lower(username) = lower($1)', [username],
                function(err, data) {
                    if (err) return callback(err);
                    assert(data.rows.length === 1);
                    if (data.rows[0].count > 0)
                        return callback('USERNAME_TAKEN');

                    client.query('INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id',
                            [username, email, hashedPassword],
                            function(err, data) {
                                if (err)  {
                                    if (err.code === '23505')
                                        return callback('USERNAME_TAKEN');
                                    else
                                        return callback(err);
                                }

                                assert(data.rows.length === 1);
                                var user = data.rows[0];

                                createSession(client, user.id, callback);
                            }
                        );

                    });
        }
    , callback);
};

exports.updateEmail = function(userId, email, callback) {
    assert(userId);

    query('UPDATE users SET email = $1 WHERE id = $2', [email, userId], function(err, res) {
        if(err) return callback(err);

        assert(res.rowCount === 1);
        callback(null);
    });

};

exports.changeUserPassword = function(userId, password, callback) {
    assert(userId && password && callback);
    var hashedPassword = passwordHash.generate(password);
    query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId], function(err, res) {
        if (err) return callback(err);
        assert(res.rowCount === 1);
        callback(null);
    });
};

exports.updateMfa = function(userId, secret, callback) {
    assert(userId);
    query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, userId], callback);
};

// Possible errors:
//   NO_USER, WRONG_PASSWORD, INVALID_OTP
exports.validateUser = function(username, password, otp, callback) {
    assert(username && password);

    query('SELECT id, password, mfa_secret FROM users WHERE lower(username) = lower($1)', [username], function (err, data) {
        if (err) return callback(err);

        if (data.rows.length === 0)
            return callback('NO_USER');

        var user = data.rows[0];

        var verified = passwordHash.verify(password, user.password);
        if (!verified)
            return callback('WRONG_PASSWORD');

        if (user.mfa_secret) {
            if (!otp) return callback('INVALID_OTP'); // really, just needs one

            var expected = speakeasy.totp({key: user.mfa_secret, encoding: 'base32'});

            if (otp !== expected)
                return callback('INVALID_OTP');
        }

        callback(null, user.id);
    });
};

exports.deleteUserSessionsBySessionId = function(sessionId, callback) {
    assert(sessionId);
    query('DELETE FROM sessions WHERE user_id = (SELECT user_id FROM sessions WHERE id = $1)', [sessionId], callback);
};

exports.deleteUserSessionsByUserId = function(userId, callback) {
    assert(userId);
    query('DELETE FROM sessions WHERE user_id = $1', [userId], callback);
};

function createSession(client, userId, callback) {
    var sessionId = uuid.v4();

    client.query('INSERT INTO sessions(id, user_id) VALUES($1, $2) RETURNING id', [sessionId, userId], function(err, res) {
        if (err) return callback(err);
        assert(res.rows.length === 1);

        var session = res.rows[0];
        assert(session.id);

        callback(null, session.id);
    });
};

exports.createOneTimeToken = function(userId, callback) {
    assert(userId);
    var id = uuid.v4();

    query('INSERT INTO sessions(id, user_id, ott) VALUES($1, $2, true) RETURNING id', [id, userId], function(err, result) {
        if (err) return callback(err);
        assert(result.rows.length === 1);

        var ott = result.rows[0];

        callback(null, ott.id);
    });
};

exports.createSession = function(userId, callback) {
    assert(userId && callback);

    getClient(function(client, callback) {
        createSession(client, userId, callback);
    }, callback);

};

exports.getUserFromUsername = function(username, callback) {
    assert(username && callback);

    query('SELECT * FROM users_view WHERE lower(username) = lower($1)', [username], function(err, data) {
        if (err) return callback(err);

        if (data.rows.length === 0)
            return callback('NO_USER');

        assert(data.rows.length === 1);
        var user = data.rows[0];
        assert(typeof user.balance_satoshis === 'number');

        callback(null, user);
    });
};

exports.addRecoverId = function(userId, callback) {
    assert(userId && callback);

    var recoveryId = uuid.v4();

    query('INSERT INTO recovery (id, user_id)  values($1, $2)', [recoveryId, userId], function(err, res) {
        if (err) return callback(err);
        callback(null, recoveryId);
    });
};

exports.getUserBySessionId = function(sessionId, callback) {
    assert(sessionId && callback);
    query('SELECT * FROM users_view WHERE id = (SELECT user_id FROM sessions WHERE id = $1 AND ott = FALSE)', [sessionId], function(err, response) {
        if (err) return callback(err);

        var data = response.rows;
        if (data.length === 0)
            return callback('NOT_VALID_SESSION');

        assert(data.length === 1);

        var user = data[0];
        assert(typeof user.balance_satoshis === 'number');

        callback(null, user);
    });
};

exports.getUserByRecoverId = function(recoverId, callback) {
    assert(recoverId && callback);
    query('SELECT * FROM users_view WHERE id = (SELECT user_id FROM recovery WHERE id = $1)', [recoverId], function(err, res) {
        if (err) return callback(err);

        var data = res.rows;
        if (data.length === 0)
            return callback('NOT_VALID_RECOVER_ID');

        assert(data.length === 1);
        return callback(null, data[0]);
    });
};

exports.changePasswordFromRecoverId = function(recoverId, password, callback) {
    assert(recoverId && password && callback);
    var hashedPassword = passwordHash.generate(password);

    query("WITH t as (DELETE FROM recovery WHERE id = $2 AND created > NOW() - interval '24 hours' RETURNING *) UPDATE users SET password = $1 where id = (SELECT user_id FROM t) RETURNING *",
        [hashedPassword, recoverId], function(err, res) {
            if (err)
                return callback(err);

            var data = res.rows;
            if (data.length === 0)
                return callback('USER_NOT_FOUND');

            assert(data.length === 1);

            callback(null, data[0]);
        }
    );
};

exports.getGame = function(gameId, callback) {
    assert(gameId && callback);

    query('SELECT * FROM games ' +
    'LEFT JOIN game_hashes ON games.id = game_hashes.game_id ' +
    'WHERE games.id = $1 AND games.ended = TRUE', [gameId], function(err, result) {
        if (err) return callback(err);
        if (result.rows.length == 0) return callback('GAME_DOES_NOT_EXISTS');
        assert(result.rows.length == 1);
        callback(null, result.rows[0]);
    });
};

exports.getGamesPlays = function(gameId, callback) {
    query('SELECT u.username, p.bet, p.cash_out, p.bonus FROM plays p, users u ' +
        ' WHERE game_id = $1 AND p.user_id = u.id ORDER by p.cash_out/p.bet::float DESC NULLS LAST, p.bet DESC', [gameId],
        function(err, result) {
            if (err) return callback(err);
            return callback(null, result.rows);
        }
    );
};

function addSatoshis(client, userId, amount, callback) {

    client.query('UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE id = $2', [amount, userId], function(err, res) {
        if (err) return callback(err);
        assert(res.rowCount === 1);
        callback(null);
    });
}

exports.getUserPlays = function(userId, limit, offset, callback) {
    assert(userId);

    query('SELECT p.bet, p.bonus, p.cash_out, p.created, p.game_id, g.game_crash FROM plays p ' +
        'LEFT JOIN (SELECT * FROM games) g ON g.id = p.game_id ' +
        'WHERE p.user_id = $1 AND g.ended = true ORDER BY p.id DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset], function(err, result) {
            if (err) return callback(err);
            callback(null, result.rows);
        }
    );
};

exports.getGiveAwaysAmount = function(userId, callback) {
    assert(userId);
    query('SELECT SUM(g.amount) FROM giveaways g where user_id = $1', [userId], function(err,result) {
        if (err) return callback(err);
        return callback(null, result.rows[0]);
    });
};

exports.addGiveaway = function(userId, callback) {
    assert(userId && callback);
    getClient(function(client, callback) {

            client.query('SELECT last_giveaway FROM users_view WHERE id = $1', [userId] , function(err, result) {
                if (err) return callback(err);

                if (!result.rows) return callback('USER_DOES_NOT_EXIST');
                assert(result.rows.length === 1);
                var lastGiveaway = result.rows[0].last_giveaway;
                var eligible = lib.isEligibleForGiveAway(lastGiveaway);

                if (typeof eligible === 'number') {
                    return callback({ message: 'NOT_ELIGIBLE', time: eligible});
                }

                var amount = 2000000; // 0.02 NXT
                client.query('INSERT INTO giveaways(user_id, amount) VALUES($1, $2) ', [userId, amount], function(err) {
                    if (err) return callback(err);

                    addSatoshis(client, userId, amount, function(err) {
                        if (err) return callback(err);

                        callback(null);
                    });
                });
            });

        }, callback
    );
};

exports.addRawGiveaway = function(userNames, amount, callback) {
    assert(userNames && amount && callback);

    getClient(function(client, callback) {

        var tasks = userNames.map(function(username) {
            return function(callback) {

                client.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username], function(err, result) {
                    if (err) return callback('unable to add bits');

                    if (result.rows.length === 0) return callback(username + ' didnt exists');

                    var userId = result.rows[0].id;
                    client.query('INSERT INTO giveaways(user_id, amount) VALUES($1, $2) ', [userId, amount], function(err, result) {
                        if (err) return callback(err);

                        assert(result.rowCount == 1);
                        addSatoshis(client, userId, amount, function(err) {
                            if (err) return callback(err);
                            callback(null);
                        });
                    });
                });
            };
        });

        async.series(tasks, function(err, ret) {
            if (err) return callback(err);
            return callback(null, ret);
        });

    }, callback);
};

exports.getUserNetProfit = function(userId, callback) {
    assert(userId);
    query('SELECT (' +
            'COALESCE(SUM(cash_out), 0) + ' +
            'COALESCE(SUM(bonus), 0) - ' +
            'COALESCE(SUM(bet), 0)) profit ' +
        'FROM plays ' +
        'WHERE user_id = $1', [userId], function(err, result) {
            if (err) return callback(err);
            assert(result.rows.length == 1);
            return callback(null, result.rows[0]);
        }
    );
};

exports.getUserNetProfitSkip = function(userId, skip, callback) {
    assert(userId);
    query('SELECT (' +
            'COALESCE(SUM(cash_out), 0) + ' +
            'COALESCE(SUM(bonus), 0) - ' +
            'COALESCE(SUM(bet), 0))::bigint profit ' +
            'FROM ( ' +
                'SELECT * FROM plays ' +
                'WHERE user_id = $1 ' +
                'ORDER BY id DESC ' +
                'OFFSET $2 ' +
            ') restricted ', [userId, skip], function(err, result) {
            if (err) return callback(err);
            assert(result.rows.length == 1);
            return callback(null, result.rows[0].profit);
        }
    );
};

exports.getPublicStats = function(username, callback) {

    query('SELECT * FROM leaderboard WHERE lower(username) = lower($1)',
        [username], function(err, result) {
            if (err) return callback(err);

            if (result.rows.length !== 1)
                return callback('USER_DOES_NOT_EXIST');

            return callback(null, result.rows[0]);
        }
    );
};

exports.insertDeposit = function (userId, transaction, amount, callback) {
  console.log('Trying to add deposit: ', userId, transaction, amount);

  assert(userId);
  assert(transaction);
  assert(amount);

  amount = Number(amount);

  getClient(function (client, callback) {
    async.parallel([
      function (callback) {
        client.query('INSERT INTO fundings(user_id, amount, bitcoin_deposit_txid, description) ' +
          "VALUES($1, $2, $3, 'Bitcoin Deposit')",
          [userId, amount, transaction], callback);
      },
      function (callback) {
        client.query("UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE id = $2",
          [amount, userId], callback);
      }], callback);
  }, function (err) {
    if (err) {
      if (err.code == '23505') {  // constraint violation
        console.log('Warning deposit constraint violation for (', userId, ',', transaction, ')');
        return callback(null);
      }
      console.log('[INTERNAL_ERROR] could not save: (', userId, ',', transaction, ') got err: ', err);
      return callback(err);
    }

    callback(null);
  });
};

exports.makeWithdrawal = function(userId, satoshis, withdrawalAddress, withdrawalId, callback) {
    assert(typeof userId === 'number');
    assert(typeof satoshis === 'number');
    assert(typeof withdrawalAddress === 'string');
    assert(satoshis > 10000);
    assert(lib.isUUIDv4(withdrawalId));

    getClient(function(client, callback) {

        client.query("UPDATE users SET balance_satoshis = balance_satoshis - $1 WHERE id = $2",
            [satoshis, userId], function(err, response) {
            if (err) return callback(err);

            if (response.rowCount !== 1)
                return callback(new Error('Unexpected withdrawal row count: \n' + response));

            client.query('INSERT INTO fundings(user_id, amount, bitcoin_withdrawal_address, withdrawal_id) ' +
                "VALUES($1, $2, $3, $4) RETURNING id",
                [userId, -1 * satoshis, withdrawalAddress, withdrawalId],
                function(err, response) {
                    if (err) return callback(err);

                    var fundingId = response.rows[0].id;
                    assert(typeof fundingId === 'number');

                    callback(null, fundingId);
                }
            );
        });

    }, callback);
};

exports.reverseWithdrawal = function(userId, satoshis, fundingId, callback) {
    getClient(function(client, callback) {

        client.query('UPDATE users SET balance_satoshis = balance_satoshis + $1 WHERE id = $2',
          [satoshis, userId], function(err, response) {
              if (err) return callback(err);

              if (response.rowCount !== 1)
                  return callback(new Error('Unexpected withdrawal row count: \n' + response));

              client.query('DELETE FROM fundings WHERE id = $1', [fundingId],
                function(err, response) {
                    if (err) return callback(err);

                    callback(null);
                }
              );
          });

    }, callback);
};

exports.getWithdrawals = function(userId, callback) {
    assert(userId && callback);

    query("SELECT * FROM fundings WHERE user_id = $1 AND amount < 0 ORDER BY created DESC", [userId], function(err, result) {
        if (err) return callback(err);

        var data = result.rows.map(function(row) {
           return {
               amount: Math.abs(row.amount),
               destination: row.bitcoin_withdrawal_address,
               status: row.bitcoin_withdrawal_txid,
               created: row.created
           };
        });
        callback(null, data);
    });
};

exports.getDeposits = function(userId, callback) {
    assert(userId && callback);

    query("SELECT * FROM fundings WHERE user_id = $1 AND amount > 0 ORDER BY created DESC", [userId], function(err, result) {
        if (err) return callback(err);

        var data = result.rows.map(function(row) {
            return {
                amount: row.amount,
                txid: row.bitcoin_deposit_txid,
                created: row.created
            };
        });
        callback(null, data);
    });
};

exports.getDepositsAmount = function(userId, callback) {
    assert(userId);
    query('SELECT SUM(f.amount) FROM fundings f WHERE user_id = $1 AND amount >= 0', [userId], function(err, result) {
        if (err) return callback(err);
        callback(null, result.rows[0]);
    });
};

exports.getWithdrawalsAmount = function(userId, callback) {
    assert(userId);
    query('SELECT SUM(f.amount) FROM fundings f WHERE user_id = $1 AND amount < 0', [userId], function(err, result) {
        if (err) return callback(err);

        callback(null, result.rows[0]);
    });
};

exports.setFundingsWithdrawalTxid = function(fundingId, txid, callback) {
    assert(typeof fundingId === 'number');
    assert(typeof txid === 'string');
    assert(callback);

    query('UPDATE fundings SET bitcoin_withdrawal_txid = $1 WHERE id = $2', [txid, fundingId],
        function(err, result) {
           if (err) return callback(err);

            assert(result.rowCount === 1);

            callback(null);
        }
    );
};

exports.getLeaderBoard = function(byDb, order, callback) {
    var sql = 'SELECT * FROM leaderboard ORDER BY ' + byDb + ' ' + order + ' LIMIT 10';
    query(sql, function(err, data) {
        if (err)
            return callback(err);
        callback(null, data.rows);
    });
};

exports.getSiteStats = function(callback) {

    function as(name, callback) {
        return function(err, results) {
            if (err)
                return callback(err);

            assert(results.rows.length === 1);
            callback(null, [name, results.rows[0]]);
        }
    }

    var tasks = [
        function(callback) {
            query('SELECT COUNT(*) FROM users', as('users', callback));
        },
        function (callback) {
            query('SELECT COUNT(*) FROM games', as('games', callback));
        },
        function(callback) {
            query('SELECT COALESCE(SUM(fundings.amount), 0)::bigint sum FROM fundings WHERE amount < 0', as('withdrawals', callback));
        },
        function(callback) {
            query("SELECT COUNT(*) FROM games WHERE ended = false AND created < NOW() - interval '5 minutes'", as('unterminated_games', callback));
        },
        function(callback) {
            query('SELECT COUNT(*) FROM fundings WHERE amount < 0 AND bitcoin_withdrawal_txid IS NULL', as('pending_withdrawals', callback));
        },
        function(callback) {
            query('SELECT COALESCE(SUM(fundings.amount), 0)::bigint sum FROM fundings WHERE amount > 0', as('deposits', callback));
        },
        function(callback) {
            query('SELECT ' +
                'COUNT(*) count, ' +
                'SUM(plays.bet)::bigint total_bet, ' +
                'SUM(plays.cash_out)::bigint cashed_out, ' +
                'SUM(plays.bonus)::bigint bonused ' +
                'FROM plays', as('plays', callback));
        }
    ];

    async.series(tasks, function(err, results) {
       if (err) return callback(err);

       var data = {};

        results.forEach(function(entry) {
           data[entry[0]] = entry[1];
        });

        callback(null, data);
    });

};
