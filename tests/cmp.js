
const glob = require('glob') 

const { projectDiff, colorize } = require('../diff')
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



//glob('scratch-corpus/*.kurt.sb2', function(err, files) {
//glob('foo/*.changed.sb2', function(err, files) {
glob('ttd/*.changed.sb2', function(err, files) {
  if (err) throw err

  files.forEach(path => {
    console.log(path)

    var kurt = sb2.Project.load(path).project
    var scratch = sb2.Project.load(path.replace(/[.][^.]*[.]sb2$/, '.sb2')).project

    let result = projectDiff(scratch, kurt)
    process.stdout.write(colorize(result))

  })
})

