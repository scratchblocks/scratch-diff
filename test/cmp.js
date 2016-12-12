
const glob = require('glob') 

const { diff } = require('json-diff')
const { colorize } = require('json-diff/lib/colorize')

const sb2 = require('../sb2')


function cleanup(project) {
  project.children.forEach(child => {
    if (child.scripts) {
      child.scripts.forEach((script, index) => {
        // omit x, y
        child.scripts[index] = script[2]
      })
    }
  })
}



glob('corpus/*.kurt.sb2', function(err, files) {
  if (err) throw err

  files.forEach(path => {
    console.log(path)

    var kurt = sb2.Project.load(path).project
    var scratch = sb2.Project.load(path.replace('.kurt.', '.')).project

    cleanup(kurt)
    cleanup(scratch)

    let d = diff(kurt, scratch)
    process.stdout.write(colorize(d))

  })
})

