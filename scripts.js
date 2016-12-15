
let { Block, Script, Diff } = require('./blocks')


function blockDiff(block1, block2) {
  if (!(block1 instanceof Block) || !(block2 instanceof Block)) {
    return Diff.equal(block1, block2)
  }

  let d = Diff.object({
    args: Diff.seq(block1.args, block2.args, blockDiff),
    stacks: Diff.seq(block1.stacks, block2.stacks, (stack1, stack2) => {
      return scriptDiff(stack1.blocks, stack2.blocks)
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

function scriptDiff(script1, script2) {
  if (!script1.length) return Diff.addAll(script2)
  if (!script2.length) return Diff.removeAll(script1)

  let head1 = script1[0]
  let tail1 = script1.slice(1)
  let head2 = script2[0]
  let tail2 = script2.slice(1)

  // greedy diff
  let first = blockDiff(head1, head2)
  if (first.score === 0) {
    return scriptDiff(tail1, tail2).unshift(first)
  }

  // TODO enforce an error limit?

  return Diff.best([
    scriptDiff(tail1, tail2).unshift(first),
    scriptDiff(script1, tail2).add(head2),
    scriptDiff(tail1, script2).remove(head1),
    // TODO wrapping
    // head1.unwrap ? scriptDiff(head1.unwrap.concat(tail1), script2) : null,
    // head2.unwrap ? scriptDiff(script1, head2.unwrap.concat(tail2)) : null,
  ])
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

    // prioritise by size
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
      let diff = scriptDiff(script1.blocks, script2.blocks)
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

