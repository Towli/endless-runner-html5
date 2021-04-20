import GameObject from './GameObject'
import { CORE } from './constants'

export default class Platform extends GameObject {
    constructor(context, x, y, width, height, colour = CORE.PLATFORM_COLOUR) {
        super(context, x, y, width, height)
        this.colour = colour
        this.height = height
        this.width = width
        this.x = x
        this.oldX = x
        this.y = y
        this.oldY = y
        this.velocity = 0.4
    }

    move(requeueHandler) {
        if (this.x + this.width < 0) {
            requeueHandler()
        }

        this.oldX = this.x
        this.x -= this.velocity * CORE.TIMESTEP
    }

    draw() {
        this.drawSprite()
    }

    drawSprite() {
        const sprite = this.spriteSet['tile']
        this.context.drawImage(sprite, this.x, this.y, this.width, this.height)
    }
}
