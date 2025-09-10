/**
 *   Allows a Shelly i4 to control both channels of a Pro 2PM dimmer.
 *   Left buttons are dim up down for channel 1
 *   Right buttons are dim up/down for channel 2
 *
 *   Please ensure the Pro 2PM is updated to the latest firmware version.
 */

// IP Address of the dimmer to be controlled.
let dimmer = '192.168.44.219';

// Dimming up/down fade rate, 1 = slowest, 5 = fastest.
let fadeRate = 4;

// Change this to true to log events in the console.
let DEBUG = false;

// ------------------------------------------------
// The values below this should not be edited
// ------------------------------------------------

// Are we currently dimming a channel
let dimming = false;

/**
 * Toggles the selected light on or off, when turning on returns to the last brightness set.
 */
let toggle = function (channelNumber) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmer + '/rpc/Light.Toggle?id=' + channelNumber
        }
    );
}

/**
 * Turns on the selected light at its last brightness level.
 */
let turnOn = function (channelNumber) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmer + '/rpc/Light.Set?id=' + channelNumber + '&on=true'
        }
    );
}

/**
 * Dim the selected light down to 0% unless stopped by releasing the button.
 */
let dimLight = function (method, channelNumber) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmer + '/rpc/Light.' + method + '?id=' + channelNumber + '&fade_rate=' + fadeRate
        }
    );
}

/**
 * Stops the current dimming up or down.
 */
let stopDimming = function (channelNumber) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmer + '/rpc/Light.DimStop?id=' + channelNumber
        }
    );
}

// add an evenHandler for button type input and various push events
Shelly.addEventHandler(

    function (event) {

        if (typeof event.info.event !== 'undefined') {

            // Check if this was the button we're listing to
            let i = event.info.id;
            let channel = i < 2 ? 0 : 1

            switch (event.info.event) {

                // On single push, toggle the light on or off
                case 'single_push':
                    log('toggling light ' + channel)
                    toggle(channel);
                    break;

                // When the button is held down, sweep the brightness of the light up and down
                case 'long_push':
                    dimming = true
                    if (i == 1 || i == 2) {
                        log('dimming down ' + channel)
                        dimLight('DimDown', channel)
                    } else {
                        log('dimming up ' + channel)
                        dimLight('DimUp', channel);
                    }
                    break;

                // When the button is released, stop the dimming at the current level
                case 'btn_up':
                    if (!dimming) return;
                    dimming = false;
                    log('long press ended - stopping dimming for ' + channel)
                    stopDimming(channel);
                    break;

            }

            return true;

        }

        return true;

    }

);

const log = function(message) {
    if (!DEBUG) return;
    console.log(message);
}