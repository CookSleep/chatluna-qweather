import { Schema } from 'koishi'

export interface Config {
    apiHost: string
    authType: 'apiKey' | 'jwt'
    apiKey?: string
    jwtKeyId?: string
    jwtProjectId?: string
    jwtPrivateKey?: string
    jwtTtlSeconds?: number
    lang: string
    unit: 'm' | 'i'
    timeoutSeconds: number
    locationNumber: number
    defaultQueries: QueryType[]
    defaultDailyDays: '3d' | '7d' | '10d' | '15d' | '30d'
    defaultHourlyHours: '24h' | '72h' | '168h'
    defaultDailyLimit: number
    defaultHourlyLimit: number
    includeOtherLocations: boolean
    debug: boolean
    proxyMode: 'system' | 'off' | 'on'
    proxyAddress?: string
    tool: {
        enabled: boolean
        name: string
        description: string
    }
}

export type QueryType = 'weatherNow' | 'weatherDaily' | 'weatherHourly' | 'minutelyPrecipitation' | 'airCurrent' | 'airHourly' | 'airDaily'

const QueryTypeSchema = Schema.union([
    Schema.const('weatherNow').description('实时天气'),
    Schema.const('weatherDaily').description('逐日天气预报'),
    Schema.const('weatherHourly').description('逐小时天气预报'),
    Schema.const('minutelyPrecipitation').description('分钟级降水'),
    Schema.const('airCurrent').description('实时空气质量'),
    Schema.const('airHourly').description('空气质量小时预报'),
    Schema.const('airDaily').description('空气质量每日预报')
])

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        tool: Schema.object({
            enabled: Schema.boolean().default(true).description('开启后自动注册 ChatLuna 工具'),
            name: Schema.string().default('qweather').description('工具名称'),
            description: Schema.string()
                .default('查询天气，输入城市名、LocationID 或经纬度，返回城市匹配、天气预报、分钟级降水或空气质量。')
                .description('工具描述')
        }).description('工具设置')
    }),
    Schema.object({
        apiHost: Schema.string().default('').description('和风天气 API Host，例如 `abc1234xyz.def.qweatherapi.com`，不要填写路径，可在[**和风天气控制台**](https://console.qweather.com/setting)查询'),
        authType: Schema.union([
            Schema.const('apiKey').description('API KEY'),
            Schema.const('jwt').description('JWT')
        ]).default('jwt').description('认证方式')
    }).description('和风天气认证'),
    Schema.union([
        Schema.object({
            authType: Schema.const('apiKey').required(),
            apiKey: Schema.string().role('secret').default('').description('和风天气 API KEY')
        }).description('API KEY 配置'),
        Schema.object({
            authType: Schema.const('jwt').required(),
            jwtKeyId: Schema.string().default('').description('JWT 凭据 ID，即 Header 中的 `kid`，在凭据详情页获取'),
            jwtProjectId: Schema.string().default('').description('JWT 项目 ID，即 Payload 中的 `sub`，在项目详情页获取'),
            jwtPrivateKey: Schema.string().role('textarea').role('secret').default('').description('Ed25519 私钥 PEM，插件会用它自动生成 Bearer JWT'),
            jwtTtlSeconds: Schema.number().default(900).min(60).max(86400).description('JWT 有效期（秒），最长 86400 秒')
        }).description('JWT 配置')
    ]),
    Schema.object({
        lang: Schema.string().default('zh').description('和风天气多语言代码，例如 `zh`、`en`、`ja`'),
        unit: Schema.union([
            Schema.const('m').description('公制'),
            Schema.const('i').description('英制')
        ]).default('m').description('天气数据单位'),
        timeoutSeconds: Schema.number().default(20).min(5).max(120).description('网络请求超时（秒）'),
        locationNumber: Schema.number().default(5).min(1).max(20).description('城市搜索返回候选数量'),
        defaultQueries: Schema.array(QueryTypeSchema).default(['weatherNow']).description('模型未指定查询范围时的默认查询类型'),
        defaultDailyDays: Schema.union([
            Schema.const('3d').description('3 天'),
            Schema.const('7d').description('7 天'),
            Schema.const('10d').description('10 天'),
            Schema.const('15d').description('15 天'),
            Schema.const('30d').description('30 天')
        ]).default('7d').description('默认逐日预报天数'),
        defaultHourlyHours: Schema.union([
            Schema.const('24h').description('24 小时'),
            Schema.const('72h').description('72 小时'),
            Schema.const('168h').description('168 小时')
        ]).default('24h').description('默认逐小时预报小时数'),
        defaultDailyLimit: Schema.number().default(7).min(1).max(30).description('模型未指定 limit 时最多返回几条逐日预报'),
        defaultHourlyLimit: Schema.number().default(24).min(1).max(168).description('模型未指定 limit 时最多返回几条逐小时预报'),
        includeOtherLocations: Schema.boolean().default(true).description('在输出中包含其他城市候选，便于模型判断是否需要澄清重名地点'),
        debug: Schema.boolean().default(false).description('输出调试日志')
    }).description('查询设置'),
    Schema.intersect([
        Schema.object({
            proxyMode: Schema.union([
                Schema.const('system').description('遵循 ChatLuna 主插件的全局代理设置'),
                Schema.const('off').description('禁用代理'),
                Schema.const('on').description('使用自定义代理设置')
            ]).default('system').description('代理模式')
        }),
        Schema.union([
            Schema.object({
                proxyMode: Schema.const('on').required(),
                proxyAddress: Schema.string().default('http://127.0.0.1:7897').description('自定义代理地址')
            }),
            Schema.object({
                proxyMode: Schema.const('off').required()
            }),
            Schema.object({
                proxyMode: Schema.const('system')
            })
        ])
    ])
])

export const name = 'chatluna-qweather'

export const usage = `## chatluna-qweather
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

超过 API KEY 每日限制后，接口可能返回 403 或 429；若超限后仍大量请求，可能触发 IP 封禁或账号冻结。建议优先使用 JWT 认证。`

export const inject = {
    required: ['chatluna']
}
