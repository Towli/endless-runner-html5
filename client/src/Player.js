import GameObject from './GameObject'

import { CORE } from './constants'

export default class Player extends GameObject {
    constructor(context, x, y, width, height, colour = CORE.PLAYER_COLOUR) {
        super(context, x, y, width, height)
        this.colour = colour
        this.oldX = x
        this.oldY = y
        this.velocity = {
            x: 0,
            y: 0,
        }
        this.score = 0
        this.bestScore = 0
        this.isJumping = false
        this.isFalling = true
        this.jumps = CORE.MAX_JUMPS
        this.sprite = null
        this.currentFrame = 0
        this.animationSpeed = 0.4
    }

    move() {
        if (this.velocity.y > 0) {
            if (this.isJumping) {
                this.currentFrame = 0
            }

            this.isJumping = false
            this.isFalling = true
        } else {
            this.isFalling = false
        }

        if (this.velocity.y < CORE.MAX_VELOCITY) {
            this.velocity.y += CORE.GRAVITY * CORE.TIMESTEP
        }

        this.velocity.y = Math.min(this.velocity.y, CORE.MAX_VELOCITY)
        this.oldY = this.y
        this.y += this.velocity.y * CORE.TIMESTEP
        this.x += this.velocity.x * CORE.TIMESTEP
    }

    draw() {
        this.drawSprite()
    }

    // refactor this garbo
    drawSprite() {
        let currentSprite = this.spriteSet['run']
        let numFrames = 6

        if (this.isJumping) {
            currentSprite = this.spriteSet['jump']
            numFrames = 3
        }

        if (this.isFalling) {
            currentSprite = this.spriteSet['fall']
            numFrames = 3
        }

        if (this.currentFrame >= numFrames) {
            if (this.isFalling || this.isJumping) {
                this.currentFrame = numFrames - 1
            } else {
                this.currentFrame = 0
            }
        }

        const width = currentSprite.width / numFrames
        const height = currentSprite.height
        const sourceX = Math.floor(this.currentFrame) * width
        const sourceY = 15 // hardcoded offset for good clipping, temp..

        this.context.drawImage(
            currentSprite,
            sourceX,
            sourceY,
            width - 15,
            height - 15,
            this.x,
            this.y,
            this.width,
            this.height
        )

        this.currentFrame += 0.3
    }
}
