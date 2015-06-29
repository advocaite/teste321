define(['lib/key-mirror'], function(KeyMirror){

    var host = '';

    if (window.document.location.host.indexOf('btc.tothemoon.me') !== -1 || window.document.location.host.indexOf('tothemoon.me') !== -1)  {
        host = 'https://btc.tothemoon.me/game';
    } else {
        host = window.location.hostname + ':3842';
    }

    return {

        ActionTypes: KeyMirror({

            //Game Actions
            PLACE_BET: null,
            PLACE_BET_SUCCESS: null,
            PLACE_BET_ERROR: null,
            CANCEL_BET: null,
            CASH_OUT: null,
            SAY_CHAT: null,

            //Strategy Actions
            RUN_STRATEGY: null,
            STOP_SCRIPT: null,
            UPDATE_SCRIPT: null,
            SELECT_STRATEGY: null,
            SET_WIDGET_STATE: null,

            //Tab Selector
            SELECT_TAB: null,

            //Controls
            SET_BET_SIZE: null,
            SET_AUTO_CASH_OUT: null,

            //Chat
            SET_CHAT_INPUT_TEXT: null,
            SET_CHAT_HEIGHT: null
        }),

        PayloadSources: KeyMirror({
            VIEW_ACTION: null
        }),


        Engine: {
            CURRENCY: 'Bits',
            DIVIDER: 100, // divide satoshis by 100
            STOP_PREDICTING_LAPSE: 300,
            HOST: host,
            MAX_BET: 1000000 * 100 /** Max bet per game 1,000,000 Bits, this will be calculated dynamically in the future, based on the invested amount in the casino **/
        },

        BetButton: {
            INITIAL_DISABLE_TIME: 500 //The time the button is disabled after cashing out and after the game crashes
        },

        Chat: {
            MAX_LENGTH: 500
        }

    };

});
