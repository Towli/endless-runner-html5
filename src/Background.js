import { CORE } from './constants'
import GameObject from './GameObject'

export default class Background extends GameObject {
    constructor(context) {
        super(context)
        this.layers = []
    }

    addLayer({ image, x = 0, y = 0, width = 896, height = 504, velocity }) {
        const speed = velocity * 0.03 * CORE.TIMESTEP
        this.layers.push({
            first: {
                image,
                x,
                y,
                width,
                height,
                velocity: speed,
            },
            second: { image, width, x: width, y, height, velocity: speed },
        })
    }

    move() {
        this.layers.forEach((layer) => {
            if (layer.first.x + layer.first.width < 0) {
                layer.first.x = layer.second.x + layer.second.width
            }

            if (layer.second.x + layer.second.width < 0) {
                layer.second.x = layer.first.x + layer.first.width
            }

            layer.first.x -= layer.first.velocity
            layer.second.x -= layer.second.velocity
        })
    }

    draw() {
        this.layers.forEach((layer) => {
            this.context.drawImage(
                layer.first.image,
                layer.first.x,
                layer.first.y,
                layer.first.width,
                layer.first.height
            )
            this.context.drawImage(
                layer.second.image,
                layer.second.x,
                layer.first.y,
                layer.second.width,
                layer.second.height
            )
        })
    }
}
