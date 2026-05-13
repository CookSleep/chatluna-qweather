var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(index_exports);
var import_tools = require("@langchain/core/tools");
var import_node_crypto = require("node:crypto");
var import_request = require("koishi-plugin-chatluna/utils/request");
var import_zod = require("zod");

// src/config.ts
var import_koishi = require("koishi");
var QueryTypeSchema = import_koishi.Schema.union([
  import_koishi.Schema.const("weatherNow").description("实时天气"),
  import_koishi.Schema.const("weatherDaily").description("逐日天气预报"),
  import_koishi.Schema.const("weatherHourly").description("逐小时天气预报"),
  import_koishi.Schema.const("minutelyPrecipitation").description("分钟级降水"),
  import_koishi.Schema.const("airCurrent").description("实时空气质量"),
  import_koishi.Schema.const("airHourly").description("空气质量小时预报"),
  import_koishi.Schema.const("airDaily").description("空气质量每日预报")
]);
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    tool: import_koishi.Schema.object({
      enabled: import_koishi.Schema.boolean().default(true).description("开启后自动注册 ChatLuna 工具"),
      name: import_koishi.Schema.string().default("qweather").description("工具名称"),
      description: import_koishi.Schema.string().default("查询天气，输入城市名、LocationID 或经纬度，返回城市匹配、天气预报、分钟级降水或空气质量。").description("工具描述")
    }).description("工具设置")
  }),
  import_koishi.Schema.object({
    apiHost: import_koishi.Schema.string().default("").description("和风天气 API Host，例如 `abc1234xyz.def.qweatherapi.com`，不要填写路径，可在[**和风天气控制台**](https://console.qweather.com/setting)查询"),
    authType: import_koishi.Schema.union([
      import_koishi.Schema.const("apiKey").description("API KEY"),
      import_koishi.Schema.const("jwt").description("JWT")
    ]).default("jwt").description("认证方式"),
    apiKey: import_koishi.Schema.string().role("secret").default("").description("选择 API KEY 认证时填写。API KEY 固定通过请求头 `X-QW-Api-Key` 发送"),
    jwtKeyId: import_koishi.Schema.string().default("").description("选择 JWT 认证时填写。JWT 凭据 ID，即 Header 中的 `kid`，在凭据详情页获取"),
    jwtProjectId: import_koishi.Schema.string().default("").description("选择 JWT 认证时填写。JWT 项目 ID，即 Payload 中的 `sub`，在项目详情页获取"),
    jwtPrivateKey: import_koishi.Schema.string().role("textarea").role("secret").default("").description("选择 JWT 认证时填写。Ed25519 私钥 PEM，插件会用它自动生成 Bearer JWT"),
    jwtTtlSeconds: import_koishi.Schema.number().default(900).min(60).max(86400).description("JWT 有效期（秒），最长 86400 秒")
  }).description("和风天气认证"),
  import_koishi.Schema.object({
    lang: import_koishi.Schema.string().default("zh").description("和风天气多语言代码，例如 `zh`、`en`、`ja`"),
    unit: import_koishi.Schema.union([
      import_koishi.Schema.const("m").description("公制"),
      import_koishi.Schema.const("i").description("英制")
    ]).default("m").description("天气数据单位"),
    timeoutSeconds: import_koishi.Schema.number().default(20).min(5).max(120).description("网络请求超时（秒）"),
    locationNumber: import_koishi.Schema.number().default(5).min(1).max(20).description("城市搜索返回候选数量"),
    defaultQueries: import_koishi.Schema.array(QueryTypeSchema).default(["weatherNow"]).description("模型未指定查询范围时的默认查询类型"),
    defaultDailyDays: import_koishi.Schema.union([
      import_koishi.Schema.const("3d").description("3 天"),
      import_koishi.Schema.const("7d").description("7 天"),
      import_koishi.Schema.const("10d").description("10 天"),
      import_koishi.Schema.const("15d").description("15 天"),
      import_koishi.Schema.const("30d").description("30 天")
    ]).default("7d").description("默认逐日预报天数"),
    defaultHourlyHours: import_koishi.Schema.union([
      import_koishi.Schema.const("24h").description("24 小时"),
      import_koishi.Schema.const("72h").description("72 小时"),
      import_koishi.Schema.const("168h").description("168 小时")
    ]).default("24h").description("默认逐小时预报小时数"),
    defaultDailyLimit: import_koishi.Schema.number().default(7).min(1).max(30).description("模型未指定 limit 时最多返回几条逐日预报"),
    defaultHourlyLimit: import_koishi.Schema.number().default(24).min(1).max(168).description("模型未指定 limit 时最多返回几条逐小时预报"),
    includeOtherLocations: import_koishi.Schema.boolean().default(true).description("在输出中包含其他城市候选，便于模型判断是否需要澄清重名地点"),
    debug: import_koishi.Schema.boolean().default(false).description("输出调试日志")
  }).description("查询设置"),
  import_koishi.Schema.intersect([
    import_koishi.Schema.object({
      proxyMode: import_koishi.Schema.union([
        import_koishi.Schema.const("system").description("遵循 ChatLuna 主插件的全局代理设置"),
        import_koishi.Schema.const("off").description("禁用代理"),
        import_koishi.Schema.const("on").description("使用自定义代理设置")
      ]).default("system").description("代理模式")
    }),
    import_koishi.Schema.union([
      import_koishi.Schema.object({
        proxyMode: import_koishi.Schema.const("on").required(),
        proxyAddress: import_koishi.Schema.string().default("http://127.0.0.1:7897").description("自定义代理地址")
      }),
      import_koishi.Schema.object({
        proxyMode: import_koishi.Schema.const("off").required()
      }),
      import_koishi.Schema.object({
        proxyMode: import_koishi.Schema.const("system")
      })
    ])
  ])
]);
var name = "chatluna-qweather";
var usage = `## chatluna-qweather
为 ChatLuna 提供和风天气查询工具。

### 能力
- 城市搜索：支持城市名、LocationID、经纬度，并可用上级行政区消除重名。
- 实时天气：温度、体感温度、天气状况、风、湿度、降水、气压、能见度等。
- 逐日预报：最高/最低温度、白天/夜间天气、风、湿度、降水、紫外线等。
- 逐小时预报：温度、天气状况、风、湿度、降水概率、降水、气压等。
- 分钟级降水：未来 2 小时每 5 分钟降水预报，需接口支持查询地区。
- 空气质量：实时空气质量、未来 24 小时空气质量预报、未来 3 天空气质量预报。

### LLM 工具输入
模型只需要提供地点和查询范围：
- \`location\`：城市名、LocationID 或 \`经度,纬度\`。
- \`adm\`：可选，上级行政区，用于排除重名城市。
- \`queries\`：可选，可同时选择多个查询类型：\`weatherNow\`、\`weatherDaily\`、\`weatherHourly\`、\`minutelyPrecipitation\`、\`airCurrent\`、\`airHourly\`、\`airDaily\`。
- \`days\`：可选，逐日预报天数。
- \`hours\`：可选，逐小时预报小时数。
- \`limit\`：可选，限制返回的预报条数。

### 数据缓存
插件不会缓存 GeoAPI、城市、经纬度、天气或空气质量响应，每次工具调用都会重新请求和风天气接口，以避免违反和风天气 ToS 中关于 Geo 数据缓存与再分发的限制。插件仅会在内存中短期复用 JWT Token，不包含任何地理或天气数据。

### 认证
请先在[**和风天气控制台**](https://console.qweather.com/setting)查看你的 API Host，并在 API KEY 和 JWT 中选择一种认证方式。

### JWT Debugger
如果选择 JWT 认证，可以用和风天气的离线 JWT Debugger 生成 Ed25519 密钥对：

1. 访问 [**JWT Debugger**](https://jwt.qweather.com)。
2. 在“🔑 生成 Ed25519 密钥”区域复制 \`Public Key (PEM)\` 和 \`Private Key (PEM)\`。
3. 将 \`Public Key (PEM)\` 上传到和风天气控制台创建 JWT 凭据。创建凭据时无需理会付费 API 提醒，本项目没有使用相关端点。
4. 在插件中填写控制台中的 \`kid\`（凭据 ID，凭据详情页获取）、\`sub\`（项目 ID，项目详情页获取），并将 \`Private Key (PEM)\` 填入私钥配置。

不需要复制 JWT Debugger 生成的 JWT Token；插件会在运行时用私钥自动生成请求所需的 Token。

### API KEY 限制提醒
和风天气正在将身份认证方式从 API KEY 逐步迁移到 JWT。自 2027 年 2 月 1 日起，API KEY 每日请求量将限制为 1000 次，JWT 不受该限制。

超过 API KEY 每日限制后，接口可能返回 403 或 429；若超限后仍大量请求，可能触发 IP 封禁或账号冻结。建议优先使用 JWT 认证。

### 价格参考
以下价格适用于和风天气“天气和基础服务”，覆盖天气预报、分钟预报、预警、天气指数、空气质量、时光机、GeoAPI、天文、控制台 API。

| 请求量（每月） | 价格（每次请求） |
| --- | --- |
| 0~5 万 | CNY 0 |
| 之后的 95 万 | CNY 0.0007 |
| 之后的 400 万 | CNY 0.0005 |
| 之后的 500 万 | CNY 0.00035 |
| 之后的 4000 万 | CNY 0.00015 |
| 之后的 5000 万 | CNY 0.0001 |
| 超过 1 亿 | [联系官方](https://www.qweather.com/contact/) |`;
var inject = {
  required: ["chatluna"]
};

// src/index.ts
var querySchema = import_zod.z.enum(["weatherNow", "weatherDaily", "weatherHourly", "minutelyPrecipitation", "airCurrent", "airHourly", "airDaily"]);
var schema = import_zod.z.object({
  location: import_zod.z.string().describe("要查询天气的城市名、LocationID 或英文逗号分隔的经度,纬度。"),
  adm: import_zod.z.string().optional().describe("可选，上级行政区，用于消除重名城市，例如“陕西”“北京”。"),
  range: import_zod.z.string().optional().describe("可选，国家或地区范围，使用 ISO 3166 代码，例如“cn”“us”。"),
  queries: import_zod.z.array(querySchema).optional().describe("可选，可同时查询多个类型：weatherNow、weatherDaily、weatherHourly、minutelyPrecipitation、airCurrent、airHourly、airDaily。"),
  days: import_zod.z.enum(["3d", "7d", "10d", "15d", "30d"]).optional().describe("可选，逐日预报天数。"),
  hours: import_zod.z.enum(["24h", "72h", "168h"]).optional().describe("可选，逐小时预报小时数。"),
  limit: import_zod.z.number().int().min(1).max(168).optional().describe("可选，限制返回的预报条数；对预报类查询生效。")
});
var QWeatherTool = class extends import_tools.StructuredTool {
  constructor(ctx, cfg) {
    super({});
    this.ctx = ctx;
    this.cfg = cfg;
    this.name = (cfg.tool.name || "qweather").trim();
    this.description = (cfg.tool.description || "").trim() || "查询天气，输入城市名、LocationID 或经纬度，返回城市匹配、天气预报、分钟级降水或空气质量。";
  }
  static {
    __name(this, "QWeatherTool");
  }
  name;
  description;
  schema = schema;
  jwtToken = "";
  jwtExpiresAt = 0;
  async _call(input, _runManager, _runnable) {
    const log = this.ctx.logger(name);
    const queries = normalizeQueries(input.queries, this.cfg.defaultQueries);
    const days = input.days || this.cfg.defaultDailyDays;
    const hours = input.hours || this.cfg.defaultHourlyHours;
    try {
      const city = await this.get("/geo/v2/city/lookup", {
        location: input.location.trim(),
        adm: input.adm?.trim(),
        range: input.range?.trim(),
        number: String(this.cfg.locationNumber),
        lang: this.cfg.lang
      });
      if (!city.location?.length) {
        return "没有找到匹配的城市或地区。";
      }
      const matched = city.location[0];
      const coordinates = getCoordinates(input.location, matched);
      const calls = [];
      if (queries.includes("weatherNow")) {
        calls.push(this.get("/v7/weather/now", {
          location: matched.id,
          lang: this.cfg.lang,
          unit: this.cfg.unit
        }));
      }
      if (queries.includes("weatherDaily")) {
        calls.push(this.get(`/v7/weather/${days}`, {
          location: matched.id,
          lang: this.cfg.lang,
          unit: this.cfg.unit
        }));
      }
      if (queries.includes("weatherHourly")) {
        calls.push(this.get(`/v7/weather/${hours}`, {
          location: matched.id,
          lang: this.cfg.lang,
          unit: this.cfg.unit
        }));
      }
      if (queries.includes("minutelyPrecipitation")) {
        calls.push(this.get("/v7/minutely/5m", {
          location: `${coordinates.lon},${coordinates.lat}`,
          lang: this.cfg.lang
        }));
      }
      if (queries.includes("airCurrent")) {
        calls.push(this.get(`/airquality/v1/current/${coordinates.lat}/${coordinates.lon}`, {
          lang: this.cfg.lang
        }));
      }
      if (queries.includes("airHourly")) {
        calls.push(this.get(`/airquality/v1/hourly/${coordinates.lat}/${coordinates.lon}`, {
          lang: this.cfg.lang,
          localTime: "true"
        }));
      }
      if (queries.includes("airDaily")) {
        calls.push(this.get(`/airquality/v1/daily/${coordinates.lat}/${coordinates.lon}`, {
          lang: this.cfg.lang,
          localTime: "true"
        }));
      }
      const results = await Promise.all(calls);
      let next = 0;
      const now = queries.includes("weatherNow") ? results[next++] : void 0;
      const daily = queries.includes("weatherDaily") ? results[next++] : void 0;
      const hourly = queries.includes("weatherHourly") ? results[next++] : void 0;
      const minutely = queries.includes("minutelyPrecipitation") ? results[next++] : void 0;
      const airCurrent = queries.includes("airCurrent") ? results[next++] : void 0;
      const airHourly = queries.includes("airHourly") ? results[next++] : void 0;
      const airDaily = queries.includes("airDaily") ? results[next++] : void 0;
      return JSON.stringify(compact(this.format(city, matched, queries, days, hours, input.limit, coordinates, now, daily, hourly, minutely, airCurrent, airHourly, airDaily)), null, 2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (this.cfg.debug) {
        log.error(err);
      }
      return `和风天气查询失败：${msg}`;
    }
  }
  format(city, matched, queries, days, hours, limit, coordinates, now, daily, hourly, minutely, airCurrent, airHourly, airDaily) {
    const units = this.cfg.unit === "i" ? { temp: "°F", wind: "mph", precip: "inch", vis: "mile", pressure: "hPa" } : { temp: "°C", wind: "km/h", precip: "mm", vis: "km", pressure: "hPa" };
    const dailyLimit = Math.min(limit || this.cfg.defaultDailyLimit, daily?.daily.length || 0);
    const hourlyLimit = Math.min(limit || this.cfg.defaultHourlyLimit, hourly?.hourly.length || 0);
    const minutelyLimit = Math.min(limit || 24, minutely?.minutely.length || 0);
    const airHourlyLimit = Math.min(limit || 24, airHourly?.hours?.length || 0);
    const airDailyLimit = Math.min(limit || 3, airDaily?.days?.length || 0);
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
      otherLocations: this.cfg.includeOtherLocations ? (city.location || []).slice(1).map((item) => ({
        name: item.name,
        id: item.id,
        adm2: item.adm2,
        adm1: item.adm1,
        country: item.country
      })) : void 0,
      query: {
        queries,
        days: daily ? days : void 0,
        hours: hourly ? hours : void 0,
        unit: this.cfg.unit,
        lang: this.cfg.lang
      },
      now: now ? {
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
        dew: now.now.dew ? `${now.now.dew}${units.temp}` : void 0,
        link: now.fxLink
      } : void 0,
      daily: daily ? {
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
      } : void 0,
      hourly: hourly ? {
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
          dew: item.dew ? `${item.dew}${units.temp}` : void 0
        })),
        link: hourly.fxLink
      } : void 0,
      minutelyPrecipitation: minutely ? {
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
      } : void 0,
      airCurrent: airCurrent ? {
        indexes: formatAirIndexes(airCurrent.indexes),
        pollutants: formatAirPollutants(airCurrent.pollutants),
        stations: airCurrent.stations
      } : void 0,
      airHourly: airHourly?.hours ? {
        returned: airHourlyLimit,
        total: airHourly.hours.length,
        truncated: airHourlyLimit < airHourly.hours.length,
        items: airHourly.hours.slice(0, airHourlyLimit).map((item) => ({
          time: item.forecastTime,
          indexes: formatAirIndexes(item.indexes),
          pollutants: formatAirPollutants(item.pollutants)
        }))
      } : void 0,
      airDaily: airDaily?.days ? {
        returned: airDailyLimit,
        total: airDaily.days.length,
        truncated: airDailyLimit < airDaily.days.length,
        items: airDaily.days.slice(0, airDailyLimit).map((item) => ({
          startTime: item.forecastStartTime,
          endTime: item.forecastEndTime,
          indexes: formatAirIndexes(item.indexes),
          pollutants: formatAirPollutants(item.pollutants)
        }))
      } : void 0,
      refer: now?.refer || daily?.refer || hourly?.refer || minutely?.refer || city.refer
    };
  }
  async get(path, params) {
    const host = this.cfg.apiHost.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const url = new URL(`https://${host}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    const headers = {
      Accept: "application/json"
    };
    if (this.cfg.authType === "apiKey") {
      headers["X-QW-Api-Key"] = (this.cfg.apiKey || "").trim();
    } else {
      headers.Authorization = `Bearer ${this.getJwtToken()}`;
    }
    const response = await request(url.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(this.cfg.timeoutSeconds * 1e3)
    }, this.cfg);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${data.code ? `，和风天气状态码 ${data.code}` : ""}`);
    }
    if (data.code && data.code !== "200") {
      throw new Error(`和风天气状态码 ${data.code}`);
    }
    return data;
  }
  getJwtToken() {
    if (this.jwtToken && Date.now() + 6e4 < this.jwtExpiresAt) {
      return this.jwtToken;
    }
    const iat = Math.floor(Date.now() / 1e3) - 30;
    const exp = iat + (this.cfg.jwtTtlSeconds || 900);
    const header = Buffer.from(JSON.stringify({ alg: "EdDSA", kid: (this.cfg.jwtKeyId || "").trim() })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: (this.cfg.jwtProjectId || "").trim(), iat, exp })).toString("base64url");
    const data = `${header}.${payload}`;
    const privateKey = (0, import_node_crypto.createPrivateKey)(normalizePrivateKey(this.cfg.jwtPrivateKey || ""));
    const signature = (0, import_node_crypto.sign)(null, Buffer.from(data), privateKey).toString("base64url");
    this.jwtToken = `${data}.${signature}`;
    this.jwtExpiresAt = exp * 1e3;
    return this.jwtToken;
  }
};
function compact(value) {
  if (Array.isArray(value)) return value.map((item) => compact(item));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === void 0 || item === "") continue;
    const next = compact(item);
    if (Array.isArray(next) && next.length === 0) continue;
    out[key] = next;
  }
  return out;
}
__name(compact, "compact");
function normalizeQueries(input, defaults) {
  const queries = input?.length ? input : defaults?.length ? defaults : ["weatherNow"];
  return Array.from(new Set(queries));
}
__name(normalizeQueries, "normalizeQueries");
function getCoordinates(input, matched) {
  const parsed = parseCoordinates(input);
  if (parsed) return parsed;
  return {
    lat: formatCoordinate(matched.lat),
    lon: formatCoordinate(matched.lon)
  };
}
__name(getCoordinates, "getCoordinates");
function parseCoordinates(input) {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return void 0;
  const lon = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return void 0;
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return void 0;
  return {
    lat: formatCoordinate(String(lat)),
    lon: formatCoordinate(String(lon))
  };
}
__name(parseCoordinates, "parseCoordinates");
function formatCoordinate(value) {
  return Number(value).toFixed(2);
}
__name(formatCoordinate, "formatCoordinate");
function formatAirIndexes(indexes) {
  return indexes?.map((item) => ({
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
__name(formatAirIndexes, "formatAirIndexes");
function formatAirPollutants(pollutants) {
  return pollutants?.map((item) => ({
    code: item.code,
    name: item.name,
    fullName: item.fullName,
    concentration: `${item.concentration.value}${item.concentration.unit}`
  }));
}
__name(formatAirPollutants, "formatAirPollutants");
function normalizePrivateKey(value) {
  const key = value.replace(/\\n/g, "\n").trim();
  if (key.includes("\n")) return key;
  const match = key.match(/^(-----BEGIN [^-]+-----)\s+(.+)\s+(-----END [^-]+-----)$/);
  if (!match) return key;
  return `${match[1]}
${match[2].replace(/\s+/g, "")}
${match[3]}`;
}
__name(normalizePrivateKey, "normalizePrivateKey");
function request(url, init, cfg) {
  switch (cfg.proxyMode) {
    case "system":
      return (0, import_request.chatLunaFetch)(url, init);
    case "off":
      return (0, import_request.chatLunaFetch)(url, init, "null");
    case "on":
      return (0, import_request.chatLunaFetch)(url, init, cfg.proxyAddress);
  }
}
__name(request, "request");
function apply(ctx, cfg) {
  const log = ctx.logger(name);
  ctx.on("ready", async () => {
    if (!cfg.tool.enabled) return;
    if (!cfg.apiHost.trim()) {
      log.warn("未配置和风天气 API Host，跳过注册 ChatLuna 工具。");
      return;
    }
    if (cfg.authType === "apiKey" && !(cfg.apiKey || "").trim()) {
      log.warn("未配置和风天气 API KEY，跳过注册 ChatLuna 工具。");
      return;
    }
    if (cfg.authType === "jwt" && (!(cfg.jwtKeyId || "").trim() || !(cfg.jwtProjectId || "").trim() || !(cfg.jwtPrivateKey || "").trim())) {
      log.warn("未完整配置和风天气 JWT 信息，跳过注册 ChatLuna 工具。");
      return;
    }
    const toolName = (cfg.tool.name || "qweather").trim() || "qweather";
    const tool = new QWeatherTool(ctx, cfg);
    ctx.effect(() => ctx.chatluna.platform.registerTool(toolName, {
      description: tool.description,
      selector() {
        return true;
      },
      createTool() {
        return new QWeatherTool(ctx, cfg);
      },
      meta: {
        source: "extension",
        group: "qweather",
        tags: ["qweather", "weather"],
        defaultAvailability: {
          enabled: true,
          main: true,
          chatluna: true,
          characterScope: "all"
        }
      }
    }));
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  usage
});
