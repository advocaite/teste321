define(['lib/key-mirror'], function(KeyMirror){

    var host = '';

    if(window.document.location.host === 'www.nxtbubble.com' || window.document.location.host === 'nxtbubble.com') {
        host = 'https://game.nxtbubble.com';
    } else {
        host = window.document.location.host.replace(/:3841$/, ':3842');
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
            STOP_PREDICTING_LAPSE: 300,
            HOST: host,
            MAX_BET: 100000 * Math.pow(10,8) /** Max bet per game 100,000 NXT, this will be calculated dynamically in the future, based on the invested amount in the casino **/
        },

        BetButton: {
            INITIAL_DISABLE_TIME: 500 //The time the button is disabled after cashing out and after the game crashes
        },

        Chat: {
            MAX_LENGTH: 500
        }

    }

});
