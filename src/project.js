
const { SequenceMatcher } = require('difflib')

const jsonDiff = require('json-diff').diff
const { colorize } = require('json-diff/lib/colorize')
const { scriptListDiff } = require('./scripts')


function arrayDiff(seq1, seq2) {
  // json-diff can't cope with duplicate objects
  seq1.forEach((obj, index) => { obj._index = index })
  seq2.forEach((obj, index) => { obj._index = index })

  let diff = jsonDiff(seq1, seq2)
  if (diff === undefined) {
    return
  }

  return diff.map(item => {
    if (item[0] === '~') {
      delete item[1]._index
    }
    return item
  })
}

function costumeInfo(sprite) {
  if (!sprite.costumes) return []
  let costumes = sprite.costumes.map(costume => {
    return {
      name: costume.costumeName,
      md5: costume.baseLayerMD5,
      rotationCenterX: costume.rotationCenterX,
      rotationCenterY: costume.rotationCenterY,
      //isCurrent: false,
    }
  })
  //costumes[sprite.currentCostumeIndex].isCurrent = true
  return costumes
}

function soundInfo(sprite) {
  if (!sprite.sounds) return []
  return sprite.sounds.map(sound => {
    return {
      name: sound.soundName,
      md5: sound.md5,
    }
  })
}

function spriteDiff(sprite1, sprite2) {
  return simplifyObj({
    name: jsonDiff(sprite1.objName, sprite2.objName),
    costumes: arrayDiff(costumeInfo(sprite1), costumeInfo(sprite2)),
    sounds: arrayDiff(soundInfo(sprite1), soundInfo(sprite2)),
    scripts: scriptListDiff(sprite1.scripts || [], sprite2.scripts || []),
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

  let byName2 = new Map()
  sprites2.forEach(s => byName2.set(s.objName, s))
  let unused = new Set(sprites2)

  let pairs = []
  sprites1.forEach(s1 => {
    let s2 = byName2.get(s1.objName)
    if (s2) {
      unused.delete(s2)
      pairs.push({ s1, s2 })
    } else {
      pairs.push({ s1, s2: null })
    }
  })
  unused.forEach(s2 => {
    // TODO actually match up sprites with same indexInLibrary
    pairs.splice(s2.indexInLibrary, 0, { s1: null, s2 })
  })

  return pairs.map(pair => {
    let { s1, s2 } = pair
    let name = s1 ? s1.objName : s2.objName
    if (!s1) {
      return ['-', { name }]
    }
    if (!s2) {
      return ['+', { name }]
    }

    let diff = spriteDiff(s1, s2)
    if (diff === undefined) {
     return [' ']
    } else {
     return ['~', diff]
    }
  })

  var result = jsonDiff(names1, names2)
  if (result === undefined) {
    result = names1.map(_ => [' '])
  }
}

function projectDiff(project1, project2) {
  let sprites = spriteListDiff(getSprites(project1), getSprites(project2))
  var stage = spriteDiff(project1, project2)
  stage = stage === undefined ? [' '] : ['~', stage]
  return [stage].concat(sprites)
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

