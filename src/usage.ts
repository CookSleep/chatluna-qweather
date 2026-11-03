export const usage = `## chatluna-qweather
提供和风天气查询工具 \`qweather\`：城市搜索、实时天气、逐日/逐小时预报、分钟级降水与空气质量。

### 认证
先在[**和风天气控制台**](https://console.qweather.com/setting)查看 API Host（形如 \`abc1234xyz.def.qweatherapi.com\`，不含路径），填入 \`apiHost\`，再选择一种认证方式。

#### JWT（推荐）
1. 打开和风天气的离线 [**JWT Debugger**](https://jwt.qweather.com)，在「🔑 生成 Ed25519 密钥」区域复制 \`Public Key (PEM)\` 和 \`Private Key (PEM)\`。
2. 在控制台中将 \`Public Key (PEM)\` 上传，创建 JWT 凭据。创建时出现的付费 API 提醒可以忽略，本插件不使用相关接口。
3. 在插件中填写：
   - \`jwtKeyId\`：凭据 ID，即 \`kid\`，在凭据详情页获取
   - \`jwtProjectId\`：项目 ID，即 \`sub\`，在项目详情页获取
   - \`jwtPrivateKey\`：第 1 步复制的 \`Private Key (PEM)\`

不需要复制 JWT Debugger 生成的 Token，插件会用私钥自动签发。

#### API KEY
将 \`authType\` 改为 \`API KEY\` 并填写 \`apiKey\`，通过请求头 \`X-QW-Api-Key\` 发送。

> 自 2027 年 2 月 1 日起，API KEY 每日限 1000 次请求，JWT 不受此限。超限后接口可能返回 403 或 429，继续大量请求可能导致 IP 封禁或账号冻结，建议优先使用 JWT。

### 工具参数
| 参数 | 说明 |
| --- | --- |
| \`location\` | 城市名、LocationID 或 \`经度,纬度\` |
| \`adm\` / \`range\` | 上级行政区 / ISO 3166 国家代码，用于区分重名城市 |
| \`queries\` | \`weatherNow\`、\`weatherDaily\`、\`weatherHourly\`、\`minutelyPrecipitation\`、\`airCurrent\`、\`airHourly\`、\`airDaily\`，可多选 |
| \`days\` / \`hours\` / \`limit\` | 逐日天数、逐小时小时数、返回条数 |

### 数据缓存
不缓存 GeoAPI、城市、经纬度、天气或空气质量响应，以遵守和风天气 ToS 中关于 Geo 数据缓存与再分发的限制；仅在内存中短期复用 JWT Token。

### 价格参考
适用于和风天气「天气和基础服务」，以[官网](https://dev.qweather.com/docs/finance/pricing/)为准。

| 请求量（每月） | 价格（每次请求） |
| --- | --- |
| 0～5 万 | CNY 0 |
| 之后的 95 万 | CNY 0.0007 |
| 之后的 400 万 | CNY 0.0005 |
| 之后的 500 万 | CNY 0.00035 |
| 之后的 4000 万 | CNY 0.00015 |
| 之后的 5000 万 | CNY 0.0001 |
| 超过 1 亿 | [联系官方](https://www.qweather.com/contact/) |`
