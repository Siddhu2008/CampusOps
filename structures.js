const priorityOrder = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
}

export function compareIncidentPriority(first, second) {
  const priorityDifference = (priorityOrder[first.priority] ?? 4) - (priorityOrder[second.priority] ?? 4)
  if (priorityDifference !== 0) return priorityDifference

  const timeDifference = new Date(first.createdAt) - new Date(second.createdAt)
  if (timeDifference !== 0) return timeDifference

  return String(first._id ?? first.id).localeCompare(String(second._id ?? second.id))
}

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
