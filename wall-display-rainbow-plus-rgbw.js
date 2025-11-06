/**
 * Allows a virtual button component to be placed on a Wall Display that is used to toggle the rainbow mode
 * of a Plus RGBW PM on and off, on the Wall Display add a button component and then add an action that calls
 * an external URL in the following format:
 *
 * http://<Plus RGBW PM IP address>/rpc/Input.SetConfig?id=0&config={"name": "rainbow"}
 *
 */

// This is the time in seconds between each colour change
let cycleInterval = 5;

// Set the overall brightness, between 0 and 100%
let brightness = 100;

// Set the White channel brightness, between 0 and 255
let whiteBrightness = 50;

// List of colours to cycle through
let colours = [
    [255, 0, 0], // Red
    [0, 255, 0], // Green
    [0, 0, 255]  // Blue
];

// --------------------------------------------------------------------
// It is not normally be required to modify anything below this comment
// --------------------------------------------------------------------

// The name of Input0 to revert it to after the rainbow toggle
let currentInputName = "";

// Are we currently running the rainbow
let active = false;

// Colour counter
let counter = 0;

// The timer that controls the colour switching
let timer;

// Get the current name assigned to the Input 0
Shelly.call("Input.GetConfig", {
    "id": 0
}, function (response) {

    // Save the current name so we can rename the input after each rainbow event.
    currentInputName = response.name;

    // If the current name is rainbow, this script won't work.
    if (currentInputName === 'rainbow') {
        Shelly.call("Input.SetConfig", {
            "id": 0,
            "config": {
                "name": "Input0"
            }
        }, function () {
            currentInputName = "Input0";
        });
    }

    Shelly.addEventHandler(function (event) {

        // Ignore events that aren't a name change
        if (event.info.event !== "config_changed") return;

        Shelly.call("Input.GetConfig", {
            "id": 0
        }, function (response) {

            // Ignore other names
            if (response.name !== 'rainbow') {
                return
            }

            if (active) {
                Timer.clear(timer);
                Shelly.call("RGBW.Set", {
                    id: 0, on: false
                });
            } else {
                start();
            }

            // Flip the active flag
            active = !active;

            // Set the Input name back to it's original from "rainbow"
            Shelly.call("Input.SetConfig", {
                "id": 0,
                "config": {
                    "name": currentInputName
                }
            });

        });

    })

});

function start() {
    Shelly.call("RGBW.Set", {
        id: 0, on: true, rgb: colours[counter], white: whiteBrightness, brightness: brightness
    });
    timer = Timer.set(cycleInterval * 1000, true, function () {
        counter++;
        if (counter == colours.length) counter = 0;
        Shelly.call("RGBW.Set", {
            id: 0, on: true, rgb: colours[counter], white: whiteBrightness, brightness: brightness
        });
    });
}