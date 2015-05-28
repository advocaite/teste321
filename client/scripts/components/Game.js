/**
 * This view acts as a wrapper for all the other views in the game
 * it is subscribed to changes in EngineVirtualStore but it only
 * listen to connection changes so every view should subscribe to
 * EngineVirtualStore independently.
 */
define([
    'lib/react',
    'components/Chart',
    'components/Controls',
    'components/TabsSelector',
    'components/Players',
    'components/BetBar',
    'components/Chat',
    'components/Rocket',
    'game-logic/engine'
], function(
    React,
    ChartClass,
    ControlsClass,
    TabsSelectorClass,
    PlayersClass,
    BetBarClass,
    Chat,
    RocketClass,
    Engine
){
    var D = React.DOM;

    var Rocket = React.createFactory(RocketClass);
    var Chart = React.createFactory(ChartClass);
    var Controls  = React.createFactory(ControlsClass);
    var TabsSelector = React.createFactory(TabsSelectorClass);
    var Players = React.createFactory(PlayersClass);
    var BetBar = React.createFactory(BetBarClass);

    return React.createClass( {
      displayName: 'Game',

      getInitialState: function () {
        return {
          isConnected: Engine.isConnected
        }
      },

      propTypes: {
        engine: React.PropTypes.object.isRequired
      },

      componentDidMount: function() {
        Engine.on({
          'connected': this._onChange,
          'disconnected': this._onChange
        });
      },

      componentWillUnmount: function() {
        Engine.off({
          'connected': this._onChange,
          'disconnected': this._onChange
        });
      },

      _onChange: function() {
          if(this.state.isConnected != Engine.isConnected)
              this.setState({ isConnected: Engine.isConnected });
      },

      render: function() {
        console.log(this.props.engine);
        if (!this.state.isConnected) {
          return D.div(({className: 'loading'}), 'Connecting to server..');
        }

        var divArgs = [{id: "rocket", className: 'rocket' }, D.div({ className: 'ship' }), D.div({ className: 'rocket-flame' })]
        for (i = 0; i < 100; i++){
          divArgs.push(D.div({ className: 'explosion-particle' }));
        }
        return D.div({ className: 'inner-wrapper' },
          D.div({ className: 'col-left' },
            D.div({ className: 'rocket-outer' },
              D.div({ className: 'rocket-inner' },
                D.div.apply(null, divArgs),
                D.div({id: "game-multiplier", className: 'multiplier'})
              )
            ),
            Rocket({ engine: this.props.engine }),
            Controls({ engine: this.props.engine })
          ),
          D.div({ className: 'col-right' },
            D.div({ className: 'players' },
              Players({ engine: this.props.engine })
            ),
            D.div({ className: 'log-chat' },
              TabsSelector({ engine: this.props.engine })
            )
          )
        )
      }
    });

});
