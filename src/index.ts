import { createPrivateKey, sign } from 'node:crypto'
import type { Context } from 'cordis'
import { Schema } from '@chatluna/schema'
import { defineTool } from '@chatluna/tool'
import type {} from '@cordisjs/plugin-http'
import {
  type AirCurrentResponse,
  type AirDailyResponse,
  type AirHourlyResponse,
  type CityLookupResponse,
  type Coordinates,
  type DailyResponse,
  formatAirCurrent,
  formatAirDaily,
  formatAirHourly,
  formatDaily,
  formatHourly,
  formatMinutely,
  formatNow,
  type HourlyResponse,
  type MinutelyResponse,
  type NowResponse,
  type Units
} from './format'

export const name = 'chatluna-qweather'

export { usage } from './usage'

const QUERY_TYPES = [
  'weatherNow',
  'weatherDaily',
  'weatherHourly',
  'minutelyPrecipitation',
  'airCurrent',
  'airHourly',
  'airDaily'
] as const

type QueryType = (typeof QUERY_TYPES)[number]
type DailyDays = '3d' | '7d' | '10d' | '15d' | '30d'
type HourlyHours = '24h' | '72h' | '168h'

const QueryTypeSchema = Schema.union([
  Schema.const('weatherNow').description('实时天气'),
  Schema.const('weatherDaily').description('逐日天气预报'),
  Schema.const('weatherHourly').description('逐小时天气预报'),
  Schema.const('minutelyPrecipitation').description('分钟级降水'),
  Schema.const('airCurrent').description('实时空气质量'),
  Schema.const('airHourly').description('空气质量小时预报'),
  Schema.const('airDaily').description('空气质量每日预报')
])

export interface Config {
  tool: { name: string; description: string }
  apiHost: string
  authType: 'apiKey' | 'jwt'
  apiKey: string
  jwtKeyId: string
  jwtProjectId: string
  jwtPrivateKey: string
  jwtTtlSeconds: number
  lang: string
  unit: 'm' | 'i'
  timeoutSeconds: number
  locationNumber: number
  defaultQueries: QueryType[]
  defaultDailyDays: DailyDays
  defaultHourlyHours: HourlyHours
  defaultDailyLimit: number
  defaultHourlyLimit: number
  includeOtherLocations: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    tool: Schema.object({
      name: Schema.string().default('qweather').description('工具名称'),
      description: Schema.string()
        .default('查询天气，输入城市名、LocationID 或经纬度，返回城市匹配、天气预报、分钟级降水或空气质量。')
        .description('工具描述')
    }).description('工具')
  }),
  Schema.object({
    apiHost: Schema.string()
      .default('')
      .description(
        'API Host，如 `abc1234xyz.def.qweatherapi.com`，不含路径，在[控制台](https://console.qweather.com/setting)查看'
      ),
    authType: Schema.union([Schema.const('apiKey').description('API KEY'), Schema.const('jwt').description('JWT')])
      .default('jwt')
      .description('认证方式'),
    apiKey: Schema.string()
      .role('secret')
      .default('')
      .description('API KEY'),
    jwtKeyId: Schema.string()
      .default('')
      .description('JWT 凭据 ID（kid），在凭据详情页获取'),
    jwtProjectId: Schema.string()
      .default('')
      .description('JWT 项目 ID（sub），在项目详情页获取'),
    jwtPrivateKey: Schema.string()
      .role('secret')
      .default('')
      .description('Ed25519 私钥 PEM'),
    jwtTtlSeconds: Schema.number().default(900).min(300).max(86400).description('JWT 有效期（秒）')
  }).description('认证'),
  Schema.object({
    lang: Schema.string().default('zh').description('语言代码，如 `zh`、`en`、`ja`'),
    unit: Schema.union([Schema.const('m').description('公制'), Schema.const('i').description('英制')])
      .default('m')
      .description('单位'),
    timeoutSeconds: Schema.number().default(20).min(5).max(120).description('请求超时（秒）'),
    locationNumber: Schema.number().default(5).min(1).max(20).description('城市搜索候选数'),
    defaultQueries: Schema.array(QueryTypeSchema)
      .default(['weatherNow'])
      .description('默认查询类型'),
    defaultDailyDays: Schema.union([
      Schema.const('3d').description('3 天'),
      Schema.const('7d').description('7 天'),
      Schema.const('10d').description('10 天'),
      Schema.const('15d').description('15 天'),
      Schema.const('30d').description('30 天')
    ])
      .default('7d')
      .description('默认逐日预报天数'),
    defaultHourlyHours: Schema.union([
      Schema.const('24h').description('24 小时'),
      Schema.const('72h').description('72 小时'),
      Schema.const('168h').description('168 小时')
    ])
      .default('24h')
      .description('默认逐小时预报小时数'),
    defaultDailyLimit: Schema.number()
      .default(7)
      .min(1)
      .max(30)
      .description('默认逐日预报条数'),
    defaultHourlyLimit: Schema.number()
      .default(24)
      .min(1)
      .max(168)
      .description('默认逐小时预报条数'),
    includeOtherLocations: Schema.boolean()
      .default(true)
      .description('附带其他同名城市候选')
  }).description('查询')
])

export const inject = ['tools', 'http']

interface Args {
  location: string
  adm?: string
  range?: string
  queries?: QueryType[]
  days?: DailyDays
  hours?: HourlyHours
  limit?: number
}

const ARGS = Schema.object({
  location: Schema.string().required().description('要查询天气的城市名、LocationID 或英文逗号分隔的经度,纬度。'),
  adm: Schema.string().description('可选，上级行政区，用于消除重名城市，例如“陕西”“北京”。'),
  range: Schema.string().description('可选，国家或地区范围，使用 ISO 3166 代码，例如“cn”“us”。'),
  queries: Schema.array(Schema.union([...QUERY_TYPES])).description(
    '可选，可同时查询多个类型：weatherNow、weatherDaily、weatherHourly、minutelyPrecipitation、airCurrent、airHourly、airDaily。'
  ),
  days: Schema.union(['3d', '7d', '10d', '15d', '30d'] as const).description('可选，逐日预报天数。'),
  hours: Schema.union(['24h', '72h', '168h'] as const).description('可选，逐小时预报小时数。'),
  limit: Schema.natural().min(1).max(168).description('可选，限制返回的预报条数；对预报类查询生效。')
})

export function apply(ctx: Context, config: Config) {
  let token: { value: string; expiresAt: number } | undefined

  const authorization = (): Record<string, string> => {
    if (config.authType === 'apiKey') return { 'X-QW-Api-Key': config.apiKey.trim() }
    if (token === undefined || Date.now() + 60_000 >= token.expiresAt) {
      const iat = Math.floor(Date.now() / 1000) - 30
      const exp = iat + config.jwtTtlSeconds
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
      const data = `${encode({ alg: 'EdDSA', kid: config.jwtKeyId.trim() })}.${encode({ sub: config.jwtProjectId.trim(), iat, exp })}`
      const signature = sign(null, Buffer.from(data), createPrivateKey(normalizePrivateKey(config.jwtPrivateKey)))
      token = { value: `${data}.${signature.toString('base64url')}`, expiresAt: exp * 1000 }
    }
    return { Authorization: `Bearer ${token.value}` }
  }

  const get = async <T>(path: string, params: Record<string, string | undefined>): Promise<T> => {
    const url = new URL(`https://${config.apiHost.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')}${path}`)
    for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)
    const response = await ctx.http(url, {
      headers: { Accept: 'application/json', ...authorization() },
      timeout: config.timeoutSeconds * 1000,
      validateStatus: () => true
    })
    const data: unknown = await response.json().catch(() => ({}))
    const record = typeof data === 'object' && data !== null ? data : {}
    const code = 'code' in record ? String(record.code) : undefined
    if (!response.ok) {
      const error = 'error' in record && typeof record.error === 'object' && record.error !== null ? record.error : {}
      const title = 'title' in error ? String(error.title) : ''
      const detail = 'detail' in error ? String(error.detail) : ''
      throw new Error(`HTTP ${response.status}${title || detail ? `，${title}：${detail}` : code ? `，状态码 ${code}` : ''}`)
    }
    if (code !== undefined && code !== '200') throw new Error(`和风天气状态码 ${code}`)
    return parsed<T>(data)
  }

  if (!configured(config)) {
    ctx.logger.warn('未完整配置和风天气 API Host 或认证信息，跳过注册工具。')
    return
  }

  ctx.tools.define(
    defineTool<Args>({
      name: config.tool.name,
      description: config.tool.description,
      args: ARGS,
      traits: { effect: 'read', parallel: true },
      async run(args) {
        const queries = [...new Set(args.queries?.length ? args.queries : config.defaultQueries)]
        const days = args.days ?? config.defaultDailyDays
        const hours = args.hours ?? config.defaultHourlyHours
        const point = parseCoordinates(args.location)
        const city = await get<CityLookupResponse>('/geo/v2/city/lookup', {
          location: point ? `${point.lon},${point.lat}` : args.location.trim(),
          adm: args.adm?.trim(),
          range: args.range?.trim(),
          number: String(config.locationNumber),
          lang: config.lang
        })
        const [matched, ...others] = city.location ?? []
        if (matched === undefined) return { error: '没有找到匹配的城市或地区。' }

        // A coordinate input is queried at that point, not at the nearest city.
        const coordinates: Coordinates = point ?? {
          lat: formatCoordinate(matched.lat),
          lon: formatCoordinate(matched.lon)
        }
        const where = point ? `${coordinates.lon},${coordinates.lat}` : matched.id
        const weather = { location: where, lang: config.lang, unit: config.unit }
        const air = `${coordinates.lat}/${coordinates.lon}`
        const units: Units =
          config.unit === 'i'
            ? { temp: '°F', wind: 'mph', precip: 'inch', vis: 'mile', pressure: 'hPa' }
            : { temp: '°C', wind: 'km/h', precip: 'mm', vis: 'km', pressure: 'hPa' }
        const tasks: Record<QueryType, () => Promise<[string, unknown]>> = {
          weatherNow: async () => ['now', formatNow(await get<NowResponse>('/v7/weather/now', weather), units)],
          weatherDaily: async () => [
            'daily',
            formatDaily(
              await get<DailyResponse>(`/v7/weather/${days}`, weather),
              days,
              args.limit ?? config.defaultDailyLimit,
              units
            )
          ],
          weatherHourly: async () => [
            'hourly',
            formatHourly(
              await get<HourlyResponse>(`/v7/weather/${hours}`, weather),
              hours,
              args.limit ?? config.defaultHourlyLimit,
              units
            )
          ],
          minutelyPrecipitation: async () => [
            'minutelyPrecipitation',
            formatMinutely(
              await get<MinutelyResponse>('/v7/minutely/5m', {
                location: `${coordinates.lon},${coordinates.lat}`,
                lang: config.lang
              }),
              args.limit ?? 24
            )
          ],
          airCurrent: async () => [
            'airCurrent',
            formatAirCurrent(await get<AirCurrentResponse>(`/airquality/v1/current/${air}`, { lang: config.lang }))
          ],
          airHourly: async () => [
            'airHourly',
            formatAirHourly(
              await get<AirHourlyResponse>(`/airquality/v1/hourly/${air}`, { lang: config.lang, localTime: 'true' }),
              args.limit ?? 24
            )
          ],
          airDaily: async () => [
            'airDaily',
            formatAirDaily(
              await get<AirDailyResponse>(`/airquality/v1/daily/${air}`, { lang: config.lang, localTime: 'true' }),
              args.limit ?? 3
            )
          ]
        }

        // One failed query does not hide the others; its reason goes to errors.
        const settled = await Promise.allSettled(queries.map((query) => tasks[query]()))
        const results: Record<string, unknown> = {}
        const errors: Record<string, string> = {}
        settled.forEach((item, index) => {
          if (item.status === 'fulfilled') results[item.value[0]] = item.value[1]
          else errors[queries[index]!] = item.reason instanceof Error ? item.reason.message : String(item.reason)
        })
        if (Object.keys(results).length === 0) {
          throw new Error(
            Object.entries(errors)
              .map(([query, message]) => `${query}：${message}`)
              .join('；')
          )
        }
        return compact({
          location: {
            name: matched.name,
            id: matched.id,
            adm2: matched.adm2,
            adm1: matched.adm1,
            country: matched.country,
            timezone: matched.tz,
            utcOffset: matched.utcOffset,
            latitude: coordinates.lat,
            longitude: coordinates.lon,
            link: matched.fxLink
          },
          otherLocations: config.includeOtherLocations
            ? others.map((item) => ({
                name: item.name,
                id: item.id,
                adm2: item.adm2,
                adm1: item.adm1,
                country: item.country
              }))
            : undefined,
          query: { queries, unit: config.unit, lang: config.lang },
          ...results,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
          refer: city.refer
        })
      }
    })
  )
}

/** The QWeather response shapes are trusted as documented; the HTTP boundary is the one place they are asserted. */
function parsed<T>(data: unknown): T {
  return data as T
}

function configured(config: Config): boolean {
  if (config.apiHost.trim() === '') return false
  if (config.authType === 'apiKey') return config.apiKey.trim() !== ''
  return config.jwtKeyId.trim() !== '' && config.jwtProjectId.trim() !== '' && config.jwtPrivateKey.trim() !== ''
}

/** Drop empty strings, undefined and empty arrays so the model reads less noise. */
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact)
  if (typeof value !== 'object' || value === null) return value
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === '') continue
    const next = compact(item)
    if (Array.isArray(next) && next.length === 0) continue
    out[key] = next
  }
  return out
}

function parseCoordinates(input: string): Coordinates | undefined {
  const match = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(input.trim())
  if (match === null) return undefined
  const lon = Number(match[1])
  const lat = Number(match[2])
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return undefined
  return { lat: formatCoordinate(String(lat)), lon: formatCoordinate(String(lon)) }
}

function formatCoordinate(value: string): string {
  return Number(value).toFixed(2)
}

/** Accept a PEM pasted on one line or with literal `\n`. */
function normalizePrivateKey(value: string): string {
  const key = value.replace(/\\n/g, '\n').trim()
  if (key.includes('\n')) return key
  const match = /^(-----BEGIN [^-]+-----)\s+(.+)\s+(-----END [^-]+-----)$/.exec(key)
  if (match === null) return key
  return `${match[1]}\n${match[2]!.replace(/\s+/g, '')}\n${match[3]}`
}
