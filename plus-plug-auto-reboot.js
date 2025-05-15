/**
 * This script will cause a plus plug to automatically toggle back on when it is turned off, this script
 * is designed to allow remote power cycling of devices without needing to remember to power the plug back
 * on
 *
 */

// How long to wait before the plug is powered back on
let rebootDelaySeconds = 10;

Shelly.addStatusHandler(function (e) {
    if (e.component === "switch:0") {
        if (e.delta.output === false) {
            Timer.set(rebootDelaySeconds * 1000, false, function () {
                Shelly.call("Switch.set", {'id': 0, 'on': true});
            });
        }
    }
});