
const { Block, Script, Diff } = require('../src/blocks.js')


describe('Block', () => {

  test('counts reporters toward total', () => {
    let b = Block.fromJSON(['forward:', ['*', ['+', 1, 2], ['-', 3, 4]]])

    expect(b.count).toBe(4)
  })

  test('counts else as one', () => {
    expect(Block.fromJSON(['_else_']).count).toBe(1)
  })

  test('counts end as zero', () => {
    expect(Block.fromJSON(['_end_']).count).toBe(0)
  })

  test('unwraps', () => {
    let b = Block.fromJSON(['doForever', [
      ['forward:', 10],
      ['turnRight:', 90],
    ]])
    let out = b.unwrap(Script.EMPTY)

    expect(out).toBeInstanceOf(Script)
    expect(out.toJSON()).toEqual([
      ['doForever'],
      ['forward:', 10],
      ['turnRight:', 90],
      ['_end_'],
    ])
    expect(out.count).toBe(3)
  })

  test('unwrap blocks with arguments', () => {
    let b = Block.fromJSON(['doRepeat', 10, [
      ['forward:', 10],
      ['turnRight:', 90],
    ]])
    let out = b.unwrap(Script.EMPTY)

    expect(out).toBeInstanceOf(Script)
    expect(out.toJSON()).toEqual([
      ['doRepeat', 10],
      ['forward:', 10],
      ['turnRight:', 90],
      ['_end_'],
    ])
    expect(out.count).toBe(3)
  })

  test('unwraps onto script', () => {
    let b = Block.fromJSON(['doForever', [
      ['one'],
      ['two'],
    ]])
    let s = Script.fromJSON([
      ['three'],
      ['four'],
    ])
    let out = b.unwrap(s)

    expect(out).toBeInstanceOf(Script)
    expect(out.toJSON()).toEqual([
      ['doForever'],
      ['one'],
      ['two'],
      ['_end_'],
      ['three'],
      ['four'],
    ])
    expect(out.count).toBe(5)
    expect(b.count + s.count).toBe(5)
  })

  test('unwraps onto unwraps onto script', () => {
    let b1 = Block.fromJSON(['doForever', [
      ['one'],
      ['two'],
    ]])
    let b2 = Block.fromJSON(['doRepeat', 10, [
      ['three'],
      ['four'],
    ]])
    let out = b1.unwrap(b2.unwrap(Script.EMPTY))

    expect(out).toBeInstanceOf(Script)
    expect(out.toJSON()).toEqual([
      ['doForever'],
      ['one'],
      ['two'],
      ['_end_'],
      ['doRepeat', 10],
      ['three'],
      ['four'],
      ['_end_'],
    ])
    expect(out.count).toBe(6)
    expect(b1.count + b2.count).toBe(6)
  })

  test('unwraps if/else', () => {
    let b = Block.fromJSON(['doIf', false, [
      ['foo'],
      ['bar'],
    ], [
      ['quxx'],
      ['garply'],
    ]])
    let out = b.unwrap(Script.EMPTY)

    expect(out).toBeInstanceOf(Script)
    expect(out.toJSON()).toEqual([
      ['doIf', false],
      ['foo'],
      ['bar'],
      ['_else_'],
      ['quxx'],
      ['garply'],
      ['_end_'],
    ])
    expect(out.count).toBe(6)
    expect(b.count).toBe(6)
  })

})


describe('Script', () => {

  test('defines empty list singleton', () => {
    let s = Script.EMPTY
    expect(s.count).toBe(0)
    expect(s.length).toBe(0)
    expect(s.head).toBe(null)
    expect(s.tail).toBe(null)
  })

  test('makes empty list from JSON', () => {
    let s = Script.fromJSON([])
    expect(s).toBe(Script.EMPTY)
  })

  test('treats null as empty list (Scratch is stupid)', () => {
    let s = Script.fromJSON(null)
    expect(s).toBe(Script.EMPTY)
  })

  test('makes one-item list from JSON', () => {
    let s = Script.fromJSON([['stopAll']])
    expect(s.count).toBe(1)
    expect(s.length).toBe(1)
    expect(s.head).toBeInstanceOf(Block)
    expect(s.head.toJSON()).toEqual(['stopAll'])
    expect(s.tail).toBe(Script.EMPTY)
  })

  test('supports iteration', () => {
    let json = [['one'], ['two'], ['three']]
    let s = Script.fromJSON(json)
    let f = jest.fn()
    s.iter(f)
    expect(f.mock.calls.map(args => args[0].toJSON())).toEqual(json)
  })

  test('supports reverse iteration', () => {
    let json = [['one'], ['two'], ['three']]
    let s = Script.fromJSON(json)
    let f = jest.fn()
    s.reverseIter(f)
    json.reverse()
    expect(f.mock.calls.map(args => args[0].toJSON())).toEqual(json)
  })


  test('supports append', () => {
    let a = Script.fromJSON([['one'], ['two']])
    let b = Script.fromJSON([['three'], ['four']])
    let s = a.appendOnto(b)
    expect(s.toJSON()).toEqual([
      ['one'],
      ['two'],
      ['three'],
      ['four'],
    ])
  })

})


describe('Diff', () => {

  test('can make diff from seq', () => {
    let d = Diff.seq([1, 2, 3], [1, 2, 3, 4], (a, b) => Diff.equal(a, b))
  })

})
