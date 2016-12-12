
const { SequenceMatcher } = require('difflib')

const jsonDiff = require('json-diff').diff
const { colorize } = require('json-diff/lib/colorize')
const scriptsDiff = require('./scripts')



function costumeInfo(sprite) {
  if (!sprite.costumes) return []
  let costumes = sprite.costumes.map(costume => {
    return {
      name: costume.costumeName,
      md5: costume.baseLayerMD5, // TODO what about sb2 projects??
      rotationCenterX: costume.rotationCenterX,
      rotationCenterY: costume.rotationCenterY,
    }
  })
  costumes[sprite.currentCostumeIndex].isCurrent = true
  return costumes
}

function soundInfo(sprite) {
  if (!sprite.sounds) return []
  return sprite.sounds.map(sound => {
    return {
      name: sound.soundName,
      md5: sound.md5, // TODO what about sb2 projects??
    }
  })
}

function spriteDiff(sprite1, sprite2) {
  return simplifyObj({
    name: jsonDiff(sprite1.objName, sprite2.objName),
    costumes: jsonDiff(costumeInfo(sprite1), costumeInfo(sprite2)),
    sounds: jsonDiff(soundInfo(sprite1), soundInfo(sprite2)),
    scripts: scriptsDiff(sprite1.scripts || [], sprite2.scripts || []),
    // TODO variables
    // TODO lists
  })
}

function simplifyObj(diff) {
  for (key in diff) {
    if (diff[key] === undefined) {
      delete diff[key]
    }
  }
  if (Object.keys(diff).length === 0) {
    return undefined
  }
  return diff
}

function simplifyArray(diff) {
  var allEqual = true
  let out = diff.map(item => {
    if (item === undefined) {
      return [' ']
    } else {
      allEqual = false
      return ['~', item]
    }
  })
  if (allEqual) {
    return undefined
  }
  return out
}

function getSprites(project) {
  // filter watchers
  let sprites = project.children.filter(obj => {
    return !!obj.objName 
  })
  // sort by index in library (which changes much less often than stacking
  // order!)
  sprites.sort((a, b) => {
    return a.indexInLibrary - b.indexInLibrary
  })
  return sprites
}

function spriteListDiff(sprites1, sprites2) {
  // nb. if you rename sprites *and* somehow reorder the library,
  // diff will get very confused.
  // fortunately Scratch 2.0 doesn't allow rearranging the library,
  // so this is unlikely to happen in practice!

  let names1 = sprites1.map(s => s.objName)
  let names2 = sprites2.map(s => s.objName)

  var result = jsonDiff(names1, names2)
  if (result === undefined) {
    result = names1.map(_ => [' '])
  }

  var i = 0
  var j = 0
  return result.map(item => {
    let op = item[0]
    switch (op) {
      case '~':
      case ' ':
        let diff = spriteDiff(sprites1[i], sprites2[i])
        let out = diff === undefined ? [' '] : ['~', diff]
        i++
        j++
        return out
      case '+':
        i++
        return ['+', { name: item[1] }]
      case '-':
        j++
        return ['-', { name: item[1] }]
    }
  })
}

function projectDiff(project1, project2) {
  let sprites = spriteListDiff(getSprites(project1), getSprites(project2))
  let stage = spriteDiff(project1, project2)
  return simplifyArray([stage].concat(sprites))
}

/*
function colorize(result) {
  return JSON.stringify(result, null, '  ')
}
*/


module.exports = {
  projectDiff,
  colorize,
}

