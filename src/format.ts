export interface Refer {
  sources?: string[]
  license?: string[]
}

export interface Coordinates {
  lat: string
  lon: string
}

export interface Units {
  temp: string
  wind: string
  precip: string
  vis: string
  pressure: string
}

export interface LocationItem {
  name: string
  id: string
  lat: string
  lon: string
  adm2: string
  adm1: string
  country: string
  tz: string
  utcOffset: string
  type: string
  rank: string
  fxLink: string
}

export interface CityLookupResponse {
  code: string
  location?: LocationItem[]
  refer?: Refer
}

export interface NowResponse {
  updateTime: string
  fxLink: string
  now: {
    obsTime: string
    temp: string
    feelsLike: string
    text: string
    wind360: string
    windDir: string
    windScale: string
    windSpeed: string
    humidity: string
    precip: string
    pressure: string
    vis: string
    cloud?: string
    dew?: string
  }
}

export interface DailyResponse {
  updateTime: string
  fxLink: string
  daily: {
    fxDate: string
    sunrise?: string
    sunset?: string
    moonrise?: string
    moonset?: string
    moonPhase: string
    tempMax: string
    tempMin: string
    textDay: string
    textNight: string
    wind360Day: string
    windDirDay: string
    windScaleDay: string
    windSpeedDay: string
    wind360Night: string
    windDirNight: string
    windScaleNight: string
    windSpeedNight: string
    humidity: string
    precip: string
    pressure: string
    vis: string
    cloud?: string
    uvIndex: string
  }[]
}

export interface HourlyResponse {
  updateTime: string
  fxLink: string
  hourly: {
    fxTime: string
    temp: string
    text: string
    wind360: string
    windDir: string
    windScale: string
    windSpeed: string
    humidity: string
    pop?: string
    precip: string
    pressure: string
    cloud?: string
    dew?: string
  }[]
}

export interface MinutelyResponse {
  updateTime: string
  fxLink: string
  summary: string
  minutely: { fxTime: string; precip: string; type: 'rain' | 'snow' }[]
}

interface AirIndex {
  code: string
  name: string
  aqi: number
  aqiDisplay: string
  level?: string
  category?: string
  primaryPollutant?: { code?: string; name?: string; fullName?: string }
  health?: {
    effect?: string
    advice?: { generalPopulation?: string; sensitivePopulation?: string }
  }
}

interface AirPollutant {
  code: string
  name: string
  fullName: string
  concentration: { value: number; unit: string }
}

export interface AirCurrentResponse {
  indexes?: AirIndex[]
  pollutants?: AirPollutant[]
  stations?: { id: string; name: string }[]
}

export interface AirHourlyResponse {
  hours?: { forecastTime: string; indexes?: AirIndex[]; pollutants?: AirPollutant[] }[]
}

export interface AirDailyResponse {
  days?: { forecastStartTime: string; forecastEndTime: string; indexes?: AirIndex[]; pollutants?: AirPollutant[] }[]
}

function wind(direction: string, degree: string, scale: string, speed: string, units: Units) {
  return { direction, degree, scale, speed: `${speed}${units.wind}` }
}

function page<T, R>(items: readonly T[], limit: number, map: (item: T) => R) {
  const returned = Math.min(limit, items.length)
  return { returned, total: items.length, truncated: returned < items.length, items: items.slice(0, returned).map(map) }
}

export function formatNow(data: NowResponse, units: Units) {
  const now = data.now
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
  }
}

export function formatDaily(data: DailyResponse, days: string, limit: number, units: Units) {
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
  }
}

export function formatHourly(data: HourlyResponse, hours: string, limit: number, units: Units) {
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
  }
}

export function formatMinutely(data: MinutelyResponse, limit: number) {
  return {
    updateTime: data.updateTime,
    summary: data.summary,
    ...page(data.minutely, limit, (item) => ({ time: item.fxTime, precip: `${item.precip}mm`, type: item.type })),
    link: data.fxLink
  }
}

function indexes(list: AirIndex[] | undefined) {
  return list?.map((item) => ({
    code: item.code,
    name: item.name,
    aqi: item.aqiDisplay || item.aqi,
    level: item.level,
    category: item.category,
    primaryPollutant: item.primaryPollutant?.name || item.primaryPollutant?.code,
    healthEffect: item.health?.effect,
    advice: item.health?.advice
  }))
}

function pollutants(list: AirPollutant[] | undefined) {
  return list?.map((item) => ({
    code: item.code,
    name: item.name,
    fullName: item.fullName,
    concentration: `${item.concentration.value}${item.concentration.unit}`
  }))
}

export function formatAirCurrent(data: AirCurrentResponse) {
  return { indexes: indexes(data.indexes), pollutants: pollutants(data.pollutants), stations: data.stations }
}

export function formatAirHourly(data: AirHourlyResponse, limit: number) {
  return page(data.hours ?? [], limit, (item) => ({
    time: item.forecastTime,
    indexes: indexes(item.indexes),
    pollutants: pollutants(item.pollutants)
  }))
}

export function formatAirDaily(data: AirDailyResponse, limit: number) {
  return page(data.days ?? [], limit, (item) => ({
    startTime: item.forecastStartTime,
    endTime: item.forecastEndTime,
    indexes: indexes(item.indexes),
    pollutants: pollutants(item.pollutants)
  }))
}
