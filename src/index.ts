import { StructuredTool } from '@langchain/core/tools'
import { createPrivateKey, sign as cryptoSign } from 'node:crypto'
import { Context } from 'koishi'
import type { ChatLunaToolRunnable } from 'koishi-plugin-chatluna/llm-core/platform/types'
import { chatLunaFetch } from 'koishi-plugin-chatluna/utils/request'
import type { RequestInit } from 'undici/types/fetch'
import { z } from 'zod'
import { Config, name, QueryType } from './config'

type DailyDays = '3d' | '7d' | '10d' | '15d' | '30d'
type HourlyHours = '24h' | '72h' | '168h'

type Refer = {
    sources?: string[]
    license?: string[]
}

type LocationItem = {
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

type Coordinates = {
    lat: string
    lon: string
}

type CityLookupResponse = {
    code: string
    location?: LocationItem[]
    refer?: Refer
}

type NowResponse = {
    code: string
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
    refer?: Refer
}

type DailyResponse = {
    code: string
    updateTime: string
    fxLink: string
    daily: Array<{
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
    }>
    refer?: Refer
}

type HourlyResponse = {
    code: string
    updateTime: string
    fxLink: string
    hourly: Array<{
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
    }>
    refer?: Refer
}

type MinutelyResponse = {
    code: string
    updateTime: string
    fxLink: string
    summary: string
    minutely: Array<{
        fxTime: string
        precip: string
        type: 'rain' | 'snow'
    }>
    refer?: Refer
}

type AirIndex = {
    code: string
    name: string
    aqi: number
    aqiDisplay: string
    level?: string
    category?: string
    primaryPollutant?: {
        code?: string
        name?: string
        fullName?: string
    }
    health?: {
        effect?: string
        advice?: {
            generalPopulation?: string
            sensitivePopulation?: string
        }
    }
}

type AirPollutant = {
    code: string
    name: string
    fullName: string
    concentration: {
        value: number
        unit: string
    }
}

type AirCurrentResponse = {
    indexes?: AirIndex[]
    pollutants?: AirPollutant[]
    stations?: Array<{
        id: string
        name: string
    }>
}

type AirHourlyResponse = {
    hours?: Array<{
        forecastTime: string
        indexes?: AirIndex[]
        pollutants?: AirPollutant[]
    }>
}

type AirDailyResponse = {
    days?: Array<{
        forecastStartTime: string
        forecastEndTime: string
        indexes?: AirIndex[]
        pollutants?: AirPollutant[]
    }>
}

const querySchema = z.enum(['weatherNow', 'weatherDaily', 'weatherHourly', 'minutelyPrecipitation', 'airCurrent', 'airHourly', 'airDaily'])

const schema = z.object({
    location: z.string().describe('要查询天气的城市名、LocationID 或英文逗号分隔的经度,纬度。'),
    adm: z.string().optional().describe('可选，上级行政区，用于消除重名城市，例如“陕西”“北京”。'),
    range: z.string().optional().describe('可选，国家或地区范围，使用 ISO 3166 代码，例如“cn”“us”。'),
    queries: z.array(querySchema).optional().describe('可选，可同时查询多个类型：weatherNow、weatherDaily、weatherHourly、minutelyPrecipitation、airCurrent、airHourly、airDaily。'),
    days: z.enum(['3d', '7d', '10d', '15d', '30d']).optional().describe('可选，逐日预报天数。'),
    hours: z.enum(['24h', '72h', '168h']).optional().describe('可选，逐小时预报小时数。'),
    limit: z.number().int().min(1).max(168).optional().describe('可选，限制返回的预报条数；对预报类查询生效。')
})

class QWeatherTool extends StructuredTool {
    name: string
    description: string
    schema = schema
    private jwtToken = ''
    private jwtExpiresAt = 0

    constructor(
        private ctx: Context,
        private cfg: Config
    ) {
        super({})
        this.name = (cfg.tool.name || 'qweather').trim()
        this.description =
            (cfg.tool.description || '').trim()
            || '查询天气，输入城市名、LocationID 或经纬度，返回城市匹配、天气预报、分钟级降水或空气质量。'
    }

    async _call(
        input: z.infer<typeof schema>,
        _runManager: unknown,
        _runnable: ChatLunaToolRunnable
    ) {
        const log = this.ctx.logger(name)
            const queries = normalizeQueries(input.queries, this.cfg.defaultQueries)
            const days = input.days || this.cfg.defaultDailyDays
            const hours = input.hours || this.cfg.defaultHourlyHours

        try {
            const city = await this.get<CityLookupResponse>('/geo/v2/city/lookup', {
                location: input.location.trim(),
                adm: input.adm?.trim(),
                range: input.range?.trim(),
                number: String(this.cfg.locationNumber),
                lang: this.cfg.lang
            })

            if (!city.location?.length) {
                return '没有找到匹配的城市或地区。'
            }

            const matched = city.location[0]
            const coordinates = getCoordinates(input.location, matched)
            const calls: Array<Promise<unknown>> = []
            if (queries.includes('weatherNow')) {
                calls.push(this.get<NowResponse>('/v7/weather/now', {
                    location: matched.id,
                    lang: this.cfg.lang,
                    unit: this.cfg.unit
                }))
            }
            if (queries.includes('weatherDaily')) {
                calls.push(this.get<DailyResponse>(`/v7/weather/${days}`, {
                    location: matched.id,
                    lang: this.cfg.lang,
                    unit: this.cfg.unit
                }))
            }
            if (queries.includes('weatherHourly')) {
                calls.push(this.get<HourlyResponse>(`/v7/weather/${hours}`, {
                    location: matched.id,
                    lang: this.cfg.lang,
                    unit: this.cfg.unit
                }))
            }
            if (queries.includes('minutelyPrecipitation')) {
                calls.push(this.get<MinutelyResponse>('/v7/minutely/5m', {
                    location: `${coordinates.lon},${coordinates.lat}`,
                    lang: this.cfg.lang
                }))
            }
            if (queries.includes('airCurrent')) {
                calls.push(this.get<AirCurrentResponse>(`/airquality/v1/current/${coordinates.lat}/${coordinates.lon}`, {
                    lang: this.cfg.lang
                }))
            }
            if (queries.includes('airHourly')) {
                calls.push(this.get<AirHourlyResponse>(`/airquality/v1/hourly/${coordinates.lat}/${coordinates.lon}`, {
                    lang: this.cfg.lang,
                    localTime: 'true'
                }))
            }
            if (queries.includes('airDaily')) {
                calls.push(this.get<AirDailyResponse>(`/airquality/v1/daily/${coordinates.lat}/${coordinates.lon}`, {
                    lang: this.cfg.lang,
                    localTime: 'true'
                }))
            }

            const results = await Promise.all(calls)
            let next = 0
            const now = queries.includes('weatherNow')
                ? results[next++] as NowResponse
                : undefined
            const daily = queries.includes('weatherDaily')
                ? results[next++] as DailyResponse
                : undefined
            const hourly = queries.includes('weatherHourly')
                ? results[next++] as HourlyResponse
                : undefined
            const minutely = queries.includes('minutelyPrecipitation')
                ? results[next++] as MinutelyResponse
                : undefined
            const airCurrent = queries.includes('airCurrent')
                ? results[next++] as AirCurrentResponse
                : undefined
            const airHourly = queries.includes('airHourly')
                ? results[next++] as AirHourlyResponse
                : undefined
            const airDaily = queries.includes('airDaily')
                ? results[next++] as AirDailyResponse
                : undefined

            return JSON.stringify(compact(this.format(city, matched, queries, days, hours, input.limit, coordinates, now, daily, hourly, minutely, airCurrent, airHourly, airDaily)), null, 2)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (this.cfg.debug) {
                log.error(err)
            }
            return `和风天气查询失败：${msg}`
        }
    }

    private format(
        city: CityLookupResponse,
        matched: LocationItem,
        queries: QueryType[],
        days: DailyDays,
        hours: HourlyHours,
        limit?: number,
        coordinates?: Coordinates,
        now?: NowResponse,
        daily?: DailyResponse,
        hourly?: HourlyResponse,
        minutely?: MinutelyResponse,
        airCurrent?: AirCurrentResponse,
        airHourly?: AirHourlyResponse,
        airDaily?: AirDailyResponse
    ) {
        const units = this.cfg.unit === 'i'
            ? { temp: '°F', wind: 'mph', precip: 'inch', vis: 'mile', pressure: 'hPa' }
            : { temp: '°C', wind: 'km/h', precip: 'mm', vis: 'km', pressure: 'hPa' }
        const dailyLimit = Math.min(limit || this.cfg.defaultDailyLimit, daily?.daily.length || 0)
        const hourlyLimit = Math.min(limit || this.cfg.defaultHourlyLimit, hourly?.hourly.length || 0)
        const minutelyLimit = Math.min(limit || 24, minutely?.minutely.length || 0)
        const airHourlyLimit = Math.min(limit || 24, airHourly?.hours?.length || 0)
        const airDailyLimit = Math.min(limit || 3, airDaily?.days?.length || 0)

        return {
            location: {
                name: matched.name,
                id: matched.id,
                adm2: matched.adm2,
                adm1: matched.adm1,
                country: matched.country,
                timezone: matched.tz,
                utcOffset: matched.utcOffset,
                latitude: coordinates?.lat,
                longitude: coordinates?.lon,
                link: matched.fxLink
            },
            otherLocations: this.cfg.includeOtherLocations
                ? (city.location || []).slice(1).map((item) => ({
                    name: item.name,
                    id: item.id,
                    adm2: item.adm2,
                    adm1: item.adm1,
                    country: item.country
                }))
                : undefined,
            query: {
                queries,
                days: daily ? days : undefined,
                hours: hourly ? hours : undefined,
                unit: this.cfg.unit,
                lang: this.cfg.lang
            },
            now: now
                ? {
                    updateTime: now.updateTime,
                    obsTime: now.now.obsTime,
                    weather: now.now.text,
                    temp: `${now.now.temp}${units.temp}`,
                    feelsLike: `${now.now.feelsLike}${units.temp}`,
                    wind: {
                        direction: now.now.windDir,
                        degree: now.now.wind360,
                        scale: now.now.windScale,
                        speed: `${now.now.windSpeed}${units.wind}`
                    },
                    humidityPercent: now.now.humidity,
                    precip1h: `${now.now.precip}${units.precip}`,
                    pressure: `${now.now.pressure}${units.pressure}`,
                    visibility: `${now.now.vis}${units.vis}`,
                    cloudPercent: now.now.cloud,
                    dew: now.now.dew ? `${now.now.dew}${units.temp}` : undefined,
                    link: now.fxLink
                }
                : undefined,
            daily: daily
                ? {
                    updateTime: daily.updateTime,
                    days,
                    returned: dailyLimit,
                    total: daily.daily.length,
                    truncated: dailyLimit < daily.daily.length,
                    items: daily.daily.slice(0, dailyLimit).map((item) => ({
                        date: item.fxDate,
                        weatherDay: item.textDay,
                        weatherNight: item.textNight,
                        tempMax: `${item.tempMax}${units.temp}`,
                        tempMin: `${item.tempMin}${units.temp}`,
                        windDay: {
                            direction: item.windDirDay,
                            degree: item.wind360Day,
                            scale: item.windScaleDay,
                            speed: `${item.windSpeedDay}${units.wind}`
                        },
                        windNight: {
                            direction: item.windDirNight,
                            degree: item.wind360Night,
                            scale: item.windScaleNight,
                            speed: `${item.windSpeedNight}${units.wind}`
                        },
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
                    link: daily.fxLink
                }
                : undefined,
            hourly: hourly
                ? {
                    updateTime: hourly.updateTime,
                    hours,
                    returned: hourlyLimit,
                    total: hourly.hourly.length,
                    truncated: hourlyLimit < hourly.hourly.length,
                    items: hourly.hourly.slice(0, hourlyLimit).map((item) => ({
                        time: item.fxTime,
                        weather: item.text,
                        temp: `${item.temp}${units.temp}`,
                        wind: {
                            direction: item.windDir,
                            degree: item.wind360,
                            scale: item.windScale,
                            speed: `${item.windSpeed}${units.wind}`
                        },
                        humidityPercent: item.humidity,
                        popPercent: item.pop,
                        precip: `${item.precip}${units.precip}`,
                        pressure: `${item.pressure}${units.pressure}`,
                        cloudPercent: item.cloud,
                        dew: item.dew ? `${item.dew}${units.temp}` : undefined
                    })),
                    link: hourly.fxLink
                }
                : undefined,
            minutelyPrecipitation: minutely
                ? {
                    updateTime: minutely.updateTime,
                    summary: minutely.summary,
                    returned: minutelyLimit,
                    total: minutely.minutely.length,
                    truncated: minutelyLimit < minutely.minutely.length,
                    items: minutely.minutely.slice(0, minutelyLimit).map((item) => ({
                        time: item.fxTime,
                        precip: `${item.precip}${units.precip}`,
                        type: item.type
                    })),
                    link: minutely.fxLink
                }
                : undefined,
            airCurrent: airCurrent
                ? {
                    indexes: formatAirIndexes(airCurrent.indexes),
                    pollutants: formatAirPollutants(airCurrent.pollutants),
                    stations: airCurrent.stations
                }
                : undefined,
            airHourly: airHourly?.hours
                ? {
                    returned: airHourlyLimit,
                    total: airHourly.hours.length,
                    truncated: airHourlyLimit < airHourly.hours.length,
                    items: airHourly.hours.slice(0, airHourlyLimit).map((item) => ({
                        time: item.forecastTime,
                        indexes: formatAirIndexes(item.indexes),
                        pollutants: formatAirPollutants(item.pollutants)
                    }))
                }
                : undefined,
            airDaily: airDaily?.days
                ? {
                    returned: airDailyLimit,
                    total: airDaily.days.length,
                    truncated: airDailyLimit < airDaily.days.length,
                    items: airDaily.days.slice(0, airDailyLimit).map((item) => ({
                        startTime: item.forecastStartTime,
                        endTime: item.forecastEndTime,
                        indexes: formatAirIndexes(item.indexes),
                        pollutants: formatAirPollutants(item.pollutants)
                    }))
                }
                : undefined,
            refer: now?.refer || daily?.refer || hourly?.refer || minutely?.refer || city.refer
        }
    }

    private async get<T>(path: string, params: Record<string, string | undefined>) {
        const host = this.cfg.apiHost.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
        const url = new URL(`https://${host}${path}`)
        for (const [key, value] of Object.entries(params)) {
            if (value) url.searchParams.set(key, value)
        }

        const headers: Record<string, string> = {
            Accept: 'application/json'
        }
        if (this.cfg.authType === 'apiKey') {
            headers['X-QW-Api-Key'] = (this.cfg.apiKey || '').trim()
        } else {
            headers.Authorization = `Bearer ${this.getJwtToken()}`
        }

        const response = await request(url.toString(), {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(this.cfg.timeoutSeconds * 1000)
        }, this.cfg)
        const data = await response.json() as T & { code?: string }
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}${data.code ? `，和风天气状态码 ${data.code}` : ''}`)
        }
        if (data.code && data.code !== '200') {
            throw new Error(`和风天气状态码 ${data.code}`)
        }
        return data as T
    }

    private getJwtToken() {
        if (this.jwtToken && Date.now() + 60000 < this.jwtExpiresAt) {
            return this.jwtToken
        }

        const iat = Math.floor(Date.now() / 1000) - 30
        const exp = iat + (this.cfg.jwtTtlSeconds || 900)
        const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', kid: (this.cfg.jwtKeyId || '').trim() })).toString('base64url')
        const payload = Buffer.from(JSON.stringify({ sub: (this.cfg.jwtProjectId || '').trim(), iat, exp })).toString('base64url')
        const data = `${header}.${payload}`
        const privateKey = createPrivateKey(normalizePrivateKey(this.cfg.jwtPrivateKey || ''))
        const signature = cryptoSign(null, Buffer.from(data), privateKey).toString('base64url')
        this.jwtToken = `${data}.${signature}`
        this.jwtExpiresAt = exp * 1000
        return this.jwtToken
    }
}

function compact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => compact(item))
    if (!value || typeof value !== 'object') return value

    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
        if (item === undefined || item === '') continue
        const next = compact(item)
        if (Array.isArray(next) && next.length === 0) continue
        out[key] = next
    }
    return out
}

function normalizeQueries(input: QueryType[] | undefined, defaults: QueryType[] | undefined): QueryType[] {
    const queries: QueryType[] = input?.length ? input : defaults?.length ? defaults : ['weatherNow']
    return Array.from(new Set(queries))
}

function getCoordinates(input: string, matched: LocationItem): Coordinates {
    const parsed = parseCoordinates(input)
    if (parsed) return parsed
    return {
        lat: formatCoordinate(matched.lat),
        lon: formatCoordinate(matched.lon)
    }
}

function parseCoordinates(input: string): Coordinates | undefined {
    const match = input.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/)
    if (!match) return undefined

    const lon = Number(match[1])
    const lat = Number(match[2])
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return undefined
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return undefined
    return {
        lat: formatCoordinate(String(lat)),
        lon: formatCoordinate(String(lon))
    }
}

function formatCoordinate(value: string) {
    return Number(value).toFixed(2)
}

function formatAirIndexes(indexes: AirIndex[] | undefined) {
    return indexes?.map((item) => ({
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

function formatAirPollutants(pollutants: AirPollutant[] | undefined) {
    return pollutants?.map((item) => ({
        code: item.code,
        name: item.name,
        fullName: item.fullName,
        concentration: `${item.concentration.value}${item.concentration.unit}`
    }))
}

function normalizePrivateKey(value: string) {
    const key = value.replace(/\\n/g, '\n').trim()
    if (key.includes('\n')) return key

    const match = key.match(/^(-----BEGIN [^-]+-----)\s+(.+)\s+(-----END [^-]+-----)$/)
    if (!match) return key
    return `${match[1]}\n${match[2].replace(/\s+/g, '')}\n${match[3]}`
}

function request(url: string, init: RequestInit, cfg: Config) {
    switch (cfg.proxyMode) {
        case 'system':
            return chatLunaFetch(url, init)
        case 'off':
            return chatLunaFetch(url, init, 'null')
        case 'on':
            return chatLunaFetch(url, init, cfg.proxyAddress)
    }
}

export function apply(ctx: Context, cfg: Config) {
    const log = ctx.logger(name)

    ctx.on('ready', async () => {
        if (!cfg.tool.enabled) return
        if (!cfg.apiHost.trim()) {
            log.warn('未配置和风天气 API Host，跳过注册 ChatLuna 工具。')
            return
        }
        if (cfg.authType === 'apiKey' && !(cfg.apiKey || '').trim()) {
            log.warn('未配置和风天气 API KEY，跳过注册 ChatLuna 工具。')
            return
        }
        if (cfg.authType === 'jwt' && (!(cfg.jwtKeyId || '').trim() || !(cfg.jwtProjectId || '').trim() || !(cfg.jwtPrivateKey || '').trim())) {
            log.warn('未完整配置和风天气 JWT 信息，跳过注册 ChatLuna 工具。')
            return
        }

        const toolName = (cfg.tool.name || 'qweather').trim() || 'qweather'
        const tool = new QWeatherTool(ctx, cfg)
        ctx.effect(() => ctx.chatluna.platform.registerTool(toolName, {
            description: tool.description,
            selector() {
                return true
            },
            createTool() {
                return new QWeatherTool(ctx, cfg)
            },
            meta: {
                source: 'extension',
                group: 'qweather',
                tags: ['qweather', 'weather'],
                defaultAvailability: {
                    enabled: true,
                    main: true,
                    chatluna: true,
                    characterScope: 'all'
                }
            }
        }))
    })
}

export * from './config'
