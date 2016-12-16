
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

test.skip('replaces commands with different selectors', () => {
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

test('can modify arguments in nested repoters', () => {

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

  let diff = [
    [
      "~",
      {
        "args": [
          [
            " "
          ]
        ],
        "stacks": [
          [
            "~",
            [
              [
                "~",
                {
                  "args": [
                    [
                      " "
                    ],
                    [
                      "~",
                      {
                        "args": [
                          [
                            " "
                          ],
                          [
                            "~",
                            {
                              "__old": "left arrow",
                              "__new": "a"
                            }
                          ]
                        ],
                        "stacks": []
                      }
                    ]
                  ],
                  "stacks": [
                    [
                      " "
                    ]
                  ]
                }
              ],
              [
                "~",
                {
                  "args": [
                    [
                      " "
                    ],
                    [
                      "~",
                      {
                        "args": [
                          [
                            " "
                          ],
                          [
                            "~",
                            {
                              "__old": "right arrow",
                              "__new": "d"
                            }
                          ]
                        ],
                        "stacks": []
                      }
                    ]
                  ],
                  "stacks": [
                    [
                      " "
                    ]
                  ]
                }
              ],
              [
                " "
              ],
              [
                " "
              ],
              [
                " "
              ],
              [
                " "
              ],
              [
                " "
              ]
            ]
          ]
        ]
      }
    ],
    [ " " ],
    [ " " ],
    [ " " ],
    [ " " ],
    [ " " ]
  ]

  let result = scriptDiff(left, right)
  expect(result.score).toBe(2)
  expect(result.diff).toEqual(diff)

})

