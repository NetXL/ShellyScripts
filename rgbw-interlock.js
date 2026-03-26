/**
 * Shelly Pro RGBWW PM — enforce exclusivity between RGB and white channels
 *
 * Behaviour:
 * - If either white light channel is turned on, RGB is turned off
 * - If RGB is turned on, both white light channels are turned off
 *
 * Components used:
 * - RGB.Set / RGB.GetStatus      -> RGB engine (id:0)
 * - Light.Set / Light.GetStatus  -> White channels (id:0 and id:1)
 */

let lastRGB = [0, 0, 0];
let lastRGBBrightness = 0;

let lastWhite0 = 0;
let lastWhite1 = 0;

let transitionMs = 300;

function arraysDifferent(a, b) {
    return a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2];
}

function enforceExclusivity() {
    Shelly.call("RGB.GetStatus", { id: 0 }, function (rgbRes, rgbErr) {
        if (rgbErr) {
            print("RGB.GetStatus error:", JSON.stringify(rgbErr));
            return;
        }

        Shelly.call("Light.GetStatus", { id: 0 }, function (w0Res, w0Err) {
            if (w0Err) {
                print("Light.GetStatus id:0 error:", JSON.stringify(w0Err));
                return;
            }

            Shelly.call("Light.GetStatus", { id: 1 }, function (w1Res, w1Err) {
                if (w1Err) {
                    print("Light.GetStatus id:1 error:", JSON.stringify(w1Err));
                    return;
                }

                let rgb = rgbRes.rgb || [0, 0, 0];
                let rgbBrightness = rgbRes.brightness || 0;

                let white0 = w0Res.brightness || 0;
                let white1 = w1Res.brightness || 0;

                let rgbOn = (rgb[0] > 0 || rgb[1] > 0 || rgb[2] > 0) && rgbBrightness > 0;
                let whiteOn = white0 > 0 || white1 > 0;

                let rgbChanged = arraysDifferent(rgb, lastRGB) || rgbBrightness !== lastRGBBrightness;
                let whiteChanged = white0 !== lastWhite0 || white1 !== lastWhite1;

                // Case 1: a white channel is turned on -> force RGB off
                if (whiteChanged && whiteOn) {
                    Shelly.call("RGB.Set", {
                        id: 0,
                        on: false,
                        rgb: [0, 0, 0],
                        brightness: 0,
                        transition: transitionMs
                    });
                }

                // Case 2: RGB is turned on -> force both white channels off
                else if (rgbChanged && rgbOn && whiteOn) {
                    Shelly.call("Light.Set", {
                        id: 0,
                        on: false,
                        brightness: 0,
                        transition: transitionMs
                    });

                    Shelly.call("Light.Set", {
                        id: 1,
                        on: false,
                        brightness: 0,
                        transition: transitionMs
                    });
                }

                // Save state
                lastRGB = [rgb[0], rgb[1], rgb[2]];
                lastRGBBrightness = rgbBrightness;
                lastWhite0 = white0;
                lastWhite1 = white1;
            });
        });
    });
}

Timer.set(300, true, enforceExclusivity);
