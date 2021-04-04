export default class Queue {
    constructor() {
        this.elements = []
    }

    enqueue(element) {
        this.elements.push(element)
    }

    dequeue(element) {
        return this.elements.shift()
    }

    readAll() {
        return this.elements
    }

    flush() {
        this.elements = []
    }

    getLength() {
        return this.elements.length
    }
}
