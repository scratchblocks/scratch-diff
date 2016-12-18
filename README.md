scratch-diff
============

structured diff over Scratch 2.0 project JSON.

The eventual successor to <https://scratchblocks.github.io/diff/>.

The plan is to support CLI usage (via node.js) and bundling for browser usage
as the core of the above web app.

Install
=======

    $ yarn


Usage
=====

    const { diff, Project, colorize } = require('scratch-diff')

    let a = Project.load('foo1.sb2')
    let b = Project.load('foo2.sb2')
    let result = diff(a.project, b.project)
    console.log(colorize(result))

