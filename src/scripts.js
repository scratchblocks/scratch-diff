
const jsonDiff = require('json-diff').diff

const { Block, Script, Diff } = require('./blocks')



function blockDiff(block1, block2) {
  // diff primitives by identity.
  if (!(block1 instanceof Block) || !(block2 instanceof Block)) {
    return Diff.equal(block1, block2)
  }

  // diff define hats separately.
  if (block1.args[0] === 'procDef' || block2.args[0] === 'procDef') {
    if (!(block1.args[0] === 'procDef' && block2.args[0] === 'procDef')) {
      return Diff.replace(block1, block2)
    }
    let diff = jsonDiff(block1.args, block2.args) // TODO still complains about unequal empty lists...
    return new Diff(diff ? 1 : 0, diff)
  }

  /*
  // check shape...
  let selectorsMatch = (
    block1.args[0] === block2.args[0] &&
    !(block1.args[0] === 'call' && block1.args[1] !== block2.args[1])
  )
  let argsFit = (
    block1.args.length === block2.args.length
  )
  let haveStacks = !!(
    block1.stacks.length || block2.stacks.length
  )

  // cannot change both selector + arg length.
  if (!selectorsMatch || !argsFit) {
    // replace the entire block instead.
    // but if there are stacks, we must unwrap those first.
    return Diff.replace(block1, block2)
  }
  */

  let args = Diff.seq(block1.args, block2.args, blockDiff)
  let stacks = Diff.seq(block1.stacks, block2.stacks, (stack1, stack2) => {
    return ScriptDiff.get(stack1, stack2)
  })

  // if same, return undefined
  let score = args.score + stacks.score
  if (score === 0) {
    return Diff.UNDEFINED
  }

  // if all different, do a replace instead.
  let combined = args.diff.concat(stacks.diff)
  var noneSame = true
  for (var i=0; i<combined.length; i++) {
    if (combined[i][0] === ' ') {
      noneSame = false
      break
    }
  }
  if (noneSame) {
    return Diff.replace(block1, block2)
  }

  // annotate first arg with selector. DEBUG
  if (combined[0][0] === ' ') combined[0] = [' ', block1.args[0]]
  return new Diff(score, combined)
}

function scriptEq(script1, script2) {
  if (script1.length !== script2.length) {
    return false
  }
  for (var i=script1.length; i--; ) {
    if (blockDiff(script1[i], script2[i]) !== undefined) {
      return false
    }
  }
  return true
}



class Solution {
  constructor(diff, script1, script2) {
    this.diff = diff
    this.script1 = script1
    this.script2 = script2

    this.isDone = script1 === Script.EMPTY && script2 === Script.EMPTY
    this.isTrivial = script1 === Script.EMPTY || script2 === Script.EMPTY
    // use difference in size as heuristic
    this.score = diff.score + Math.abs(script1.count - script2.count)
  }

  triv() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    if (script1 === Script.EMPTY) {
      return new Solution(diff.addAll(this.script2), Script.EMPTY, Script.EMPTY)
    }
    if (script2 === Script.EMPTY) {
      return new Solution(diff.removeAll(this.script1), Script.EMPTY, Script.EMPTY)
    }
    throw 'oops'
  }

  step() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    let first = blockDiff(script1.head, script2.head)
    if (!first) {
      // some blocks (different arg&stack len) are incompatible and may not be diffed.
      return
    }
    return new Solution(diff.push(first), script1.tail, script2.tail)
  }

  add() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    let d = diff.add(script2.head)
    let selector = script2.head.args[0]
    return new Solution(d, script1, script2.tail)
  }

  remove() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    let d = diff.remove(script1.head)
    let selector = script1.head.args[0]
    return new Solution(d, script1.tail, script2)
  }

  unwrap() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    let unwrapped = script1.head.unwrap(script1.tail)
    return new Solution(diff.remove(unwrapped.head), unwrapped.tail, script2)
  }

  wrap() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    let unwrapped = script2.head.unwrap(script2.tail)
    return new Solution(diff.add(unwrapped.head), script1, unwrapped.tail)
  }
}

class ScriptDiff {
  constructor(script1, script2) {
    this.script1 = script1
    this.script2 = script2
    this.solutions = [
      new Solution(Diff.EMPTY_LIST, script1, script2)
    ]
    this.score = Math.abs(script1.count - script2.count)
  }

  run(max) {
    let solutions = this.solutions
    while (solutions.length) {
      let sol = solutions.shift()
      this.score = sol.score

      if (sol.score > max) {
        return null
      }

      if (sol.isDone) {
        if (sol.diff.score === 0) {
          return Diff.UNDEFINED
        }
        return sol.diff
      }

      if (sol.isTrivial) {
        solutions.push(sol.triv())
      } else {
        let stepped = sol.step()
        if (stepped) {
          solutions.push(stepped)
        }
        solutions.push(sol.add())
        solutions.push(sol.remove())

        if (sol.script1.head.canUnwrap) {
          solutions.push(sol.unwrap())
        }
        if (sol.script2.head.canUnwrap) {
          solutions.push(sol.wrap())
        }
      }

      // TODO a real priority queue?
      solutions.sort((a, b) => {
        return a.score - b.score
      })
    }

    throw 'fail'
  }

  static get(script1, script2) {
    let differ = new ScriptDiff(script1, script2)
    let diff = differ.run(+Infinity)
    if (diff === null) throw 'oh dear'
    return diff
  }
}


function scriptListDiff(json1, json2) {
  let scripts1 = json1.map(s => Script.fromJSON(s[2]))
  let scripts2 = json2.map(s => Script.fromJSON(s[2]))

  let result = []
  var allEqual = true

  // handle shortest scripts first --quickest to diff
  scripts1.sort((a, b) => {
    return a.count - b.count
  })

  // pair scripts
  for (var i=0; i<scripts1.length; i++) {
    let script1 = scripts1[i]

    let options = scripts2.map(script2 => {
      return new ScriptDiff(script1, script2)
    })

    var best = null
    var bestScript = null
    while (options.length) {
      // prioritise by difference in size
      options.sort((a, b) => {
        return a.score - b.score
      })

      let first = options[0]
      let second = options[1]

      let diff = first.run(second ? second.score : +Infinity)
      if (diff !== null) {
        best = diff
        bestScript = first.script2
        break
      }
    }

    // TODO limit score -- dont want to match up completely different scripts!

    if (best === null) {
      allEqual = false
      result.push(['-', script1.toJSON()])
    } else {
      if (best.score) {
        allEqual = false
      }
      result.push(best.box())
      let index = scripts2.indexOf(bestScript)
      scripts2.splice(index, 1)
    }
  }

  for (var i=0; i<scripts2.length; i++) {
    result.push(['+', scripts2[i].toJSON()])
    allEqual = false
  }

  if (allEqual) {
    return undefined
  }
  return result
}


module.exports = {
  blockDiff,
  ScriptDiff,
  scriptListDiff,
}

