export default class GameObject {
    constructor(context, x, y, width, height) {
        this.context = context
        this.x = x
        this.y = y
        this.height = height
        this.width = width
        this.spriteSet = {}
    }

    draw() {
        this.context.fillStyle = this.colour
        this.context.fillRect(this.x, this.y, this.width, this.height)
    }

    setSprite(label, sprite) {
        this.spriteSet[label] = sprite
    }
}
