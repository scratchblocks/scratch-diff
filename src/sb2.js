
const fs = require('fs')

const Zip = require('node-zip')


function parseJSONish(json) {
  // taken from nathan/phosphorus
  if (!/^\s*\{/.test(json)) throw new SyntaxError('Bad JSON')
  try {
    return JSON.parse(json)
  } catch (e) {}
  if (/[^,:{}\[\]0-9\.\-+EINaefilnr-uy \n\r\t]/.test(json.replace(/"(\\.|[^"\\])*"/g, ''))) {
    throw new SyntaxError('Bad JSON')
  }
  return (1, eval)('(' + json + ')')
}


class Project {
  static load(path) {
    let content = fs.readFileSync(path)
    let zip = new Zip(content)
    let project = parseJSONish(zip.file('project.json').asText())
    let files = zip.files
    return { project, files }
  }
}


module.exports = {
  Project,
}

