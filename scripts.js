
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

function scriptDiff(script1, script2) {
  if (!script1.length) return Diff.addAll(script2)
  if (!script2.length) return Diff.removeAll(script1)

  let head1 = script1[0]
  let tail1 = script1.slice(1)
  let head2 = script2[0]
  let tail2 = script2.slice(1)

  return Diff.best([
    scriptDiff(tail1, tail2).unshift(blockDiff(head1, head2)),
    scriptDiff(script1, tail2).add(head2),
    scriptDiff(tail1, script2).remove(head1),
    head1.unwrap ? scriptDiff(head1.unwrap.concat(tail1), script2) : null,
    head2.unwrap ? scriptDiff(script1, head2.unwrap.concat(tail2)) : null,
  ])
}


function scriptListDiff(json1, json2) {
  let scripts1 = json1.map(s => Script.fromJSON(s[2]))
  let scripts2 = json2.map(s => Script.fromJSON(s[2]))

  let result = []

  for (var i=0; i<scripts1.length; i++) {
    let script1 = scripts1[i]
    let count = script1.count

    scripts2.sort((a, b) => {
      let ad = Math.abs(a.count - count)
      let bd = Math.abs(b.count - count)
      return bd - ad
    })

    let best = null
    let bestIndex = null
    for (var j=0; j<scripts2.length; j++) {
      let script2 = scripts2[j]

      // stop if the min-bound on the next diff is already worse
      let heuristic = Math.abs(script2.count - count)
      if (best && best.score <= heuristic) {
        break
      }

      let diff = scriptDiff(script1.blocks, script2.blocks)
      if (!best || diff.score < best.score) {
        best = diff
        bestIndex = j
      }
    }

    //console.log(JSON.stringify(best.box(), null, '  '))
    if (best === null) {
      result.push(['-', script1.toJSON()])
    } else {
      result.push(best.box())
      scripts2.splice(bestIndex, 1)
    }
  }

  result.push(Diff.addAll(scripts2))
  return result
}


module.exports = scriptListDiff

