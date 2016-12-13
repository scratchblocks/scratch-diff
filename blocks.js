
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

    this.count = this._count()
    if (isNaN(this.count)) throw new Error('bad')
    this.unwrap = this._unwrap()
  }

  static fromJSON(json) {
    if (!isArray(json)) {
      return json // primitive
    }

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
    for (var i=this.stacks.length; i--; ) {
      count += this.stacks[i].count
    }
    return count
  }

  _unwrap() {
    if (!this.stacks.length) return null

    let head = new Block(this.args, [])
    let out = []

    out.push(head)
    out = out.concat(this.stacks[0])
    if (this.stacks.length > 1) {
      out.push(Block.ELSE)
      out = out.concat(this.stacks[0])
    }
    out.push(Block.END)
    return out
  }

  toJSON() {
    return this.args.concat(this.stacks)
  }
}
Block.END = Block.fromJSON(['_end_'])
Block.ELSE = Block.fromJSON(['_else_'])


class Script {
  constructor(blocks) {
    this.blocks = blocks

    this.count = this._count()
    if (isNaN(this.count)) throw new Error('bad')
  }

  static fromJSON(json) {
    if (json === null) {
      return new Script([])
    }
    return new Script(json.map(Block.fromJSON))
  }

  _count() {
    var count = 0
    for (var i=this.blocks.length; i--; ) {
      count += this.blocks[i].count
    }
    return count
  }

  toJSON() {
    return this.blocks.map(b => b.toJSON())
  }
}


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
    return obj1 === obj2 ? Diff.EMPTY : Diff.replace(obj1, obj2)
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
      out[key] = item.diff
      score += item.score
    }
    if (score === 0) {
      return Diff.EMPTY
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
    if (score === 0) {
      return Diff.EMPTY
    }
    return new Diff(score, out)
  }

  static addAll(seq) {
    let out = []
    var score = 0
    for (var i=0; i<seq.length; i++) {
      let item = seq[i]
      score += item.count
      out.push(['+', toJSON(item)])
    }
    return new Diff(score, out)
  }

  static removeAll(seq) {
    let out = []
    var score = 0
    for (var i=0; i<seq.length; i++) {
      let item = seq[i]
      score += item.count
      out.push(['-', item])
    }
    return new Diff(score, out)
  }

  unshift(other) {
    if (!(other instanceof Diff)) throw new Error('bad')
    if (this.diff.constructor !== Array) throw 'bad'
    let score = this.score + other.score
    let diff = this.diff.slice()
    if (other.diff === undefined) {
      diff.unshift([' '])
    } else {
      diff.unshift(['~', other.diff])
    }
    return new Diff(score, diff)
  }

  add(item) {
    if (item instanceof Diff) throw 'bad'
    if (this.diff.constructor !== Array) throw 'bad'
    let score = this.score + item.count
    let diff = this.diff.slice()
    diff.unshift(['+', toJSON(item)])
    return new Diff(score, diff)
  }

  remove(item) {
    if (item instanceof Diff) throw 'bad'
    if (this.diff.constructor !== Array) throw 'bad'
    let score = this.score + item.count
    let diff = this.diff.slice()
    diff.unshift(['-', toJSON(item)])
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
Diff.EMPTY = new Diff(0, undefined)


module.exports = {
  Block,
  Script,
  Diff,
}

