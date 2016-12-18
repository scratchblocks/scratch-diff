
const { Script } = require('../src/blocks.js')
const { scriptListDiff, ScriptDiff } = require('../src/scripts.js')

function scriptDiff(a, b) {
  return ScriptDiff.get(Script.fromJSON(a), Script.fromJSON(b))
}

test('can insert into stack', () => {
  let diff = scriptDiff([
    ['one'],
    ['two'],
    ['three'],
    ['four'],
  ], [
    ['one'],
    ['two'],
    ['three'],
    ['SURPRISE!'],
    ['four'],
  ])

  expect(diff.diff).toEqual([
    [' '], // one
    [' '], // two
    [' '], // three
    ['+', ['SURPRISE!']],
    [' '], // four
  ])
  expect(diff.score).toBe(1)
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

  expect(diff.diff).toEqual([
    [' '],
    ['-', ['lookLike:', 'costume1']],
    [' '],
  ])
  expect(diff.score).toBe(1)
})

test('replaces commands with different selectors', () => {
  let diff = scriptDiff([
    ['forward:', 10],
  ], [
    ['whenGreenFlag'],
  ])

  expect(diff.diff).toEqual([
    ['~', {
      __old: ['forward:', 10],
      __new: ['whenGreenFlag'],
    }],
  ])
  expect(diff.score).toBe(1)
})

test('can modify simple argument', () => {
  let left = [
    [ "whenKeyPressed", "space" ],
    [ "forward:", 10 ],
  ]
  let right = [
    [ "whenKeyPressed", "space" ],
    [ "forward:", 20 ],
  ]
  let diff = [
    [' '],
    ["~", [[" ","forward:"], ["~",{"__old":10,"__new":20}]]],
  ]

  let result = scriptDiff(left, right)
  expect(result.diff).toEqual(diff)
  expect(result.score).toBe(1)
})

test('can modify arguments in nested reporters (real Scratch script)', () => {

  // these scripts extracted from a Scratch project
  let left = [
    [ "whenGreenFlag" ],
    [ "gotoX:y:", 0, 0 ],
    [ "heading:", 90 ],
    [ "setVar:to:", "vx", 0 ],
    [ "setVar:to:", "vy", 0 ],
    [ "doForever", [
      [ "setVar:to:", "vx", [ "*", 0.8, [ "readVariable", "vx" ] ] ],
      [ "changeVar:by:", "vy", -1 ],
      [ "changeXposBy:", [ "readVariable", "vx" ] ],
      [ "changeYposBy:", [ "readVariable", "vy" ] ],
      [ "doIf", [ "<", [ "ypos" ], "-120" ], [
        [ "ypos:", -120 ],
        [ "setVar:to:", "vy", [ "computeFunction:of:", "abs", [ "readVariable", "vy" ] ] ]
      ] ],
      [ "doIf", [ "keyPressed:", "right arrow" ], [
        [ "changeVar:by:", "vx", 10 ]
      ] ],
      [ "doIf", [ "keyPressed:", "left arrow" ], [
        [ "changeVar:by:", "vx", -10 ]
      ] ]
    ] ]
  ]

  let right = [
    [ "whenGreenFlag" ],
    [ "gotoX:y:", 0, 0 ],
    [ "heading:", 90 ],
    [ "setVar:to:", "vx", 0 ],
    [ "setVar:to:", "vy", 0 ],
    [ "doForever", [
      [ "setVar:to:", "vx", [ "*", 0.8, [ "readVariable", "vx" ] ] ],
      [ "changeVar:by:", "vy", -1 ],
      [ "changeXposBy:", [ "readVariable", "vx" ] ],
      [ "changeYposBy:", [ "readVariable", "vy" ] ],
      [ "doIf", [ "<", [ "ypos" ], "-120" ], [
        [ "ypos:", -120 ],
        [ "setVar:to:", "vy", [ "computeFunction:of:", "abs", [ "readVariable", "vy" ] ] ]
      ] ],
      [ "doIf", [ "keyPressed:", "d" ], [
        [ "changeVar:by:", "vx", 10 ]
      ] ],
      [ "doIf", [ "keyPressed:", "a" ], [
        [ "changeVar:by:", "vx", -10 ]
      ] ]
    ] ]
  ]

  // this diff painstakingly written by hand to ensure correctness
  let diff = [
    [' '], // whenGreenFlag
    [' '], // gotoXY
    [' '], // heading
    [' '], // setVar
    [' '], // setVar
    ['~', [[' ', 'doForever'], ['~', [
      [' '], // setVar
      [' '], // changeVar
      [' '], // changeX
      [' '], // changeY
      [' '], // doIf
      ['~', [[' ', 'doIf'], ['~', [
        [' ', 'keyPressed:'],
        ['~', { __old: 'right arrow', __new: 'd' }],
      ]], [' ']]],
      ['~', [[' ', 'doIf'], ['~', [
        [' ', 'keyPressed:'],
        ['~', { __old: 'left arrow', __new: 'a' }],
      ]], [' ']]],
    ]]]]
  ]

  let result = scriptDiff(left, right)
  expect(result.diff).toEqual(diff)
  expect(result.score).toBe(2)
})

test('can unwrap scripts', () => {
  let left = [
    [ "whenGreenFlag" ],
    [ "doRepeat", 10, [
      [ "forward:", 10 ],
      [ "turnRight:", 15 ],
    ] ],
    [ "nextCostume" ],
  ]

  let right = [
    [ "whenGreenFlag" ],
    [ "forward:", 10 ],
    [ "turnRight:", 15 ],
    [ "nextCostume" ],
  ]

  let diff = [
    [' '], // whenGreenFlag
    ['-', ['doRepeat', 10]],
    [' '], // forward:
    [' '], // turnRight
    ['-', ['_end_']],
    [' '], // nextCostume
  ]

  let result = scriptDiff(left, right)
  expect(result.diff).toEqual(diff)
  expect(result.score).toBe(1)
})

test('can unwrap & unwrap & modify scripts', () => {
  let left = [
    [ "whenGreenFlag" ],
    [ "doForever", [
      [ "forward:", 10 ],
      [ "nextCostume" ],
      [ "turnRight:", 15 ],
    ] ]
  ]

  let right = [
    [ "whenGreenFlag" ],
    [ "forward:", 10 ],
    [ "nextCostume" ],
    [ "gotoX:y:", 0, 0 ],
    [ "turnRight:", 15 ],
  ]

  let diff = [
    [' '], // whenGreenFlag
    ['-', ['doForever']],
    [' '], // forward:
    [' '], // nextCostume
    ['+', ['gotoX:y:', 0, 0 ]],
    [' '], // turnRight
    ['-', ['_end_']],
  ]

  let result = scriptDiff(left, right)
  expect(result.diff).toEqual(diff)
  expect(result.score).toBe(2)

  let reverseDiff = [
    [' '], // whenGreenFlag
    ['+', ['doForever']],
    [' '], // forward:
    [' '], // nextCostume
    ['-', ['gotoX:y:', 0, 0 ]],
    [' '], // turnRight
    ['+', ['_end_']],
  ]

  let result2 = scriptDiff(right, left)
  expect(result2.diff).toEqual(reverseDiff)
  expect(result2.score).toBe(2)
})

test('can add else to `if _ then`', () => {
  let left = [
    [ "whenGreenFlag" ],
    [ "doIf", false, [
      ['true part'],
    ] ],
    ['stopAll'],
  ]

  let right = [
    [ "whenGreenFlag" ],
    [ "doIf", false, [
      ['true part'],
    ], [
      ['false part'],
    ] ],
    ['stopAll'],
  ]

  let diff = [
    [' '], // whenGreenFlag
    ['~', [
      [' ', 'doIf'],
      [' '], // false
      [' '], // true part
      ['+', [
        ['false part']
      ],
    ]]],
    [' '] // stopAll
  ]

  let result = scriptDiff(left, right)
  expect(result.diff).toEqual(diff)
  expect(result.score).toBe(2) // '_else_' + 'false part'

  let reverseDiff = [
    [' '], // whenGreenFlag
    ['~', [
      [' ', 'doIf'],
      [' '], // false
      [' '], // true part
      ['-', [
        ['false part']
      ],
    ]]],
    [' '] // stopAll
  ]

  let result2 = scriptDiff(right, left)
  expect(result2.diff).toEqual(reverseDiff)
  expect(result2.score).toBe(2)

})

// TODO is this even desirable?!
test.skip('can move blocks inside loop', () => {
  let left = [
    [ "whenGreenFlag" ],
    [ "doForever", [
      ['one'],
      ['two'],
    ]],
    ['three'],
    ['four'],
    ['five'],
  ]

  let right = [
    [ "whenGreenFlag" ],
    [ "doForever", [
      ['one'],
      ['two'],
      ['three'],
      ['four'],
    ]],
    ['five'],
  ]

  let diff = [
    [' '], // whenGreenFlag
    ['~', [
      [' ', 'doIf'],
      [' '], // false
      [' '], // true part
      ['+', [
        ['false part']
      ],
    ]]],
    [' '] // stopAll
  ]

  let result = scriptDiff(left, right)
  expect(result.diff).toEqual(diff)
  expect(result.score).toBe(2)

})

