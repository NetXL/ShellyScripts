/**
 * Automatically turns off the colour channels when white is selected, and also turns off the white channel when colours are selected
 */

let lastWhite = 0;
let lastRGB = [0, 0, 0];

function enforceExclusivity() {
    Shelly.call("RGBW.GetStatus", {id: 0}, function (res, err) {
        if (err) {
            print("Error:", JSON.stringify(err));
            return;
        }

        let rgb = res.rgb;
        let white = res.white;
        let brightness = res.brightness;

        let rgbOn = rgb[0] > 0 || rgb[1] > 0 || rgb[2] > 0;

        // Change detection
        let whiteChanged = white !== lastWhite;
        let rgbChanged = rgb[0] !== lastRGB[0] || rgb[1] !== lastRGB[1] || rgb[2] !== lastRGB[2];

        // Case: White turned on → turn off RGB and set brightness to 0
        if (whiteChanged && white > 0) {
            Shelly.call("RGBW.Set", {
                id: 0,
                white: white,
                rgb: [0, 0, 0],
                brightness: 0
            });
        }

        // Case: RGB turned on → turn off White, restore RGB brightness
        if (rgbChanged && rgbOn && white > 0) {
            Shelly.call("RGBW.Set", {
                id: 0,
                rgb: rgb,
                brightness: brightness || 100,  // fallback if zero
                white: 0
            });
        }

        // Save state
        lastWhite = white;
        lastRGB = rgb;
    });
}

Timer.set(300, true, enforceExclusivity);