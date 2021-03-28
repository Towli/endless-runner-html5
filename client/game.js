'use strict'

const CONSTANTS = {
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    BG_COLOUR: '#28AFB0',
    PLAYER_COLOUR: '#1F271B',
    PLAYER_HEIGHT: 10,
    PLAYER_WIDTH: 10,
    TERRAIN_COLOUR: '',
}

const GAME_STATE = {
    player: {
        position: {
            x: 10,
            y: 10,
        },
    },
}

// const canvas, context

function initialise() {
    // initialise canvas element
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    canvas.width = canvas.height = CONSTANTS.CANVAS_WIDTH

    context.fillStyle = CONSTANTS.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)

    update(context)
}

function update(context) {
    // calculate movement
    // check collisions
    // draw
    draw(context)
}

function draw(context) {
    context.fillStyle = CONSTANTS.PLAYER_COLOUR
    context.fillRect(
        GAME_STATE.player.position.x,
        GAME_STATE.player.position.y,
        CONSTANTS.PLAYER_WIDTH,
        CONSTANTS.PLAYER_HEIGHT
    )
}

initialise()
