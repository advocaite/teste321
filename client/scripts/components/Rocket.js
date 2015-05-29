define(['lib/react', 'lib/clib'],

    function(React, Clib) {
        var D = React.DOM;

        return React.createClass({
            displayName: 'Rocket',

            propType: {
                engine: React.PropTypes.object.isRequired
            },

            componentWillMount: function() {
            },

            componentWillUnmount: function() {
                this.mounted = false;
            },

            componentDidMount: function() {
                this.mounted = true;
                this.animRequest = window.requestAnimationFrame(this.draw);
            },

            draw: function() {
                if(this.mounted) {
                    this.setData(this.props.engine);
                    this.clean();
                    this.drawRocket();
                    this.drawGameData();

                    this.animRequest = window.requestAnimationFrame(this.draw);
                }
            },

            setData: function(engine) {
                this.engine = engine;
                this.gameState = engine.gameState;
                this.userState = engine.userState;

                this.cashingOut = engine.cashingOut;

                this.lag = engine.lag;

                this.startTime = engine.startTime;

                if(this.gameState == 'IN_PROGRESS') {
                    this.lastBalance = engine.getGamePayout(); //Payout in percentage
                    this.currentTime = engine.getElapsedTime();
                } else {
                    this.lastBalance = 0;
                    this.currentTime = 0;
                }
            },

            clean: function() {

            },

            drawRocket: function() {

            },

            drawGameData: function() {
              var lastGameCrashedAt = this.engine.tableHistory[0].game_crash

                if(this.engine.gameState === 'IN_PROGRESS') {
                    document.getElementById("game-multiplier").innerHTML = parseFloat(this.lastBalance).toFixed(2) + 'x';
                    if (document.getElementById("space-wrap").className.indexOf("waiting") !== -1) {
                        document.getElementById("space-wrap").className = document.getElementById("space-wrap").className.replace(" waiting", "");
                    }
                    if (document.getElementById("space-wrap").className.indexOf("flying") === -1) {
                        document.getElementById("space-wrap").className += " flying";
                    }
                } else {
                    if (document.getElementById("space-wrap").className.indexOf("flying") !== -1) {
                        document.getElementById("space-wrap").className = document.getElementById("space-wrap").className.replace(" flying", "");
                    }
                    if (document.getElementById("space-wrap").className.indexOf("waiting") === -1) {
                        document.getElementById("space-wrap").className += " waiting";
                    }
                }

                //If the engine enters in the room @ ENDED it doesnt have the crash value, so we dont display it
                if(this.engine.gameState === 'ENDED' && lastGameCrashedAt) {
                    var html = 'Rocket exploded' + '<br>' + 'at ' + lastGameCrashedAt / 100 + 'x';
                    document.getElementById("game-multiplier").innerHTML = html;
                    if (document.getElementById("rocket").className.indexOf("crash") === -1) {
                        document.getElementById("rocket").className += " crash";
                        document.getElementById("rocket").className = document.getElementById("rocket").className.replace(" launch", "");
                    }
                } else {
                    if (this.engine.gameState === 'IN_PROGRESS' && document.getElementById("rocket").className.indexOf("crash") !== -1) {
                        document.getElementById("rocket").className = document.getElementById("rocket").className.replace(" crash", "");
                    }
                    if (this.engine.gameState === 'IN_PROGRESS' && document.getElementById("rocket").className.indexOf("launch") === -1) {
                        document.getElementById("rocket").className += " launch";
                    }
                }

            },

            render: function() {
                return D.div();
            }

        });

    }
)
