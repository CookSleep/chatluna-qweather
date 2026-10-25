<div align="center">

# ChatLuna QWeather

[![npm](https://img.shields.io/npm/v/koishi-plugin-chatluna-qweather?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-chatluna-qweather)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)](package.json)

**让 ChatLuna 查和风天气**

为 [ChatLuna](https://github.com/ChatLunaLab/chatluna) 提供一个 `qweather` 工具，模型只需给出地点和想查的内容。<br>
支持实时天气、逐日与逐小时预报、分钟级降水和空气质量，数据来自[和风天气](https://www.qweather.com/)。

</div>

---

## ✨ 功能

### 📍 找到地点
- **多种输入**：城市名、和风天气 LocationID，或 `经度,纬度`。
- **消除重名**：可用上级行政区（如「陕西」）和 ISO 3166 国家或地区代码（如 `cn`）缩小范围；默认在结果中附上其他候选城市，方便模型判断是否需要追问。
- **自动换算坐标**：天气接口用 LocationID，分钟级降水和空气质量接口用经纬度，由插件先通过 GeoAPI 查出再调用。

### 🌦️ 查询类型
一次调用可以同时查多种：

- **`weatherNow`**：实时天气，包括温度、体感温度、天气状况、风、湿度、降水、气压、能见度等。
- **`weatherDaily`**：逐日预报，3 / 7 / 10 / 15 / 30 天，包括最高最低温度、白天夜间天气、风、湿度、降水、紫外线等。
- **`weatherHourly`**：逐小时预报，24 / 72 / 168 小时，包括温度、天气状况、风、湿度、降水概率、降水、气压等。
- **`minutelyPrecipitation`**：未来 2 小时每 5 分钟的降水预报，只支持部分地区，不支持的地区由接口返回错误。
- **`airCurrent` / `airHourly` / `airDaily`**：实时空气质量、未来 24 小时与未来 3 天的空气质量预报。

模型未指定时，默认只查实时天气；可以用 `limit` 限制返回的预报条数。

### 🔐 认证
- **JWT（默认）**：填写凭据 ID、项目 ID 与 Ed25519 私钥，插件在运行时自动签发 Bearer Token。
- **API KEY**：通过请求头 `X-QW-Api-Key` 发送。

---

## ✅ 前置条件

- Koishi，以及已安装的 [ChatLuna](https://github.com/ChatLunaLab/chatluna)（`koishi-plugin-chatluna` 1.3.36 及以上）。
- 和风天气账号、API Host，以及 JWT 或 API KEY 中的一种认证方式（推荐 JWT）。

## 📦 安装

在 Koishi 控制台的插件市场中搜索 `chatluna-qweather` 安装，或在 Koishi 项目目录中运行：

```bash
npm install koishi-plugin-chatluna-qweather
```

## 🔑 配置认证

1. 在[和风天气控制台](https://console.qweather.com/setting)查看你的 API Host（形如 `abc1234xyz.def.qweatherapi.com`，不带路径），填入 `apiHost`。
2. 选择认证方式。

**JWT**

1. 打开和风天气的离线 [JWT Debugger](https://jwt.qweather.com)，在「🔑 生成 Ed25519 密钥」区域复制 `Public Key (PEM)` 和 `Private Key (PEM)`。
2. 把 `Public Key (PEM)` 上传到和风天气控制台，创建 JWT 凭据。创建时出现的付费 API 提醒可以忽略，本插件不使用相关接口。
3. 在插件中填写 `jwtKeyId`（即 `kid`，凭据详情页获取）、`jwtProjectId`（即 `sub`，项目详情页获取），把 `Private Key (PEM)` 填入 `jwtPrivateKey`。

不需要复制 JWT Debugger 生成的 Token，插件会用私钥自动生成。Token 有效期默认 900 秒，最长 86400 秒。

**API KEY**

把 `authType` 改为 `apiKey`，填写 `apiKey`。

> 和风天气正在把认证方式从 API KEY 迁移到 JWT。自 2027 年 2 月 1 日起，API KEY 每天限 1000 次请求，JWT 不受此限。超限后接口可能返回 403 或 429，继续大量请求可能导致 IP 封禁或账号冻结，建议优先使用 JWT。

## ⚙️ 配置

| 配置项 | 说明 |
| --- | --- |
| `tool` | 是否注册工具、工具名（默认 `qweather`）、工具描述。 |
| `apiHost`、`authType` 及认证字段 | 见上一节。 |
| `lang` | 和风天气多语言代码，默认 `zh`。 |
| `unit` | `m` 公制（默认）或 `i` 英制。 |
| `timeoutSeconds` | 网络请求超时，默认 20 秒。 |
| `locationNumber` | 城市搜索返回的候选数，默认 5。 |
| `defaultQueries` | 模型未指定时的查询类型，默认 `weatherNow`。 |
| `defaultDailyDays`、`defaultHourlyHours` | 默认逐日预报天数（7 天）与逐小时预报小时数（24 小时）。 |
| `defaultDailyLimit`、`defaultHourlyLimit` | 模型未指定 `limit` 时返回的逐日（7 条）、逐小时（24 条）预报条数。 |
| `includeOtherLocations` | 是否在结果中附上其他候选城市，默认开启。 |
| `proxyMode` | 代理：沿用 ChatLuna 的全局代理（默认）、禁用，或使用 `proxyAddress` 指定的代理。 |
| `debug` | 输出调试日志。 |

## 💰 价格参考

以下价格适用于和风天气「天气和基础服务」，覆盖天气预报、分钟预报、预警、天气指数、空气质量、时光机、GeoAPI、天文、控制台 API。仅供参考，以和风天气官网为准。

| 请求量（每月） | 价格（每次请求） |
| --- | --- |
| 0～5 万 | CNY 0 |
| 之后的 95 万 | CNY 0.0007 |
| 之后的 400 万 | CNY 0.0005 |
| 之后的 500 万 | CNY 0.00035 |
| 之后的 4000 万 | CNY 0.00015 |
| 之后的 5000 万 | CNY 0.0001 |
| 超过 1 亿 | [联系官方](https://www.qweather.com/contact/) |

## 🔒 数据与缓存

- 插件不缓存 GeoAPI、城市、经纬度、天气或空气质量的响应，每次调用都重新请求和风天气接口，以免违反和风天气服务条款中关于 Geo 数据缓存与再分发的限制。
- 只在内存中短期复用 JWT Token，其中不含任何地理或天气数据。

## ⚠️ 使用声明

- 本项目仅供学习、研究与合规开发使用。
- 使用者应自行遵守和风天气服务条款、开发者协议与当地法律法规。
- 请勿将本插件用于任何违法、违规或违反第三方服务条款的行为，因不当使用产生的后果由使用者自行承担。

## 📄 许可

本项目以 GPL-3.0 许可发布（见 [`package.json`](package.json) 的 `license` 字段）。

## 🙏 致谢

- [ChatLuna](https://github.com/ChatLunaLab/chatluna)：插件所扩展的 Koishi 大模型对话框架。
- [Koishi](https://koishi.chat/)：机器人框架。
- [和风天气](https://www.qweather.com/)：提供 GeoAPI、天气与空气质量接口。
