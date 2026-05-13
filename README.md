# ChatLuna QWeather

![npm](https://img.shields.io/npm/v/koishi-plugin-chatluna-qweather) ![License](https://img.shields.io/badge/license-GPLv3-brightgreen)

为 ChatLuna 提供和风天气查询工具，支持城市搜索、天气预报、分钟级降水和空气质量。

## ✨ 功能特性

### 1. 🌦️ 单工具天气查询

- 单个 `qweather` 工具入口，LLM 只需要提供地点和查询类型。
- 支持城市名、LocationID、经纬度输入。
- 支持通过 `adm` 和 `range` 消除重名城市。

### 2. 🧭 多类型组合查询

- `weatherNow`：实时天气。
- `weatherDaily`：逐日天气预报。
- `weatherHourly`：逐小时天气预报。
- `minutelyPrecipitation`：分钟级降水，未来 2 小时每 5 分钟降水预报。
- `airCurrent`：实时空气质量。
- `airHourly`：未来 24 小时空气质量预报。
- `airDaily`：未来 3 天空气质量预报。

### 3. 🧠 自动坐标解析

- 对普通天气接口使用和风天气 LocationID。
- 对分钟级降水和空气质量接口自动使用经纬度。
- 用户只输入城市名时，会先通过 GeoAPI 解析城市，再使用返回的经纬度调用对应接口。

### 4. 🔐 JWT 与 API KEY 认证

- 默认使用 JWT 认证。
- 支持 API KEY 和 JWT 二选一。
- JWT 模式下插件会使用 Ed25519 私钥自动签名生成 Bearer Token。
- API KEY 固定通过请求头 `X-QW-Api-Key` 发送。

### 5. 🛡️ 无 Geo 数据缓存

- 插件不会缓存 GeoAPI、城市、经纬度、天气或空气质量响应。
- 每次工具调用都会重新请求和风天气接口。
- 仅会在内存中短期复用 JWT Token，不包含任何地理或天气数据。

## ⚙️ 主要配置

- `tool.*`：工具开关、名称、描述。
- `apiHost`：和风天气 API Host，例如 `abc1234xyz.def.qweatherapi.com`，可在[**和风天气控制台**](https://console.qweather.com/setting)查询。
- `authType`：认证方式，`jwt` 或 `apiKey`，默认 `jwt`。
- `apiKey`：选择 API KEY 认证时填写。
- `jwtKeyId`：JWT 凭据 ID，即 Header 中的 `kid`，在凭据详情页获取。
- `jwtProjectId`：JWT 项目 ID，即 Payload 中的 `sub`，在项目详情页获取。
- `jwtPrivateKey`：Ed25519 私钥 PEM，插件会自动生成请求用的 Bearer JWT。
- `jwtTtlSeconds`：JWT 有效期（秒）。
- `lang`：和风天气多语言代码，默认 `zh`。
- `unit`：天气数据单位，`m` 为公制，`i` 为英制。
- `locationNumber`：城市搜索返回候选数量。
- `defaultQueries`：模型未指定查询范围时的默认查询类型。
- `defaultDailyDays`：默认逐日预报天数。
- `defaultHourlyHours`：默认逐小时预报小时数。
- `defaultDailyLimit`、`defaultHourlyLimit`：模型未指定 `limit` 时的默认返回条数。
- `includeOtherLocations`：是否返回其他城市候选。
- `proxyMode`：代理模式，支持沿用 ChatLuna 全局代理、禁用代理、使用自定义代理。
- `proxyAddress`：自定义代理地址，仅在 `proxyMode=on` 时生效。

## 🧩 工具输入

- `location`：必填，城市名、LocationID 或 `经度,纬度`。
- `adm`：可选，上级行政区，例如 `陕西`、`北京`。
- `range`：可选，国家或地区 ISO 3166 代码，例如 `cn`、`us`。
- `queries`：可选，可同时选择多个查询类型，支持 `weatherNow`、`weatherDaily`、`weatherHourly`、`minutelyPrecipitation`、`airCurrent`、`airHourly`、`airDaily`。
- `days`：可选，`3d`、`7d`、`10d`、`15d`、`30d`。
- `hours`：可选，`24h`、`72h`、`168h`。
- `limit`：可选，限制返回的预报条数。

## ✅ 使用前置条件

- 必需：`koishi-plugin-chatluna`。
- 必需：和风天气 API Host。
- 必需：至少一种有效认证方式，推荐 JWT。
- 分钟级降水接口仅支持部分区域；不支持的地区会由和风天气接口返回错误。

## 🔑 JWT Debugger

如果选择 JWT 认证，可以用和风天气的离线 JWT Debugger 生成 Ed25519 密钥对。

1. 访问 [**JWT Debugger**](https://jwt.qweather.com)。
2. 在“🔑 生成 Ed25519 密钥”区域复制 `Public Key (PEM)` 和 `Private Key (PEM)`。
3. 将 `Public Key (PEM)` 上传到和风天气控制台创建 JWT 凭据。创建凭据时无需理会付费 API 提醒，本项目没有使用相关端点。
4. 在插件中填写控制台中的 `kid`（凭据 ID，凭据详情页获取）、`sub`（项目 ID，项目详情页获取），并将 `Private Key (PEM)` 填入私钥配置。

不需要复制 JWT Debugger 生成的 JWT Token；插件会在运行时用私钥自动生成请求所需的 Token。

## ⚠️ API KEY 限制提醒

和风天气正在将身份认证方式从 API KEY 逐步迁移到 JWT。自 2027 年 2 月 1 日起，API KEY 每日请求量将限制为 1000 次，JWT 不受该限制。

超过 API KEY 每日限制后，接口可能返回 403 或 429；若超限后仍大量请求，可能触发 IP 封禁或账号冻结。建议优先使用 JWT 认证。

## 🛡️ 使用声明

- 本项目仅供学习、研究与合规开发使用。
- 使用者应自行遵守和风天气服务条款、开发者协议与当地法律法规。
- 请勿将本插件用于任何违法、违规或违反第三方服务条款的行为，因不当使用产生的后果由使用者自行承担。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进代码。
