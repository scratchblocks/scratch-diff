
let { Block, Script, Diff } = require('./blocks')


function blockDiff(block1, block2) {
  if (!(block1 instanceof Block) || !(block2 instanceof Block)) {
    return Diff.equal(block1, block2)
  }

  // don't allow both selector and c-shape to change
  if (block1.args[0] !== block2.args[0] && block1.stacks.length !== block2.stacks.length) {
    return Diff.replace(block1, block2)
  }

  let d = Diff.object({
    args: Diff.seq(block1.args, block2.args, blockDiff),
    stacks: Diff.seq(block1.stacks, block2.stacks, (stack1, stack2) => {
      return ScriptDiff.get(stack1, stack2)
    }),
  })
  return d
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
    if (this.script1 === Script.EMPTY) {
      return new Solution(Diff.addAll(this.script2), Script.EMPTY, Script.EMPTY)
    }
    if (this.script2 === Script.EMPTY) {
      return new Solution(Diff.removeAll(this.script1), Script.EMPTY, Script.EMPTY)
    }
    throw 'oops'
  }

  step() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    let first = blockDiff(script1.head, script2.head)
    return new Solution(diff.unshift(first), script1.tail, script2.tail)
  }

  add() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    return new Solution(diff.add(script2.head), script1, script2.tail)
  }

  remove() {
    let diff = this.diff, script1 = this.script1, script2 = this.script2
    return new Solution(diff.remove(script1.head), script1.tail, script2)
  }


  // TODO wrapping
  // head1.unwrap ? scriptDiff(head1.unwrap.concat(tail1), script2) : null,
  // head2.unwrap ? scriptDiff(script1, head2.unwrap.concat(tail2)) : null,
}

class ScriptDiff {
  constructor(script1, script2) {
    this.solutions = [
      new Solution(Diff.EMPTY_LIST, script1, script2)
    ]
  }

  run(max) {
    let solutions = this.solutions
    while (solutions.length) {
      //console.log(solutions)
      let sol = solutions.shift()
      //console.log(sol)

      if (sol.score > max) {
        return [sol.score, null]
      }

      if (sol.isDone) {
        return [sol.score, sol.diff]
      }

      if (sol.isTrivial) {
        solutions.push(sol.triv())
      } else {
        solutions.push(sol.step())
        solutions.push(sol.add())
        solutions.push(sol.remove())
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
    let [score, diff] = differ.run(+Infinity)
    if (diff === null) throw 'oh dear'
    return diff
  }
}


function scriptListDiff(json1, json2) {
  let scripts1 = json1.map(s => Script.fromJSON(s[2]))
  let scripts2 = json2.map(s => Script.fromJSON(s[2]))

  let result = []

  // handle shortest scripts first --quickest to diff
  scripts1.sort((a, b) => {
    return a.count - b.count
  })


  // pair scripts
  for (var i=0; i<scripts1.length; i++) {
    let script1 = scripts1[i]
    let count = script1.count

    // prioritise by difference in size
    scripts2.sort((a, b) => {
      let ad = Math.abs(a.count - count)
      let bd = Math.abs(b.count - count)
      return ad - bd
    })

    let best = null
    let bestIndex = null

    // look for exact match
    for (var j=0; j<scripts2.length; j++) {
      if (scriptEq(scripts2[j], script1) === undefined) {
        best = true
        bestIndex = j
        break
      }
    }
    if (best) {
      result.push([' '])
      scripts2.splice(bestIndex, 1)
      continue
    }

    // diff to find closest match
    // TODO this is *really* slow
    for (var j=0; j<scripts2.length; j++) {
      let script2 = scripts2[j]

      // stop if the min-bound on the next diff is already worse
      // nb. this does mean we stop on the first exact match
      let heuristic = Math.abs(script2.count - count)
      if (best && best.score <= heuristic) {
        break
      }

      console.log('diff', script1.count, script2.count)
      console.log(JSON.stringify(script1))
      console.log(JSON.stringify(script2))

      let diff = ScriptDiff.get(script1, script2)
      //let [score, diff] = differ.run(+Infinity)

      if (diff.score < heuristic) throw 'min bound fail'
      console.log(diff.score)
      if (!best || diff.score < best.score) {
        best = diff
        bestIndex = j
      }
    }

    if (best === null) {
      result.push(['-', script1.toJSON()])
    } else {
      result.push(best.box())
      scripts2.splice(bestIndex, 1)
    }
  }

  for (var i=0; i<scripts2.length; i++) {
    result.push(['+', scripts2[i].toJSON()])
  }
  return result
}


module.exports = scriptListDiff

