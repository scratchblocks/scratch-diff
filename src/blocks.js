
function isArray(obj) {
  return obj && obj.constructor === Array
}

function isScript(obj) {
  return obj === null // empty stack
      || (isArray(obj) && isArray(obj[0]))
}

function toJSON(obj) {
  return obj && obj.toJSON ? obj.toJSON() : obj
}


class Block {
  constructor(args, stacks) {
    this.args = args
    this.stacks = stacks

    this.canUnwrap = this.stacks.length
    if (this.canUnwrap) {
      this._head = new Block(args, [])
    }

    this.count = this._count()
    if (isNaN(this.count)) throw new Error('bad')
  }

  static fromJSON(json) {
    if (!isArray(json)) {
      return json // primitive
    }

    // TODO report tosh bug: [] vs [null] inside procDefs

    var args = json.slice()
    let stacks = []
    while (isScript(args[args.length - 1])) {
      stacks.push(Script.fromJSON(args.pop()))
    }
    if (stacks.length > 2) {
      console.error(json)
      throw 'bad json'
    }
    if (args[0] !== 'procDef') {
      args = args.map(Block.fromJSON)
    }
    return new Block(args, stacks)
  }

  _count() {
    var count = 1
    for (var i=this.args.length; i--; ) {
      if (this.args[i].constructor === Block) {
        count += this.args[i].count
      }
    }
    if (this.args[0] === '_else_' | this.args[0] === '_end_') {
      count -= 1
    }
    for (var i=this.stacks.length; i--; ) {
      count += this.stacks[i].count
    }
    return count
  }

  unwrap(base) {
    if (!this.canUnwrap) throw new Error('no stacks')

    var s = new Script(Block.END, base)

    s = this.stacks[0].appendOnto(s)

    if (this.stacks.length > 1) {
      s = new Script(Block.ELSE, s)
      s = this.stacks[1].appendOnto(s)
    }

    s = new Script(this._head, s)
    return s
  }

  toJSON() {
    return this.args.map(toJSON).concat(this.stacks.map(toJSON))
  }
}


class Script {
  constructor(head, tail) {
    if (head !== null && !(head instanceof Block)) throw new Error('not a block')
    this.head = head
    this.tail = tail
    this.length = tail ? tail.length + 1 : 0

    this.count = this._count()
    if (isNaN(this.count)) throw new Error('bad')
  }

  static fromList(blocks) {
    var s = Script.EMPTY
    for (var i=blocks.length; i--; ) {
      s = new Script(blocks[i], s)
    }
    return s
  }

  static fromJSON(json) {
    if (json === null) json = []
    return Script.fromList(json.map(Block.fromJSON))
  }

  _count() {
    var count = 0
    if (this.head) count += this.head.count
    if (this.tail) count += this.tail.count
    return count
  }

  iter(cb) {
    if (this.head) cb(this.head)
    if (this.tail) this.tail.iter(cb)
  }

  reverseIter(cb) {
    if (this.tail) this.tail.reverseIter(cb)
    if (this.head) cb(this.head)
  }

  toJSON() {
    let blocks = []
    this.iter(block => blocks.push(block.toJSON()))
    return blocks
  }

  appendOnto(other) {
    var s = other
    this.reverseIter(block => {
      s = new Script(block, s)
    })
    return s
  }
}

Block.END = Block.fromJSON(['_end_'])
Block.ELSE = Block.fromJSON(['_else_'])

Script.EMPTY = new Script(null, null)


class Diff {
  constructor(score, diff) {
    if (isNaN(score)) throw new Error('bad')
    this.score = score
    this.diff = diff
    
    if (diff === undefined) {
      if (this.score !== 0) throw 'oops'
    } else {
      if (typeof diff !== 'object') throw 'oops'
      if (diff.constructor === Array && typeof diff[0] === 'string') throw 'oops'
    }
  }

  static equal(obj1, obj2) {
    return (
      obj1 === obj2 ||
      (obj1 && obj1.length === 0 && obj2 && obj2.length === 0)
    ) ? Diff.UNDEFINED : Diff.replace(obj1, obj2)
  }

  static replace(obj1, obj2) {
    //if ((obj1.count === undefined) !== (obj2.count === undefined)) throw 'bad'
    //var score = obj1.count === undefined ? 1 : obj1.count + obj2.count
    var score = 1
    return new Diff(score, { __old: toJSON(obj1), __new: toJSON(obj2) })
  }

  box() {
    return this.diff === undefined ? [' '] : ['~', this.diff]
  }

  static object(obj) {
    let out = {}
    var score = 0
    for (var key in obj) {
      let item = obj[key]
      if (!(item instanceof Diff)) throw 'bad'
      if (item.diff) {
        out[key] = item.diff
      }
      score += item.score
    }
    if (score === 0) {
      return Diff.UNDEFINED
    }
    return new Diff(score, out)
  }

  static seq(seq1, seq2, getDiff) {
    let min = Math.min(seq1.length, seq2.length)
    let out = []
    var score = 0
    for (var i=0; i<min; i++) {
      let diff = getDiff(seq1[i], seq2[i])
      score += diff.score
      out.push(diff.box())
    }
    for ( ; i < seq1.length; i++) {
      let item = seq1[i]
      if (item && item.count) {
        score += item.count
      }
      out.push(['-', toJSON(item)])
    }
    for ( ; i < seq2.length; i++) {
      let item = seq2[i]
      if (item && item.count) {
        score += item.count
      }
      out.push(['+', toJSON(item)])
    }
    return new Diff(score, out)
  }

  addAll(script) {
    if (this.diff.constructor !== Array) throw 'must be array diff'
    let out = this.diff.slice()
    var score = this.score
    script.iter(block => {
      score += block.count
      out.push(['+', block.toJSON()])
    })
    return new Diff(score, out)
  }

  removeAll(script) {
    if (this.diff.constructor !== Array) throw 'must be array diff'
    let out = this.diff.slice()
    var score = this.score
    script.iter(block => {
      score += block.count
      out.push(['-', block.toJSON()])
    })
    return new Diff(score, out)
  }

  push(other) {
    if (!(other instanceof Diff)) throw new Error('not a diff')
    if (this.diff.constructor !== Array) throw 'must be array diff'
    let score = this.score + other.score
    let diff = this.diff.slice()
    if (other.diff === undefined) {
      diff.push([' '])
    } else {
      diff.push(['~', other.diff])
    }
    return new Diff(score, diff)
  }

  add(item) {
    if (item instanceof Diff) throw 'bad'
    if (this.diff.constructor !== Array) throw 'must be array diff'
    let score = this.score + item.count
    let diff = this.diff.slice()
    diff.push(['+', toJSON(item)])
    return new Diff(score, diff)
  }

  remove(item) {
    if (item instanceof Diff) throw 'bad'
    if (this.diff.constructor !== Array) throw 'must be array diff'
    let score = this.score + item.count
    let diff = this.diff.slice()
    diff.push(['-', toJSON(item)])
    return new Diff(score, diff)
  }

  static best(options) {
    var best
    for (var i=0; i<options.length; i++) {
      let diff = options[i]
      if (!diff) continue
      if (!(diff instanceof Diff)) throw new Error('bad')
      if (!best || diff.score < best.score) {
        best = diff
      }
    }
    return best
  }

}
Diff.UNDEFINED = new Diff(0, undefined)
Diff.EMPTY_LIST = new Diff(0, [])


module.exports = {
  Block,
  Script,
  Diff,
}

