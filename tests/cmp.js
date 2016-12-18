
const glob = require('glob') 

const { Project, diff, colorize } = require('../index.js')


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

    var kurt = Project.load(path).project
    var scratch = Project.load(path.replace(/[.][^.]*[.]sb2$/, '.sb2')).project

    let result = diff(scratch, kurt)

    /*
    console.log('//', path.split('.')[0])
    console.log('let left =', JSON.stringify(scratch.children[0].scripts, null, '  '))
    console.log('let right =', JSON.stringify(kurt.children[0].scripts, null, '  '))
    console.log('let diff =', JSON.stringify(result[1][1].scripts, ' '))
    console.log()

    */
    process.stdout.write(colorize(result))

  })
})

