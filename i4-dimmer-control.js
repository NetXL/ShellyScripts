/**
 * This script allows a Shelly Pro Dimmer 2 to be controlled using the Shelly Wall Switch or any retractive switch
 * via a Shelly i4 controller
 *
 * - Single press toggles the light on or off to its last brightness
 * - Double press sets the light to 100% brightness
 * - Holding the button will sweep the brightness up and down between maximum and minimum brightnesses
 */

// IP Address of the dimmer to be controlled.
let i4DimmerControl = '192.168.x.x'

// Channel number of the light to control (0 or 1).
let channelNumber = 1;

// Wait in milliseconds before dimming up or down at either end of the light fade
let fadeWaitInterval = 1000;

// Dimming up/down fade rate, 1 = slowest, 5 = fastest.
let fadeRate = 5;

// i4 SW input number to respond to switch presses for, SW1 = 0, SW2 = 1, SW3 = 2, SW4 = 3
let targetSwitch = 0;

// Change this to true to log events in the console.
let DEBUG = false;

// ------------------------------------------------
// The values below this should not be edited
// ------------------------------------------------

// Tracks the last action from the button, used to help stop dimming.
let lastAction = null;

// The current brightness level of the tracked light.
let currentBrightness = 0;

// Timer objects that control the sweep up and down of the brightness when the button is held.
let sweepTimer = null;
let sweepInterval = 1000; // check the brightness every 1 second
let swapTriggered = false;
let swapTimer = null;

let blockDimming = false;

/**
 * Toggles the selected light on or off, when turning on returns to the last brightness set.
 */
let toggle = function () {
    Shelly.call(
        "http.get", {
            url: 'http://' + i4DimmerControl + '/rpc/Light.Toggle?id=' + channelNumber
        }
    );
}

/**
 * Turns on the selected light and sets it to maximum brightness.
 */
let maxBrightness = function () {
    Shelly.call(
        "http.get", {
            url: 'http://' + i4DimmerControl + '/rpc/Light.Set?id=' + channelNumber + '&on=true&brightness=100'
        }
    );
}

/**
 * Turns on the selected light at its last brightness level.
 */
let turnOn = function () {
    Shelly.call(
        "http.get", {
            url: 'http://' + i4DimmerControl + '/rpc/Light.Set?id=' + channelNumber + '&on=true'
        }
    );
}

/**
 * Dim the selected light down to 0% unless stopped by releasing the button.
 */
let dimLight = function (method) {
    swapTriggered = false; // reset the swap flag for the sweep timer.
    Shelly.call(
        "http.get", {
            url: 'http://' + i4DimmerControl + '/rpc/Light.' + method + '?id=' + channelNumber + '&fade_rate=' + fadeRate
        }
    );
}

/**
 * Stops the current dimming up or down.
 */
let stopDimming = function () {
    Shelly.call(
        "http.get", {
            url: 'http://' + i4DimmerControl + '/rpc/Light.DimStop?id=' + channelNumber
        }
    );
}

/**
 * Get the current status of the selected light, calls the callback function with the current brightness
 * @param callback function to call once the dimmer responds with its current status
 */
let getStatus = function (callback) {
    Shelly.call(
        "http.get", {
            url: 'http://' + i4DimmerControl + '/rpc/Light.GetStatus?id=' + channelNumber
        },
        function (response, errorCode, errorMessage) {
            // Don't proceed if we have an error code
            if (errorCode !== 0) return;
            // Parse the response from the dimmer
            let dimmerResponse = JSON.parse(response.body);
            // Get the current brightness and call the callback function
            currentBrightness = dimmerResponse.brightness;
            callback(currentBrightness);
        }
    );
}

/**
 * Sweep the brightness of the dimmer up and down while the button is held down
 */
let dimmerSweep = function () {

    // Start a timer that runs every 750ms and checks the current brightness
    sweepTimer = Timer.set(sweepInterval, true, function () {

        // If we're waiting to toggle the status, don't bother checking the light
        if (swapTriggered) return;

        log('checking current light status');

        // Get the current status of the light
        getStatus(function (currentBrightness) {

            log('current brightness is ' + currentBrightness);

            // If the brightness is at max, wait 1 second and dim the light down
            if (currentBrightness === 100) {
                swapTriggered = true;
                log('dimming the light back down in 1 second');
                swapTimer = Timer.set(fadeWaitInterval, false, function () {
                    dimLight('DimDown');
                });
            // If the brightness is at minimum, wait 1 second and dim the light up
            } else if (currentBrightness === 1) {
                swapTriggered = true;
                log('dimming the light back up in 1 second');
                swapTimer = Timer.set(fadeWaitInterval, false, function () {
                    dimLight('DimUp');
                });
            }

        });

    });

}

// add an evenHandler for button type input and various push events
Shelly.addEventHandler(

    function (event) {

        if (typeof event.info.event !== 'undefined') {

            // Check if this was the button we're listing to
            let i = event.info.id;
            if (i !== targetSwitch) return;

            switch (event.info.event) {

                // On single push, toggle the light on or off
                case 'single_push':
                    log('toggling light ' + channelNumber)
                    toggle();
                    Timer.clear(swapTimer);
                    Timer.clear(sweepTimer);
                    break;

                // On double push, set the light to 100% brightness
                case 'double_push':
                    log('setting light ' + channelNumber + ' to max brightness')
                    maxBrightness();
                    break;

                // When the button is held down, sweep the brightness of the light up and down
                case 'long_push':
                    blockDimming = false;
                    turnOn();
                    log('starting dimmer sweep for light ' + channelNumber);
                    getStatus(function (currentBrightness) {
                        if (blockDimming) return;
                        if (currentBrightness > 50) {
                            dimLight('DimDown');
                        } else {
                            dimLight('DimUp');
                        }
                        dimmerSweep();
                    })
                    break;

                // When the button is released, stop the dimming at the current level
                case 'btn_up':
                    blockDimming = true;
                    if (lastAction !== 'long_push') break;
                    log('long press ended - stopping dimming and cancelling timers')
                    stopDimming();
                    Timer.clear(swapTimer);
                    Timer.clear(sweepTimer);
                    break;

            }

            lastAction = event.info.event;
            return true;

        }

        return true;

    }

);

const log = function(message) {
    if (!DEBUG) return;
    console.log(message);
}
