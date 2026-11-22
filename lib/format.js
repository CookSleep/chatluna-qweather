function wind(direction, degree, scale, speed, units) {
    return { direction, degree, scale, speed: `${speed}${units.wind}` };
}
function page(items, limit, map) {
    const returned = Math.min(limit, items.length);
    return { returned, total: items.length, truncated: returned < items.length, items: items.slice(0, returned).map(map) };
}
export function formatNow(data, units) {
    const now = data.now;
    return {
        updateTime: data.updateTime,
        obsTime: now.obsTime,
        weather: now.text,
        temp: `${now.temp}${units.temp}`,
        feelsLike: `${now.feelsLike}${units.temp}`,
        wind: wind(now.windDir, now.wind360, now.windScale, now.windSpeed, units),
        humidityPercent: now.humidity,
        precip1h: `${now.precip}${units.precip}`,
        pressure: `${now.pressure}${units.pressure}`,
        visibility: `${now.vis}${units.vis}`,
        cloudPercent: now.cloud,
        dew: now.dew ? `${now.dew}${units.temp}` : undefined,
        link: data.fxLink
    };
}
export function formatDaily(data, days, limit, units) {
    return {
        updateTime: data.updateTime,
        days,
        ...page(data.daily, limit, (item) => ({
            date: item.fxDate,
            weatherDay: item.textDay,
            weatherNight: item.textNight,
            tempMax: `${item.tempMax}${units.temp}`,
            tempMin: `${item.tempMin}${units.temp}`,
            windDay: wind(item.windDirDay, item.wind360Day, item.windScaleDay, item.windSpeedDay, units),
            windNight: wind(item.windDirNight, item.wind360Night, item.windScaleNight, item.windSpeedNight, units),
            humidityPercent: item.humidity,
            precip: `${item.precip}${units.precip}`,
            pressure: `${item.pressure}${units.pressure}`,
            visibility: `${item.vis}${units.vis}`,
            cloudPercent: item.cloud,
            uvIndex: item.uvIndex,
            sunrise: item.sunrise,
            sunset: item.sunset,
            moonrise: item.moonrise,
            moonset: item.moonset,
            moonPhase: item.moonPhase
        })),
        link: data.fxLink
    };
}
export function formatHourly(data, hours, limit, units) {
    return {
        updateTime: data.updateTime,
        hours,
        ...page(data.hourly, limit, (item) => ({
            time: item.fxTime,
            weather: item.text,
            temp: `${item.temp}${units.temp}`,
            wind: wind(item.windDir, item.wind360, item.windScale, item.windSpeed, units),
            humidityPercent: item.humidity,
            popPercent: item.pop,
            precip: `${item.precip}${units.precip}`,
            pressure: `${item.pressure}${units.pressure}`,
            cloudPercent: item.cloud,
            dew: item.dew ? `${item.dew}${units.temp}` : undefined
        })),
        link: data.fxLink
    };
}
export function formatMinutely(data, limit) {
    return {
        updateTime: data.updateTime,
        summary: data.summary,
        ...page(data.minutely, limit, (item) => ({ time: item.fxTime, precip: `${item.precip}mm`, type: item.type })),
        link: data.fxLink
    };
}
function indexes(list) {
    return list?.map((item) => ({
        code: item.code,
        name: item.name,
        aqi: item.aqiDisplay || item.aqi,
        level: item.level,
        category: item.category,
        primaryPollutant: item.primaryPollutant?.name || item.primaryPollutant?.code,
        healthEffect: item.health?.effect,
        advice: item.health?.advice
    }));
}
function pollutants(list) {
    return list?.map((item) => ({
        code: item.code,
        name: item.name,
        fullName: item.fullName,
        concentration: `${item.concentration.value}${item.concentration.unit}`
    }));
}
export function formatAirCurrent(data) {
    return { indexes: indexes(data.indexes), pollutants: pollutants(data.pollutants), stations: data.stations };
}
export function formatAirHourly(data, limit) {
    return page(data.hours ?? [], limit, (item) => ({
        time: item.forecastTime,
        indexes: indexes(item.indexes),
        pollutants: pollutants(item.pollutants)
    }));
}
export function formatAirDaily(data, limit) {
    return page(data.days ?? [], limit, (item) => ({
        startTime: item.forecastStartTime,
        endTime: item.forecastEndTime,
        indexes: indexes(item.indexes),
        pollutants: pollutants(item.pollutants)
    }));
}
