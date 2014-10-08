var assert   =  require('assert');
var CBuffer  =  require('CBuffer');
var events   =  require('events');
var util     =  require('util');
var _        =  require('lodash');

var db       =  require('./database');
var lib      =  require('./lib');

function Chat() {
    var self = this;

    self.chatTable = new CBuffer(40);

    /*
      Collection of muted users.
        key:   Username
        value: Object with the following fields
                  time:       Date object when the user was muted
                  moderator:  The username of the moderator that muted the user
                  timespec:   Initial (nominal diff) time the user has been muted
                  end:        Until when the user is muted
                  shadow:     If the mute is a shadow mute
    */
    self.muted = {};

    events.EventEmitter.call(self);
}

util.inherits(Chat, events.EventEmitter);

Chat.prototype.getHistory = function () {
    return this.chatTable.toArray();
}

Chat.prototype.say = function(socket, userInfo, message) {
    var self = this;
    var now = new Date();

    var msg = {
        time:      now,
        type:      'say',
        username:  userInfo.username,
        role:      userInfo.userclass,
        message:   message
    };

    if (lib.hasOwnProperty(self.muted, userInfo.username)) {
        var muted = self.muted[userInfo.username];
        if (muted.end < now) {
            // User has been muted before, but enough time has passed.
            delete self.muted[userInfo.username];
        } else if (muted.shadow) {
            // User is shadow muted. Echo the message back to the
            // user but don't broadcast.
            socket.emit('msg', msg);
            return;
        } else {
            // Inform the user that he is still muted.
            socket.emit('msg',
                        { time: now,
                          type: 'info',
                          message: 'You\'re muted. ' +
                            lib.printTimeString(muted.end - now) +
                            ' remaining'
                        });
            return;
        }
    }

    self.chatTable.push(msg);
    self.emit('msg', msg);
}

Chat.prototype.mute = function(shadow, moderatorInfo, username, time, callback) {
    var self = this;
    var now = new Date();
    var ms  = lib.parseTimeString(time);
    var end = new Date(Date.now() + ms);

    // Query the db to make sure that the username exists.
    db.getUserByName(username, function(err, userInfo) {

        if (err) {
            callback(err);
            return;
        }

        // Overriding previous mutes.
        self.muted[username] =
            { time:        now,
              moderator:   moderatorInfo.username,
              timespec:    time,
              end:         end,
              shadow:      shadow
            };

        if (!shadow) {
            var msg = {
                time:        now,
                type:        'mute',
                moderator:   moderatorInfo.username,
                username:    username,
                timespec:    time
            };

            self.emit('msg', msg);
        }
        callback(null);
    });
}

Chat.prototype.unmute = function(moderatorInfo, username) {
    var self = this;
    var now = new Date();

    if (!lib.hasOwnProperty(self.muted, username))
        return 'USER_NOT_MUTED';

    delete self.muted[username];

    var msg = {
        time:      now,
        type:      'unmute',
        moderator: moderatorInfo.username,
        username:  username
    };

    self.emit('msg', msg);
}

Chat.prototype.listmuted = function () {
    return self.muted
}

module.exports = Chat;
