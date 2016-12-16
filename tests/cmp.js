
const glob = require('glob') 

const { projectDiff, colorize } = require('../src/project')
const sb2 = require('../src/sb2')


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
    //console.log(path)

    var kurt = sb2.Project.load(path).project
    var scratch = sb2.Project.load(path.replace(/[.][^.]*[.]sb2$/, '.sb2')).project

    let result = projectDiff(scratch, kurt)

    // console.log(JSON.stringify({
    //   name: path.split('.')[0],
    //   inp: scratch.children[0].scripts,
    //   out: kurt.children[0].scripts,
    //   diff: result[1][1].scripts,
    // }, null, '  '))
    process.stdout.write(colorize(result))

  })
})

