#!/usr/bin/env bash
set -euo pipefail
umask 022

# 在已完成锁定安装的 ChatLuna 工作区内验证 npm 压缩包。
plugin=$(cd "$(dirname "$0")/.." && pwd)
host=$(cd "$1" && pwd)
out=$(mkdir -p "$2" && cd "$2" && pwd)
cd "$host"
node .yarn/releases/yarn-4.18.1.cjs yakumo build @chatluna/tool @chatluna/schema @chatluna/utils @chatluna/message @chatluna/schema-ts @chatluna/symbol

stage=$(mktemp -d "$host/external-qweather-XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/plugin" "$stage/node_modules/chatluna-plugin-qweather"
cp -r "$plugin"/{src,tsconfig.json,package.json,README.md,LICENSE} "$stage/plugin/"
cd "$stage/plugin"
"$host/node_modules/.bin/tsc" -p tsconfig.json
chmod 644 package.json README.md LICENSE lib/*
archive=$(npm pack --pack-destination "$out" --silent)
tar -xzf "$out/$archive" --strip-components=1 -C "$stage/node_modules/chatluna-plugin-qweather"
cp "$plugin/tests/packed.mjs" "$stage/test.mjs"
node "$stage/test.mjs"
