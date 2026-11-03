export const usage = `## chatluna-qweather
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
每月前 5 万次免费，之后每次 CNY 0.0001～0.0007，详见[官网](https://dev.qweather.com/docs/finance/pricing/)。`
