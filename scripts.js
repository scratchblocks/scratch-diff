
function isArray(obj) {
  return obj && obj.constructor === Array
}

function isSeq(arg) {
  return isArray(arg) && (arg.length === 0 || isArray(arg[0]))
}

function simplifyObj(diff) {
  let selector = diff._selector
  delete diff._selector
  for (key in diff) {
    if (diff[key] === undefined) {
      delete diff[key]
    }
  }
  if (Object.keys(diff).length === 0) {
    return undefined
  }
  if (selector) {
    diff._selector = selector
  }
  return diff
}

function box(diff) {
  return diff === undefined ? [' '] : ['~', diff]
}

function equal(obj1, obj2) {
  return obj1 === obj2 ? undefined : replace(obj1, obj2)
}

function replace(obj1, obj2) {
  return { __old: obj1, __new: obj2 }
}

function addAll(items) {
  return {
    score: items.length,
    diff: items.map(item => ['+', item]),
  }
}

function removeAll(items) {
  return {
    score: items.length,
    diff: items.map(item => ['-', item]),
  }
}

function best(options) {
  var best
  for (var i=0; i<options.length; i++) {
    var opt = options[i]
    if (!best || opt.score < best.score) {
      best = opt
    }
  }
  return best
}


/*******************************************************************************/

/*
function linearize(script) {
  let lines = []
  script.forEach(block => {
    let selector = block[0]
    let split
    for (var index = block.length; index--; ) {
      if (!isSeq(block[index])) {
        split = index
        break
      }
    }
    let args = block.slice(1, split)
    let stacks = block.slice(split)
  })
}
*/

function blockInfo(block) {
  let selector = block[0]
  let split
  for (var index = block.length; index--; ) {
    if (!isSeq(block[index])) {
      split = index + 1
      break
    }
  }
  let args = block.slice(1, split)
  let stacks = block.slice(split)
  return [selector, args, stacks]
}

function argsDiff(args1, args2) {
  let out = []
  var allEqual = true
  for (var i=0; i<args1.length; i++) {
    let diff = blockDiff(args1[i], args2[i])
    if (diff) allEqual = false
    out.push(box(diff))
  }
  if (allEqual) {
    return undefined
  }
  return out
}

function stackDiff(stacks1, stacks2) {
  let out = []
  var allEqual = stacks1.length === stacks2.length
  let length = Math.min(stacks1.length, stacks2.length)
  for (var i=0; i<length; i++) {
    let diff = scriptDiff(stacks1[i], stacks2[i])
    if (diff) allEqual = false
    out.push(box(diff))
  }
  if (stacks1.length > length) {
    out.push(['-', stacks1[1]])
  } else if (stacks2.length > length) {
    out.push(['+', stacks2[1]])
  }
  if (allEqual) {
    return undefined
  }
  return out
}

function blockDiff(block1, block2) {
  // is one argument a scalar?
  if (!(isArray(block1) && isArray(block2))) {
    return equal(block1, block2)
  }

  let [selector1, args1, stacks1] = blockInfo(block1)
  let [selector2, args2, stacks2] = blockInfo(block2)

  if (args1.length !== args2.length) {
    return replace(block1, block2)
  }

  //console.log(block1, selector1, args1, stacks1)
  //console.log(block2, selector2, args2, stacks2)

  let diff = {
    _selector: selector1,
    selector: equal(selector1, selector2),
    args: argsDiff(args1, args2),
    stacks: stackDiff(stacks1, stacks2),
  }
  return simplifyObj(diff)
}

function addBlock(seq1, seq2) {
  let block2 = seq2[0]
  let rest = scriptDiff(seq1, seq2.slice(1))
  rest.score += 1
  rest.diff.unshift(['+', block2])
  return rest
}

function removeBlock(seq1, seq2) {
  let block1 = seq1[0]
  let rest = scriptDiff(seq1.slice(1), seq2)
  rest.score += 1
  rest.diff.unshift(['-', block1])
  return rest
}

function sameBlock(seq1, seq2) {
  let first = blockDiff(seq1[0], seq2[0])
  let rest = scriptDiff(seq1.slice(1), seq2.slice(1))
  if (first !== undefined) {
    rest.score += 1
  }
  rest.diff.unshift(box(first))
  return rest
}

function scriptDiff(seq1, seq2) {
  if (!seq1.length) return addAll(seq2)
  if (!seq2.length) return removeAll(seq1)

  let options = [
    sameBlock(seq1, seq2),
    removeBlock(seq1, seq2),
    addBlock(seq1, seq2),
  ]

  /*
  let block1 = seq1[0]
  let block2 = seq2[0]
  var [_, _, stacks1] = blockInfo(block1)
  var [_, _, stacks2] = blockInfo(block2)

  if (stacks1.length === 1) {
    let stack = stacks1[0]
    let diff = scriptDiff(
      [stack].concat(seq1.slice(1)),
      seq2
    )
    diff.score += 1
    options.push(diff)
  }
  if (stacks2.length === 1) {
    let stack = stacks2[0]
    let diff = scriptDiff(
      seq1,
      [stack].concat(seq2.slice(1))
    )
    diff.score += 1
    options.push({
      score: diff.score + 1,
    })
  }
  */

  return best(options)
}

function scriptListDiff(scripts1, scripts2) {
  let out = []
  let unused = scripts2.slice()

  for (var i=scripts1.length; i--; ) {
    if (!unused.length) break

    var best = null, bestIndex
    for (var j=unused.length; j--; ) {
      let diff = scriptDiff(scripts1[i][2], unused[j][2])

      if (!best || diff.score < best.score) {
        best = diff
        bestIndex = j
      }
    }

    console.log('best', JSON.stringify(best, null, '  '))

    out.push(best.diff ? ['~', best.diff ] : [' '])
    unused.splice(bestIndex, 1)
  }

  for ( ; i >= 0; i--) {
    out.push(['-', scripts1[i][2]])
  }
  for (var j=unused.length; j--; ) {
    out.push(['+', unused[j][2]])
  }

  return out

  // TODO don't compare every script !
  /*
  let byXY2 = {}
  scripts2.forEach(s => {
    let [x, y, blocks] = s
    let key = [x, y]
    (byXY2[key] = byXY2[key] || []).push(s)
  })
  let unused = new Set(scripts2)

  scripts1.forEach(s1 => {
    let [x, y, blocks] = s1
    let key = [x, y]
    byXY2[key].forEach(s2 => {
    })
  })
  */
}

module.exports = scriptListDiff

