/**
 *
 */

const CONFIG = {
    debug: false, // logs messages to the console when set to true
    inverse: false, // set to true to turn the Plug OFF at the ON time (e.g. sunrise) and ON at the OFF time (sunset)
    location: {
        latitude: '51.2362', // Latitude of location
        longitude: '-0.5704', // Longitude of location
        timeZone: 'Europe/London' // Time Zone of location
    },
    weekday: {
        on: {
            fixed: false, // Use the API response
            variable: 'civil_twilight_begin',
            offset: 15 // 15 minutes after the time above
        },
        off: {
            fixed: false,
            variable: 'sunset',
            offset: -15 // 15 minutes before the time above
        }
    },
    saturday: {
        on: {
            fixed: true, // Use a fix on time
            time: '09:00'
        },
        off: {
            fixed: true, // Use a fixed off time
            time: '23:00'
        }
    },
    sunday: {
        on: {
            fixed: true,
            time: '10:00'
        },
        off: {
            fixed: true,
            time: '22:30'
        }
    }
}

let apiResponse;
let oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

function refreshSunriseData(forDay, callback) {
    log('Refreshing sunrise data for ' + forDay)
    const location = CONFIG.location
    Shelly.call(
        'http.get', {
            url: 'https://api.sunrise-sunset.org/json?lat=' + location.latitude + '&lng=' + location.longitude + '&formatted=0&tzid=' + location.timeZone + '&date=' + forDay
        },
        function (result, errorCode) {
            if (errorCode !== 0) {
                log('Unable to fetch latest sunrise data, retrying in 1 hour');
                Timer.set(oneHour, false, function () {
                    refreshSunriseData(forDay, callback);
                });
                return;
            }
            apiResponse = JSON.parse(result.body).results
            callback();
        }
    )
}

function configureNextTimer(turnOn, targetTime) {
    Timer.set(getTimePeriod(targetTime), false, function () {
        const on = CONFIG.inverse ? !turnOn : turnOn;
        Shelly.call("Switch.Set", {'id': 0, 'on':  on}, calculateNextTimer);
    })
}

function calculateNextTimer() {

    const currentTime = new Date();
    const nextSunrise = new Date(apiResponse.sunrise);

    const dayTarget = nextSunrise.getDay() === 0 ? 'sunday' : nextSunrise.getDay() === 6 ? 'saturday' : 'weekday';

    const todayConfig = CONFIG[dayTarget];

    let onTime;
    let offTime;

    if (todayConfig.on.fixed) {
        onTime = adjustedDate(nextSunrise, todayConfig.on.time)
    } else {
        onTime = addOffset(new Date(apiResponse[todayConfig.on.variable]), todayConfig.on.offset)
    }

    if (todayConfig.off.fixed) {
        offTime = adjustedDate(nextSunrise, todayConfig.off.time)
    } else {
        offTime = addOffset(new Date(apiResponse[todayConfig.off.variable]), todayConfig.off.offset)
    }

    if (currentTime < onTime) {
        // We're setting the timer to turn on this morning
        log('Before the on time, setting timer to turn on the plug in the morning')
        configureNextTimer(true, onTime)
    } else if (currentTime < offTime) {
        // We're setting the time to turn off today
        log('After on time but before off time, setting timer to turn off the plug in the evening')
        configureNextTimer(false, offTime)
    }  else {
        // No timer for today, we need to update the data for tomorrow
        log('After both the on and off times, getting data for tomorrow')
        refreshSunriseData('tomorrow', calculateNextTimer);
    }

}

function getTimePeriod(targetTime) {
    return targetTime.getTime() - new Date().getTime();
}

function addOffset(targetDate, minutes) {
    return new Date(targetDate.getTime() + (minutes * 60000));
}

function adjustedDate(baseDate, forTime) {
    const timeParts = forTime.split(':');
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), timeParts[0], timeParts[1], 0);
}

function setup() {
    refreshSunriseData('today', calculateNextTimer);
}

function log(message) {
    if (!CONFIG.debug) return;
    print(message);
}

setup();
