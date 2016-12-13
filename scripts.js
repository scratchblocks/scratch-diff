
function isArray(obj) {
  return obj && obj.constructor === Array
}

function isSeq(arg) {
  return isArray(arg) && (arg.length === 0 || isArray(arg[0]))
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
    score: items.length * 2,
    diff: items.map(item => ['+', item]),
  }
}

function removeAll(items) {
  return {
    score: items.length * 2,
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

function blockWeight(block) {
  if (!isArray(block)) {
    return 1
  }

  var score = 1 // each selector has weight 1.
  var [_, args, stacks] = blockInfo(block)
  score += seqWeight(args)
  if (stacks.length) {
    score += seqWeight(stacks[0])
    if (stacks.length > 1) {
      score += seqWeight(stacks[1])
    }
  }
  return score
}

function seqWeight(seq) {
  var score = 0
  for (var i=0; i<seq.length; i++) {
    score += blockWeight(seq[i])
  }
  return score
}

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
  var allEqual = args1.length === args2.length
  var score = 0
  var length = Math.min(args1.length, args2.length)
  for (var i=0; i<length; i++) {
    let item = blockDiff(args1[i], args2[i])
    if (item.diff) allEqual = false
    score += item.score
    out.push(box(item.diff))
  }
  score += Math.max(args1.length, args2.length) - length
  if (allEqual) {
    return undefined
  }
  return { score: score, diff: out }
}

function stackDiff(stacks1, stacks2) {
  var score = 0
  let out = []
  var allEqual = stacks1.length === stacks2.length
  let length = Math.min(stacks1.length, stacks2.length)
  for (var i=0; i<length; i++) {
    let item = scriptDiff(stacks1[i], stacks2[i])
    if (item.diff) allEqual = false
    score += item.score
    out.push(box(item.diff))
  }
  if (stacks1.length > length) {
    out.push(['-', stacks1[i]])
    score += seqWeight(stacks1[i])
  } else if (stacks2.length > length) {
    out.push(['+', stacks2[i]])
    score += seqWeight(stacks2[i])
  }
  if (allEqual) {
    return undefined
  }
  return { score: score, diff: out }
}

function blockDiff(block1, block2) {
  // is one argument a scalar?
  if (!(isArray(block1) && isArray(block2))) {
    let diff = equal(block1, block2)
    return { score: diff ? 1 : 0, diff: diff }
  }

  let [selector1, args1, stacks1] = blockInfo(block1)
  let [selector2, args2, stacks2] = blockInfo(block2)

  /*
  if ((stacks1.length > 0) !== (stacks1.length > 0)) {
    // TODO include nested subtacks in score penalty
    var score = 2
    stacks1.forEach(s => score += s.length)
    stacks2.forEach(s => score += s.length)
    return { score: score, diff: replace(block1, block2) }
  }
  if (args1.length !== args2.length) {
    return { score: 2, diff: replace(block1, block2) }
  }
  */

  //console.log(block1, selector1, args1, stacks1)
  //console.log(block2, selector2, args2, stacks2)
  
  var diff = {}
  var score = 0

  if (selector1 !== selector2) {
    diff.selector = replace(selector1, selector2)
    score += 1
  }

  let args = argsDiff(args1, args2)
  if (args) {
    diff.args = args.diff
    score += args.score
  }

  let stacks = stackDiff(stacks1, stacks2)
  if (stacks) {
    diff.stacks = stacks.diff
    score += stacks.score
  }

  if (Object.keys(diff).length) {
    if (!diff.selector) {
      diff._selector = selector1
    }
  } else {
    diff = undefined
  }

  // only allow changing selector if we haven't changed arg shape
  if (diff && diff.selector && (args1.length !== args2.length || stacks1.length !== stacks2.length)) {
    diff = replace(block1, block2)
  }

  // TODO shouldn't these be equal?
  // console.log(score, Math.abs(blockWeight(block2) - blockWeight(block1)))

  return { score, diff }
}

function addBlock(seq1, seq2) {
  let block2 = seq2[0]
  let rest = scriptDiff(seq1, seq2.slice(1))
  rest.score += 2
  rest.diff.unshift(['+', block2])
  return rest
}

function removeBlock(seq1, seq2) {
  let block1 = seq1[0]
  let rest = scriptDiff(seq1.slice(1), seq2)
  rest.score += 2
  rest.diff.unshift(['-', block1])
  return rest
}

function sameBlock(seq1, seq2) {
  let first = blockDiff(seq1[0], seq2[0])
  let rest = scriptDiff(seq1.slice(1), seq2.slice(1))
  if (first.diff !== undefined) {
    rest.score += first.score
  }
  rest.diff.unshift(box(first.diff))
  return rest
}

function linearize(block) {
  let [selector, args, stacks] = blockInfo(block)
  if (!stacks.length) {
    return null
  }
  var block = [selector].concat(args)

  if (stacks.length === 1) {
    return [block].concat(stacks[0]).concat([['_end_']])
  } else if (stacks.length === 2) {
    return [block].concat(stacks[0]).concat([['_else_']]).concat(stacks[1]).concat([['_end_']])
  }
  throw 'oops'
}

function unwrap(seq1, lin1, seq2) {
  let diff = scriptDiff(lin1.concat(seq1.slice(1)), seq2)
  diff.score += 1
  return diff
}

function wrap(seq1, lin2, seq2) {
  let diff = scriptDiff(seq1, lin2.concat(seq2.slice(1)))
  diff.score += 1
  return diff
}


function scriptDiff(seq1, seq2) {
  if (!seq1.length) return addAll(seq2)
  if (!seq2.length) return removeAll(seq1)

  // nb. this is quadratic I think? expensive, anyway!
  // TODO cf. dynamic programming optimisations for levenshtein distance...
  let options = [
    sameBlock(seq1, seq2),
    removeBlock(seq1, seq2),
    addBlock(seq1, seq2),
  ]

  let lin1 = linearize(seq1[0])
  if (lin1) {
    options.push(unwrap(seq1, lin1, seq2))
  }
  let lin2 = linearize(seq2[0])
  if (lin2) {
    options.push(wrap(seq1, lin2, seq2))
  }

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

