import { createPrivateKey, sign } from "node:crypto";
import { Schema } from "@chatluna/schema";
import { defineTool } from "@chatluna/tool";
// external/qweather/src/format.ts
function wind(direction, degree, scale, speed, units) {
	return {
		direction,
		degree,
		scale,
		speed: `${speed}${units.wind}`
	};
}
function page(items, limit, map) {
	const returned = Math.min(limit, items.length);
	return {
		returned,
		total: items.length,
		truncated: returned < items.length,
		items: items.slice(0, returned).map(map)
	};
}
function formatNow(data, units) {
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
		dew: now.dew ? `${now.dew}${units.temp}` : void 0,
		link: data.fxLink
	};
}
function formatDaily(data, days, limit, units) {
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
function formatHourly(data, hours, limit, units) {
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
			dew: item.dew ? `${item.dew}${units.temp}` : void 0
		})),
		link: data.fxLink
	};
}
function formatMinutely(data, limit) {
	return {
		updateTime: data.updateTime,
		summary: data.summary,
		...page(data.minutely, limit, (item) => ({
			time: item.fxTime,
			precip: `${item.precip}mm`,
			type: item.type
		})),
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
function formatAirCurrent(data) {
	return {
		indexes: indexes(data.indexes),
		pollutants: pollutants(data.pollutants),
		stations: data.stations
	};
}
function formatAirHourly(data, limit) {
	return page(data.hours ?? [], limit, (item) => ({
		time: item.forecastTime,
		indexes: indexes(item.indexes),
		pollutants: pollutants(item.pollutants)
	}));
}
function formatAirDaily(data, limit) {
	return page(data.days ?? [], limit, (item) => ({
		startTime: item.forecastStartTime,
		endTime: item.forecastEndTime,
		indexes: indexes(item.indexes),
		pollutants: pollutants(item.pollutants)
	}));
}
// external/qweather/src/usage.ts
const usage = `## chatluna-qweather
提供和风天气查询工具 \`qweather\`：城市搜索、实时天气、逐日/逐小时预报、分钟级降水与空气质量。

### 认证
推荐 JWT。自 2027-02-01 起 API KEY 每日限 1000 次请求，JWT 不受限。

1. 在 [JWT Debugger](https://jwt.qweather.com) 生成 Ed25519 密钥对
2. 将公钥上传到[控制台](https://console.qweather.com)创建 JWT 凭据（付费 API 提醒可忽略）
3. 填写凭据 ID（kid）、项目 ID（sub）和私钥，Token 由插件自动签发

### 工具参数
| 参数 | 说明 |
| --- | --- |
| \`location\` | 城市名、LocationID 或 \`经度,纬度\` |
| \`adm\` / \`range\` | 上级行政区 / ISO 3166 国家代码，用于区分重名城市 |
| \`queries\` | \`weatherNow\`、\`weatherDaily\`、\`weatherHourly\`、\`minutelyPrecipitation\`、\`airCurrent\`、\`airHourly\`、\`airDaily\`，可多选 |
| \`days\` / \`hours\` / \`limit\` | 逐日天数、逐小时小时数、返回条数 |

### 缓存
不缓存任何地理或天气数据（遵守和风天气 ToS），仅在内存中复用 JWT。

### 价格
每月前 5 万次免费，之后每次 CNY 0.0001～0.0007，详见[官网](https://dev.qweather.com/docs/finance/pricing/)。`;
// external/qweather/src/index.ts
const name = "chatluna-qweather";
const QUERY_TYPES = [
	"weatherNow",
	"weatherDaily",
	"weatherHourly",
	"minutelyPrecipitation",
	"airCurrent",
	"airHourly",
	"airDaily"
];
const QueryTypeSchema = Schema.union([
	Schema.const("weatherNow").description("实时天气"),
	Schema.const("weatherDaily").description("逐日天气预报"),
	Schema.const("weatherHourly").description("逐小时天气预报"),
	Schema.const("minutelyPrecipitation").description("分钟级降水"),
	Schema.const("airCurrent").description("实时空气质量"),
	Schema.const("airHourly").description("空气质量小时预报"),
	Schema.const("airDaily").description("空气质量每日预报")
]);
const Config = Schema.intersect([
	Schema.object({ tool: Schema.object({
		name: Schema.string().default("qweather").description("工具名称"),
		description: Schema.string().default("查询天气，输入城市名、LocationID 或经纬度，返回城市匹配、天气预报、分钟级降水或空气质量。").description("工具描述")
	}).description("工具") }),
	Schema.object({
		apiHost: Schema.string().default("").description("API Host，如 `abc1234xyz.def.qweatherapi.com`，不含路径，在[控制台](https://console.qweather.com/setting)查看"),
		authType: Schema.union([Schema.const("apiKey").description("API KEY"), Schema.const("jwt").description("JWT")]).default("jwt").description("认证方式"),
		apiKey: Schema.string().role("secret").default("").description("API KEY"),
		jwtKeyId: Schema.string().default("").description("JWT 凭据 ID（kid），在凭据详情页获取"),
		jwtProjectId: Schema.string().default("").description("JWT 项目 ID（sub），在项目详情页获取"),
		jwtPrivateKey: Schema.string().role("secret").default("").description("Ed25519 私钥 PEM"),
		jwtTtlSeconds: Schema.number().default(900).min(300).max(86400).description("JWT 有效期（秒）")
	}).description("认证"),
	Schema.object({
		lang: Schema.string().default("zh").description("语言代码，如 `zh`、`en`、`ja`"),
		unit: Schema.union([Schema.const("m").description("公制"), Schema.const("i").description("英制")]).default("m").description("单位"),
		timeoutSeconds: Schema.number().default(20).min(5).max(120).description("请求超时（秒）"),
		locationNumber: Schema.number().default(5).min(1).max(20).description("城市搜索候选数"),
		defaultQueries: Schema.array(QueryTypeSchema).default(["weatherNow"]).description("默认查询类型"),
		defaultDailyDays: Schema.union([
			Schema.const("3d").description("3 天"),
			Schema.const("7d").description("7 天"),
			Schema.const("10d").description("10 天"),
			Schema.const("15d").description("15 天"),
			Schema.const("30d").description("30 天")
		]).default("7d").description("默认逐日预报天数"),
		defaultHourlyHours: Schema.union([
			Schema.const("24h").description("24 小时"),
			Schema.const("72h").description("72 小时"),
			Schema.const("168h").description("168 小时")
		]).default("24h").description("默认逐小时预报小时数"),
		defaultDailyLimit: Schema.number().default(7).min(1).max(30).description("默认逐日预报条数"),
		defaultHourlyLimit: Schema.number().default(24).min(1).max(168).description("默认逐小时预报条数"),
		includeOtherLocations: Schema.boolean().default(true).description("附带其他同名城市候选")
	}).description("查询")
]);
const inject = ["tools", "http"];
const ARGS = Schema.object({
	location: Schema.string().required().description("要查询天气的城市名、LocationID 或英文逗号分隔的经度,纬度。"),
	adm: Schema.string().description("可选，上级行政区，用于消除重名城市，例如“陕西”“北京”。"),
	range: Schema.string().description("可选，国家或地区范围，使用 ISO 3166 代码，例如“cn”“us”。"),
	queries: Schema.array(Schema.union([...QUERY_TYPES])).description("可选，可同时查询多个类型：weatherNow、weatherDaily、weatherHourly、minutelyPrecipitation、airCurrent、airHourly、airDaily。"),
	days: Schema.union([
		"3d",
		"7d",
		"10d",
		"15d",
		"30d"
	]).description("可选，逐日预报天数。"),
	hours: Schema.union([
		"24h",
		"72h",
		"168h"
	]).description("可选，逐小时预报小时数。"),
	limit: Schema.natural().min(1).max(168).description("可选，限制返回的预报条数；对预报类查询生效。")
});
function apply(ctx, config) {
	let token;
	const authorization = () => {
		if (config.authType === "apiKey") return { "X-QW-Api-Key": config.apiKey.trim() };
		if (token === void 0 || Date.now() + 6e4 >= token.expiresAt) {
			const iat = Math.floor(Date.now() / 1e3) - 30;
			const exp = iat + config.jwtTtlSeconds;
			const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
			const data = `${encode({
				alg: "EdDSA",
				kid: config.jwtKeyId.trim()
			})}.${encode({
				sub: config.jwtProjectId.trim(),
				iat,
				exp
			})}`;
			token = {
				value: `${data}.${sign(null, Buffer.from(data), createPrivateKey(normalizePrivateKey(config.jwtPrivateKey))).toString("base64url")}`,
				expiresAt: exp * 1e3
			};
		}
		return { Authorization: `Bearer ${token.value}` };
	};
	const get = async (path, params) => {
		const url = new URL(`https://${config.apiHost.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "")}${path}`);
		for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
		const response = await ctx.http(url, {
			headers: {
				Accept: "application/json",
				...authorization()
			},
			timeout: config.timeoutSeconds * 1e3,
			validateStatus: () => true
		});
		const data = await response.json().catch(() => ({}));
		const record = typeof data === "object" && data !== null ? data : {};
		const code = "code" in record ? String(record.code) : void 0;
		if (!response.ok) {
			const error = "error" in record && typeof record.error === "object" && record.error !== null ? record.error : {};
			const title = "title" in error ? String(error.title) : "";
			const detail = "detail" in error ? String(error.detail) : "";
			throw new Error(`HTTP ${response.status}${title || detail ? `，${title}：${detail}` : code ? `，状态码 ${code}` : ""}`);
		}
		if (code !== void 0 && code !== "200") throw new Error(`和风天气状态码 ${code}`);
		return parsed(data);
	};
	if (!configured(config)) {
		ctx.logger.warn("未完整配置和风天气 API Host 或认证信息，跳过注册工具。");
		return;
	}
	ctx.tools.define(defineTool({
		name: config.tool.name,
		description: config.tool.description,
		args: ARGS,
		traits: {
			effect: "read",
			parallel: true
		},
		async run(args) {
			const queries = [...new Set(args.queries?.length ? args.queries : config.defaultQueries)];
			const days = args.days ?? config.defaultDailyDays;
			const hours = args.hours ?? config.defaultHourlyHours;
			const point = parseCoordinates(args.location);
			const city = await get("/geo/v2/city/lookup", {
				location: point ? `${point.lon},${point.lat}` : args.location.trim(),
				adm: args.adm?.trim(),
				range: args.range?.trim(),
				number: String(config.locationNumber),
				lang: config.lang
			});
			const [matched, ...others] = city.location ?? [];
			if (matched === void 0) return { error: "没有找到匹配的城市或地区。" };
			const coordinates = point ?? {
				lat: formatCoordinate(matched.lat),
				lon: formatCoordinate(matched.lon)
			};
			const weather = {
				location: point ? `${coordinates.lon},${coordinates.lat}` : matched.id,
				lang: config.lang,
				unit: config.unit
			};
			const air = `${coordinates.lat}/${coordinates.lon}`;
			const units = config.unit === "i" ? {
				temp: "°F",
				wind: "mph",
				precip: "inch",
				vis: "mile",
				pressure: "hPa"
			} : {
				temp: "°C",
				wind: "km/h",
				precip: "mm",
				vis: "km",
				pressure: "hPa"
			};
			const tasks = {
				weatherNow: async () => ["now", formatNow(await get("/v7/weather/now", weather), units)],
				weatherDaily: async () => ["daily", formatDaily(await get(`/v7/weather/${days}`, weather), days, args.limit ?? config.defaultDailyLimit, units)],
				weatherHourly: async () => ["hourly", formatHourly(await get(`/v7/weather/${hours}`, weather), hours, args.limit ?? config.defaultHourlyLimit, units)],
				minutelyPrecipitation: async () => ["minutelyPrecipitation", formatMinutely(await get("/v7/minutely/5m", {
					location: `${coordinates.lon},${coordinates.lat}`,
					lang: config.lang
				}), args.limit ?? 24)],
				airCurrent: async () => ["airCurrent", formatAirCurrent(await get(`/airquality/v1/current/${air}`, { lang: config.lang }))],
				airHourly: async () => ["airHourly", formatAirHourly(await get(`/airquality/v1/hourly/${air}`, {
					lang: config.lang,
					localTime: "true"
				}), args.limit ?? 24)],
				airDaily: async () => ["airDaily", formatAirDaily(await get(`/airquality/v1/daily/${air}`, {
					lang: config.lang,
					localTime: "true"
				}), args.limit ?? 3)]
			};
			const settled = await Promise.allSettled(queries.map((query) => tasks[query]()));
			const results = {};
			const errors = {};
			settled.forEach((item, index) => {
				if (item.status === "fulfilled") results[item.value[0]] = item.value[1];
				else errors[queries[index]] = item.reason instanceof Error ? item.reason.message : String(item.reason);
			});
			if (Object.keys(results).length === 0) throw new Error(Object.entries(errors).map(([query, message]) => `${query}：${message}`).join("；"));
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
				otherLocations: config.includeOtherLocations ? others.map((item) => ({
					name: item.name,
					id: item.id,
					adm2: item.adm2,
					adm1: item.adm1,
					country: item.country
				})) : void 0,
				query: {
					queries,
					unit: config.unit,
					lang: config.lang
				},
				...results,
				errors: Object.keys(errors).length > 0 ? errors : void 0,
				refer: city.refer
			});
		}
	}));
}
/** The QWeather response shapes are trusted as documented; the HTTP boundary is the one place they are asserted. */
function parsed(data) {
	return data;
}
function configured(config) {
	if (config.apiHost.trim() === "") return false;
	if (config.authType === "apiKey") return config.apiKey.trim() !== "";
	return config.jwtKeyId.trim() !== "" && config.jwtProjectId.trim() !== "" && config.jwtPrivateKey.trim() !== "";
}
/** Drop empty strings, undefined and empty arrays so the model reads less noise. */
function compact(value) {
	if (Array.isArray(value)) return value.map(compact);
	if (typeof value !== "object" || value === null) return value;
	const out = {};
	for (const [key, item] of Object.entries(value)) {
		if (item === void 0 || item === "") continue;
		const next = compact(item);
		if (Array.isArray(next) && next.length === 0) continue;
		out[key] = next;
	}
	return out;
}
function parseCoordinates(input) {
	const match = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(input.trim());
	if (match === null) return void 0;
	const lon = Number(match[1]);
	const lat = Number(match[2]);
	if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return void 0;
	return {
		lat: formatCoordinate(String(lat)),
		lon: formatCoordinate(String(lon))
	};
}
function formatCoordinate(value) {
	return Number(value).toFixed(2);
}
/** Accept a PEM pasted on one line or with literal `\n`. */
function normalizePrivateKey(value) {
	const key = value.replace(/\\n/g, "\n").trim();
	if (key.includes("\n")) return key;
	const match = /^(-----BEGIN [^-]+-----)\s+(.+)\s+(-----END [^-]+-----)$/.exec(key);
	if (match === null) return key;
	return `${match[1]}\n${match[2].replace(/\s+/g, "")}\n${match[3]}`;
}
export { Config, apply, inject, name, usage };

//# sourceMappingURL=index.js.map