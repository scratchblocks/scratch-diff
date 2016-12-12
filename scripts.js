
function blockDiff(block1, block2) {
  if (!(isArray(block1) && isArray(block2))) {
    return ['~', { __old: block1, __new: block2 }]
  }

}

function scriptDiff(blocks1, blocks2) {
  // ignore x,y
  let blocks = []
  let length = Math.min(blocks1.length, blocks2.length)
  for (var i=0; i<length; i++) {
    blocks.push(blockDiff(blocks1[i], blocks2[i]))
  }
  return blocks
}

function scriptsDiff(scripts1, scripts2) {
  return

  /*
  let scripts = []
  let scripts1 = sprite1.scripts || []
  let scripts2 = sprite2.scripts || []
  let length = Math.min(scripts1.length, scripts2.length)
  for (var i=0; i<length; i++) {
    let [x1, y1, blocks1] = scripts1[i]
    let [x2, y2, blocks2] = scripts2[i]
    scripts.push(scriptDiff(blocks1, blocks2))
  }
  return { scripts }
  */
}

module.exports = scriptsDiff

