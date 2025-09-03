/**
 * This script allows multiple Shelly Dimmer Gen3 to be controlled using the Shelly Wall Switch or any retractive switch
 * via a Shelly i4 controller
 *
 * - Single press toggles the light on or off to its last brightness
 * - Double press sets the light to 100% brightness
 * - Holding the button will sweep the brightness up and down between maximum and minimum brightnesses
 */

// Dimmers to be controlled, the number 0-3 is the i4 switch number
let dimmers = {
    0: {
        'ip': '192.168.123.119',
        'channel': 0,  // Channel number of the light to control (0 or 1).
        'interval': 1000, // Wait in milliseconds before dimming up or down at either end of the light fade
        'rate': 3 // Dimming up/down fade rate, 1 = slowest, 5 = fastest.
    },
    1: {
        'ip': '0.0.0.0',
        'channel': 0,
        'interval': 1000,
        'rate': 3
    },
    2: {
        'ip': '0.0.0.0',
        'channel': 0,
        'interval': 1000,
        'rate': 3
    },
    3: {
        'ip': '0.0.0.0',
        'channel': 0,
        'interval': 1000,
        'rate': 3
    }
}

// Change this to true to log events in the console.
let DEBUG = false;

// ------------------------------------------------
// The values below this should not be edited
// ------------------------------------------------
let tracking = {
    0: {
        'lastAction': null,
        'currentBrightness': 0,
        'sweepTimer': null,
        'sweepInterval': 1000,
        'swapTriggered': false,
        'swapTimer': null,
        'blockDimming': false
    },
    1: {
        'lastAction': null,
        'currentBrightness': 0,
        'sweepTimer': null,
        'sweepInterval': 1000,
        'swapTriggered': false,
        'swapTimer': null,
        'blockDimming': false
    },
    2: {
        'lastAction': null,
        'currentBrightness': 0,
        'sweepTimer': null,
        'sweepInterval': 1000,
        'swapTriggered': false,
        'swapTimer': null,
        'blockDimming': false
    },
    3: {
        'lastAction': null,
        'currentBrightness': 0,
        'sweepTimer': null,
        'sweepInterval': 1000,
        'swapTriggered': false,
        'swapTimer': null,
        'blockDimming': false
    }
}

/**
 * Toggles the selected light on or off, when turning on returns to the last brightness set.
 */
let toggle = function (index) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmers[index].ip + '/rpc/Light.Toggle?id=' + dimmers[index].channel
        }
    );
}

/**
 * Turns on the selected light and sets it to maximum brightness.
 */
let maxBrightness = function (index) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmers[index].ip + '/rpc/Light.Set?id=' + dimmers[index].channel + '&on=true&brightness=100'
        }
    );
}

/**
 * Turns on the selected light at its last brightness level.
 */
let turnOn = function (index) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmers[index].ip + '/rpc/Light.Set?id=' + dimmers[index].channel + '&on=true'
        }
    );
}

/**
 * Dim the selected light down to 0% unless stopped by releasing the button.
 */
let dimLight = function (method, index) {
    tracking[index]['swapTriggered'] = false; // reset the swap flag for the sweep timer.
    let dimmer = dimmers[index].ip;
    let channelNumber = dimmers[index].channel;
    let fadeRate = dimmers[index].rate
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmer + '/rpc/Light.' + method + '?id=' + channelNumber + '&fade_rate=' + fadeRate
        }
    );
}

/**
 * Stops the current dimming up or down.
 */
let stopDimming = function (index) {
    log('calling DimStop for ' + dimmers[index].ip)
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmers[index].ip + '/rpc/Light.DimStop?id=' + dimmers[index].channel
        }
    );
}

/**
 * Get the current status of the selected light, calls the callback function with the current brightness
 * @param callback function to call once the dimmer responds with its current status
 * @param index
 */
let getStatus = function (callback, index) {
    Shelly.call(
        "http.get", {
            url: 'http://' + dimmers[index].ip + '/rpc/Light.GetStatus?id=' + dimmers[index].channel
        },
        function (response, errorCode, errorMessage) {
            // Don't proceed if we have an error code
            if (errorCode !== 0) return;
            // Parse the response from the dimmer
            let dimmerResponse = JSON.parse(response.body);
            // Get the current brightness and call the callback function
            tracking[index]['currentBrightness'] = dimmerResponse.brightness;
            callback(tracking[index]['currentBrightness'], index);
        }
    );
}

/**
 * Sweep the brightness of the dimmer up and down while the button is held down
 */
let dimmerSweep = function (index) {

    // Start a timer that runs every 750ms and checks the current brightness
    tracking[index]['sweepTimer'] = Timer.set(tracking[index]['sweepInterval'], true, function () {

        // If we're waiting to toggle the status, don't bother checking the light
        if (tracking[index]['swapTriggered']) return;

        log('checking current light status');

        // Get the current status of the light
        getStatus(function (currentBrightness, index) {

            log(index + ' current brightness is ' + currentBrightness);

            // If the brightness is at max, wait 1 second and dim the light down
            if (currentBrightness === 100) {
                tracking[index]['swapTriggered'] = true;
                log('dimming the light back down in 1 second');
                tracking[index]['swapTimer'] = Timer.set(tracking[index]['fadeWaitInterval'], false, function () {
                    dimLight('DimDown', index);
                });
                // If the brightness is at minimum, wait 1 second and dim the light up
            } else if (currentBrightness === 1) {
                tracking[index]['swapTriggered'] = true;
                log('dimming the light back up in 1 second');
                tracking[index]['swapTimer'] = Timer.set(tracking[index]['fadeWaitInterval'], false, function () {
                    dimLight('DimUp', index);
                });
            }

        }, index);

    });

}

// add an evenHandler for button type input and various push events
Shelly.addEventHandler(
    function (event) {

        if (typeof event.info.event !== 'undefined') {

            // Check if this was the button we're listing to
            let i = event.info.id;
            if (i > dimmers.length) return;

            let switchConfiguration = dimmers[i]
            if (switchConfiguration === undefined) return;

            dimmer = switchConfiguration.ip
            channelNumber = switchConfiguration.channel

            switch (event.info.event) {

                // On single push, toggle the light on or off
                case 'single_push':
                    log('toggling light ' + channelNumber)
                    clearTimers(i)
                    toggle(i);
                    break;

                // On double push, set the light to 100% brightness
                case 'double_push':
                    log('setting light ' + channelNumber + ' to max brightness')
                    maxBrightness(i);
                    break;

                // When the button is held down, sweep the brightness of the light up and down
                case 'long_push':
                    tracking[i]['blockDimming'] = false;
                    clearTimers(i);
                    turnOn(i);
                    log('starting dimmer sweep for light ' + channelNumber);
                    getStatus(function (currentBrightness, index) {
                        if (tracking[index]['blockDimming']) return;
                        if (currentBrightness > 50) {
                            dimLight('DimDown', index);
                        } else {
                            dimLight('DimUp', index);
                        }
                        dimmerSweep(index);
                    }, i)
                    break;

                // When the button is released, stop the dimming at the current level
                case 'btn_up':
                    tracking[i]['blockDimming'] = true;
                    if (tracking[i]['lastAction'] !== 'long_push') break;
                    log('long press ended - stopping dimming and cancelling timers')
                    stopDimming(i);
                    clearTimers(i);
                    break;

            }

            tracking[i]['lastAction'] = event.info.event;
            return true;

        }

        return true;

    }
);

const clearTimers = function (index) {
    Timer.clear(tracking[index]['swapTimer']);
    Timer.clear(tracking[index]['sweepTimer']);
}

const log = function (message) {
    if (!DEBUG) return;
    console.log(message);
}