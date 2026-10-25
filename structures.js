export class IncidentQueue {
  #items = []
  #head = 0

  enqueue(item) {
    this.#items.push(item)
  }

  dequeue() {
    if (this.isEmpty()) return null
    const item = this.#items[this.#head]
    this.#head += 1
    if (this.#head > 32 && this.#head * 2 >= this.#items.length) {
      this.#items = this.#items.slice(this.#head)
      this.#head = 0
    }
    return item
  }

  peek() {
    return this.#items[this.#head] ?? null
  }

  get length() {
    return this.#items.length - this.#head
  }

  isEmpty() {
    return this.length === 0
  }
}

export class IncidentStack {
  #items = []

  push(item) {
    this.#items.push(item)
  }

  pop() {
    return this.#items.pop() ?? null
  }

  peek() {
    return this.#items.at(-1) ?? null
  }

  get length() {
    return this.#items.length
  }

  isEmpty() {
    return this.#items.length === 0
  }
}
