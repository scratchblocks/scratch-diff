
const { Script } = require('../src/blocks.js')
const { scriptListDiff, ScriptDiff } = require('../src/scripts.js')

function scriptDiff(a, b) {
  return ScriptDiff.get(Script.fromJSON(a), Script.fromJSON(b))
}

test('can insert into stack', () => {
  let diff = scriptDiff([
    ['forward:', 10],
    ['say:forSecs:', "Hello!", 2],
  ], [
    ['forward:', 10],
    ['lookLike:', 'costume1'],
    ['say:forSecs:', "Hello!", 2],
  ])
  expect(diff.score).toBe(1)
  expect(diff.diff).toEqual([
    [' '],
    ['+', ['lookLike:', 'costume1']],
    [' '],
  ])
})

test('can remove from stack', () => {
  let diff = scriptDiff([
    ['forward:', 10],
    ['lookLike:', 'costume1'],
    ['say:forSecs:', "Hello!", 2],
  ], [
    ['forward:', 10],
    ['say:forSecs:', "Hello!", 2],
  ])
  expect(diff.score).toBe(1)
  expect(diff.diff).toEqual([
    [' '],
    ['-', ['lookLike:', 'costume1']],
    [' '],
  ])
})


test('replaces commands with different selectors', () => {
  let diff = scriptDiff([
    ['forward:', 10],
  ], [
    ['whenGreenFlag'],
  ])
  expect(diff.score).toBe(1)
  expect(diff.diff).toEqual([
    ['~', {
      __old: ['forward:', 10],
      __new: ['+', ['whenGreenFlag', 10]],
    }],
  ])
})



