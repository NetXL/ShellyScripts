/**
 * Cycles an RGBW through a set of colours defined below, by default the colour list
 * is Red > Green > Blue and then back to Red, additional colours can be added into the
 * list below in the format [red, green, blue]
 */

// This is the time in seconds between each colour change
let cycleInterval = 5;

// Set the overall brightness, between 0 and 100%
let brightness = 100;

// Set the White channel brightness, between 0 and 255
let whiteBrightness = 50;

// List of colours to cycle through
let colours = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255]
];

let counter = 0;

Timer.set(cycleInterval * 1000, true, function () {
    counter++;
    if (counter == colours.length) counter = 0;
    Shelly.call(
        "RGBW.Set", {
            id: 0,
            on: true,
            rgb: colours[counter],
            white: whiteBrightness,
            brightness: brightness
        }
    );
});