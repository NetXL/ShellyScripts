/**
 * Shelly Pro RGBWW PM — profile: rgbx2light
 * Controls: RGB (RGB.Set id:0) + 2x White single-channel lights (Light.Set id:0 and id:1)
 * Notes:
 * - RGB color values are 0–100 per docs; brightness is 0–100
 * - transition is in milliseconds
 */

// ===== user settings =====
let cycleIntervalSec = 3;      // seconds between color changes
let rgbBrightness    = 100;    // 0–100
let transitionMs     = 1500;   // fade time

// Fixed brightness for the two extra single-channel lights (change to taste)
let white0Brightness = 60;     // Light id:0  (0–100)
let white1Brightness = 60;     // Light id:1  (0–100)

// Colors to cycle through (0–100 each: [R, G, B])
let colours = [
    [255, 0,   0  ], // red
    [255, 127, 0 ], // orange
    [255, 255, 0  ], // yellow
    [127, 255, 0 ], // chartreuse
    [0,   255, 0  ], // green
    [0, 255, 127 ], // spring
    [0,   255, 255], // cyan
    [0, 255, 255], // azure
    [0,   0,   255], // blue
    [127, 0, 255], // violet
    [255, 0,   255],  // magenta
    [255, 0, 127], // rose
];

// ===== helpers =====
function setRGB(r, g, b) {
    Shelly.call("RGB.Set", {
        id: 0,             // the single RGB component
        on: true,
        rgb: [r, g, b],    // 0–100 each
        brightness: rgbBrightness, // 0–100
        transition: transitionMs
    });
}

function setWhiteLights(b0, b1) {
    // two independent single-channel Light components
    Shelly.call("Light.Set", { id: 0, on: b0 > 0, brightness: b0, transition: transitionMs });
    Shelly.call("Light.Set", { id: 1, on: b1 > 0, brightness: b1, transition: transitionMs });
}

// ===== init =====
setWhiteLights(white0Brightness, white1Brightness);

let idx = 0;
setRGB(colours[idx][0], colours[idx][1], colours[idx][2]);

Timer.set(cycleIntervalSec * 1000, true, function () {
    idx = (idx + 1) % colours.length;
    let c = colours[idx];
    setRGB(c[0], c[1], c[2]);
});