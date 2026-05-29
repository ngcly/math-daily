const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist', 'build', 'mp-weixin')

const pageBackgrounds = {
  'pages/index/index.json': '@bgPaper',
  'pages/draft/index.json': '@bgYellow',
  'pages/result/index.json': '@bgWhite',
  'pages/history/index.json': '@bgPaper',
  'pages/settings/index.json': '@bgPaper',
}

function patchJson(relativePath, patch) {
  const file = path.join(dist, relativePath)
  if (!fs.existsSync(file)) return

  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  patch(json)
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
}

patchJson('app.json', (json) => {
  json.window ||= {}
  json.window.backgroundColorTop = '@bgPaper'
  json.window.backgroundColorBottom = '@bgPaper'
})

for (const [relativePath, color] of Object.entries(pageBackgrounds)) {
  patchJson(relativePath, (json) => {
    json.backgroundColorTop = color
    json.backgroundColorBottom = color
  })
}
