import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toolSpec } from '@chatluna/tool'
import { apply, Config } from 'chatluna-plugin-qweather'

function register(http, options = {}) {
  let tool
  apply({ tools: { define(value) { tool = value } }, http }, Config({
    apiHost: 'weather.example', authType: 'apiKey', apiKey: 'test', ...options
  }))
  return tool
}

test('关闭工具时不注册天气查询', () => {
  assert.equal(register(() => assert.fail('不应发送请求'), { tool: { enabled: false } }), undefined)
})

const city = { location: [{ name: '北京', id: '101010100', lat: '39.90', lon: '116.40' }] }

test('只传城市名时查询实时天气，单项失败时保留其他结果', async () => {
  const controller = new AbortController()
  const tool = register(async (url, options) => {
    assert.equal(options.signal, controller.signal)
    if (url.pathname.startsWith('/geo/')) {
      assert.equal(url.searchParams.get('location'), '北京')
      return Response.json(city)
    }
    if (url.pathname.endsWith('/now')) return Response.json({ now: { temp: '12' } })
    return Response.json({ code: '403' }, { status: 403 })
  })
  assert.deepEqual(toolSpec(tool).parameters.required, ['location'])
  const args = tool.args({ location: '北京' })
  const result = await tool.run(args, controller)
  assert.equal(result.location.name, '北京')
  assert.deepEqual(result.query.queries, ['weatherNow'])
  const partial = await tool.run({ ...args, queries: ['weatherNow', 'airDaily'] }, controller)
  assert.ok(partial.now)
  assert.match(partial.errors.airDaily, /403/)
})

test('清空默认查询后，只给城市仍查实时天气', async () => {
  const tool = register(async url => {
    if (url.pathname.startsWith('/geo/')) return Response.json(city)
    assert.equal(url.pathname, '/v7/weather/now')
    return Response.json({ now: { temp: '12' } })
  }, { defaultQueries: [] })
  const result = await tool.run(tool.args({ location: '北京' }), new AbortController())
  assert.deepEqual(result.query.queries, ['weatherNow'])
  assert.equal(result.now.temp, '12°C')
})

for (const phase of ['城市查询', '并行天气和空气质量查询']) {
  test(phase + '进行中可以取消', async () => {
    const controller = new AbortController()
    const ready = Promise.withResolvers()
    const expected = phase === '城市查询' ? 1 : 2
    let started = 0
    let stopped = 0
    const tool = register(async (url, { signal }) => {
      if (expected === 2 && url.pathname.startsWith('/geo/')) return Response.json(city)
      assert.equal(signal, controller.signal)
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { stopped++; reject(signal.reason) }, { once: true })
        if (++started === expected) ready.resolve()
      })
    })
    const running = tool.run({ location: '北京', queries: ['weatherNow', 'airDaily'] }, controller)
    await Promise.race([ready.promise, running])
    controller.abort()
    await assert.rejects(running, error => error === controller.signal.reason)
    assert.equal(stopped, expected)
  })
}
