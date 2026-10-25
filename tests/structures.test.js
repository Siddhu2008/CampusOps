import test from 'node:test'
import assert from 'node:assert/strict'
import { IncidentQueue, IncidentStack } from '../structures.js'

test('queue processes incidents in first-in, first-out order', () => {
  const queue = new IncidentQueue()
  queue.enqueue('first')
  queue.enqueue('second')
  queue.enqueue('third')

  assert.equal(queue.length, 3)
  assert.equal(queue.peek(), 'first')
  assert.equal(queue.dequeue(), 'first')
  assert.equal(queue.dequeue(), 'second')
  assert.equal(queue.dequeue(), 'third')
  assert.equal(queue.dequeue(), null)
  assert.equal(queue.isEmpty(), true)
})

test('queue preserves order when new incidents arrive after dequeue', () => {
  const queue = new IncidentQueue()
  for (let index = 0; index < 40; index += 1) queue.enqueue(index)
  for (let index = 0; index < 35; index += 1) assert.equal(queue.dequeue(), index)
  queue.enqueue(40)
  assert.equal(queue.dequeue(), 35)
  assert.equal(queue.peek(), 36)
})

test('stack undoes incidents in last-in, first-out order', () => {
  const stack = new IncidentStack()
  stack.push('first')
  stack.push('second')

  assert.equal(stack.length, 2)
  assert.equal(stack.peek(), 'second')
  assert.equal(stack.pop(), 'second')
  assert.equal(stack.pop(), 'first')
  assert.equal(stack.pop(), null)
  assert.equal(stack.isEmpty(), true)
})
