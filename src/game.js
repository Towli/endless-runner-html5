'use strict'

import { loadImages, loadFonts, fetchLeaderboard, publishScore } from './utils'
import { CORE } from './constants'

import Queue from './Queue'
import Platform from './Platform'
import Player from './Player'
import Background from './Background'

import Font from './SyneMono-Regular.ttf'
import './style.css'

import cityBackgroundSrc from './assets/city/bright/city.png'
import boxesAndContainersSrc from './assets/city/bright/boxes_and_containers.png'
import buildingsSrc from './assets/city/bright/buildings.png'
import roadAndBorderSrc from './assets/city/bright/road_and_border.png'
import skySrc from './assets/city/bright/sky.png'
import wall1Src from './assets/city/bright/wall_1.png'
import wall2Src from './assets/city/bright/wall_2.png'
import wheelsAndHydrantSrc from './assets/city/bright/wheels_and_hydrant.png'

import runSpriteSrc from './assets/woodcutter/run.png'
import jumpSpriteSrc from './assets/woodcutter/jump.png'
import fallSpriteSrc from './assets/woodcutter/fall.png'
import platformSpriteSrc from './assets/city/platform_tile.png'

import audioSrc from './assets/hxc.mp3'

const modal = document.querySelector('.modal')
const publishButton = document.querySelector('button#publish')
const backButton = document.querySelector('button#back')
const nameInput = document.querySelector('.modal input')

/**
todo
----
1. promote movement to objects
2. create platform prop class
3. look into hit regions for buttons within canvas

platform spawning
-----------------
rules:
1. no platform's xMin or xMax should overlap another's
2. if a platform's xMax is < 0 it should be removed
3. a platform's xMin and width should be randomised on spawn
4. a platform's width can be greater than the canvas width (to a sensible limit)
current solution:
- manage a FIFO queue of platforms
- a platform's x and width is determined based on the last platform in the queue, when enqueueing
- each platform has responsibility for detecting whether it needs requeueing, and does so via callback
- when drawing each frame, use a value copy of the platform queue to prevent rendering issues from 
requeueing
 */

const GAME_STATES = {
    WON: 1,
    PLAYING: 2,
    LOST: 3,
    IDLE: 4,
}

const GAME_SCREEN = {
    MENU: 1,
    GAME: 2,
    GAME_OVER: 3,
    LEADERBOARD: 4,
    PUBLISH: 4,
}

const game = {
    fps: 0,
    state: GAME_STATES.IDLE,
    bestScore: null,
    firstUpdate: true,
    screen: null,
}

const KEYCODES = {
    SPACE: 32,
    L: 76,
    P: 80,
    M: 77,
}

const backdrop = {
    first: {
        image: null,
        x: 0,
    },
    second: {
        image: null,
        x: 896,
    },
}

// todo; rehome these
let canvas,
    context,
    animationFrameRequestId,
    player,
    background,
    runSprite,
    jumpSprite,
    fallSprite,
    platformSprite,
    lastFrameTimeInMs = 0,
    _maxFPS = 10,
    delta = 0,
    platformQueue,
    backgroundImages

function initialise() {
    canvas = document.getElementById('canvas')
    context = canvas.getContext('2d')

    const SyneMono = new FontFace('Syne Mono', `url(${Font})`)

    canvas.width = canvas.height = CORE.CANVAS_WIDTH
    context.imageSmoothingEnabled = false

    backdrop.first.image = new Image()
    backdrop.first.image.src = cityBackgroundSrc
    backdrop.second.image = new Image()
    backdrop.second.image.src = cityBackgroundSrc

    const backgroundImageSrcset = [
        { label: 'sky', src: skySrc, velocity: 0.8 },
        { label: 'buildings', src: buildingsSrc, velocity: 1.5 },
        { label: 'wall2', src: wall2Src, velocity: 2.5 },
        { label: 'wall1', src: wall1Src, velocity: 3 },
        {
            label: 'boxesAndContainers',
            src: boxesAndContainersSrc,
            velocity: 3,
        },
        { label: 'roadAndBorder', src: roadAndBorderSrc, velocity: 3 },
        { label: 'wheelsAndHydrant', src: wheelsAndHydrantSrc, velocity: 3 },
    ]

    backgroundImages = backgroundImageSrcset.map((item) => {
        const image = new Image()
        image.src = item.src
        return {
            ...item,
            image,
        }
    })

    runSprite = new Image()
    runSprite.src = runSpriteSrc

    jumpSprite = new Image()
    jumpSprite.src = jumpSpriteSrc

    fallSprite = new Image()
    fallSprite.src = fallSpriteSrc

    platformSprite = new Image()
    platformSprite.src = platformSpriteSrc

    platformQueue = new Queue()

    loadImages([
        ...backgroundImages.map((img) => img.image),
        backdrop.first.image,
        backdrop.second.image,
        runSprite,
        jumpSprite,
        platformSprite,
    ])
        .then(() => {
            return loadFonts([SyneMono])
        })
        .then(() => {
            registerEventListeners()
            renderMenuScreen()
        })
}

function cleanStartGameLoop() {
    startMusic()
    game.screen = GAME_SCREEN.GAME
    game.firstUpdate = true

    background = new Background(context)
    backgroundImages.forEach((item) => {
        background.addLayer({ image: item.image, velocity: item.velocity })
    })

    player = new Player(context, 50, 30, CORE.PLAYER_WIDTH, CORE.PLAYER_HEIGHT)
    player.setSprite('run', runSprite)
    player.setSprite('jump', jumpSprite)
    player.setSprite('fall', fallSprite)

    const platforms = generatePlatformVariations(30, platformSprite)

    populateInitialQueueState(platformQueue, platforms)

    game.state = GAME_STATES.PLAYING

    window.requestAnimationFrame(update)
}

function update(timestamp) {
    if (game.firstUpdate) {
        lastFrameTimeInMs = timestamp
    }

    delta += timestamp - lastFrameTimeInMs // get the delta time since last frame
    lastFrameTimeInMs = timestamp

    // simulate updates until we reach the timestep
    while (delta >= CORE.TIMESTEP) {
        calculateMovement()
        updateGameState()
        updateScore()
        handleCollisions()
        scaleDifficultyByScore()
        delta -= CORE.TIMESTEP
    }

    if (game.state === GAME_STATES.LOST) {
        return endGame()
    }

    draw()
    animationFrameRequestId = window.requestAnimationFrame(update)
    game.firstUpdate = false
}

function calculateMovement() {
    player.move()

    const platforms = [...platformQueue.readAll()]

    platforms.forEach((platform) => {
        platform.move(() => {
            requeuePlatform(platformQueue)
        })
    })

    background.move()
}

function handleCollisions() {
    if (isColliding(player, platformQueue.readAll()) && !player.isJumping) {
        player.isColliding = true
        player.velocity.y = -player.velocity.y / 3
    }
}

function draw() {
    context.fillStyle = CORE.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    background.draw()

    // find better solution for this
    platformQueue
        .readAll()
        .slice(0, 5)
        .forEach((platform) => platform.draw())

    player.draw()

    drawHUD()
}

function registerEventListeners() {
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keyup', handleKeyup)
    document.addEventListener('touchstart', handleTouchStart)

    nameInput.addEventListener('keyup', (event) => {
        if (event.keyCode === 13) {
            event.preventDefault()
            publishButton.click()
        }
    })

    publishButton.onclick = async () => {
        await publishScore({ name: nameInput.value, score: game.bestScore }).catch(console.log)
        nameInput.value = null
        modal.style.display = 'none'
        window.requestAnimationFrame(renderLeaderboard)
    }

    backButton.onclick = () => {
        nameInput.value = null
        modal.style.display = 'none'
        window.requestAnimationFrame(renderLeaderboard)
    }
}

function handleKeydown(e) {
    if (game.state === GAME_STATES.PLAYING) {
        if (e.keyCode === KEYCODES.SPACE) {
            return jump()
        }
    }

    if (game.state !== GAME_STATES.PLAYING) {
        switch (e.keyCode) {
            case KEYCODES.SPACE:
                return cleanStartGameLoop()
            case KEYCODES.L:
                return renderLeaderboard()
            case KEYCODES.P:
                return renderPublishScoreScreen()
            case KEYCODES.M:
                return renderMenuScreen()
        }
    }
}

function handleKeyup(e) {
    if (e.keyCode === KEYCODES.SPACE) {
        // todo
    }
}

function handleTouchStart(_e) {
    if (game.state === GAME_STATES.PLAYING) {
        return jump()
    }

    if (game.state === GAME_STATES.IDLE || game.state === GAME_STATES.LOST) {
        return cleanStartGameLoop()
    }
}

function jump() {
    if (player.y > 0 && player.jumps > 0) {
        player.isJumping = true
        player.isFalling = false
        player.isColliding = false
        player.currentFrame = 0
        player.velocity.y = -CORE.JUMP_SPEED
        player.jumps--
    }
}

function updateGameState() {
    if (player.y > canvas.height || player.x + player.width < 0) {
        game.state = GAME_STATES.LOST
    }
}

function endGame() {
    window.cancelAnimationFrame(animationFrameRequestId) // not sure if this does much here
    setBestScore()
    renderGameOverScreen()
}

function isColliding(player, platforms) {
    const performAABBTest = (rectA, rectB) => {
        return (
            rectA.x + rectA.width > rectB.x &&
            rectA.x < rectB.x + rectB.width &&
            rectA.y + rectA.height > rectB.y &&
            rectA.y < rectB.y + rectB.height
        )
    }

    const collidedFromLeft = (rectA, rectB) => {
        return rectA.x + rectA.width < rectB.oldX
    }

    const collidedFromBottom = (rectA, rectB) => {
        return rectA.oldY > rectB.y + rectB.height
    }

    for (let i = 0; i < platforms.length; i++) {
        const playerRect = {
            ...player,
            width: player.width,
            height: player.height,
        }
        const platformRect = {
            x: platforms[i].x,
            y: platforms[i].y,
            oldX: platforms[i].oldX,
            width: platforms[i].width,
            height: platforms[i].height,
        }

        const collision = performAABBTest(playerRect, platformRect)

        if (collision) {
            const leftCollision = collidedFromLeft(playerRect, platformRect)

            if (leftCollision) {
                return (player.velocity.x = -0.5)
            }

            const bottomCollision = collidedFromBottom(playerRect, platformRect)

            if (bottomCollision) {
                return (player.velocity.y = 0.5)
            }

            player.jumps = CORE.MAX_JUMPS
            return (player.y = platforms[i].y - player.height)
        }
    }
}

function renderMenuScreen() {
    game.screen = GAME_SCREEN.MENU
    document.addEventListener('keydown', handleKeydown)
    context.fillStyle = CORE.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(backdrop.first.image, 0, 0, 896, 504)
    context.textAlign = 'center'
    context.font = '24px Syne Mono'
    context.fillStyle = 'white'
    context.fillText('RUN THE STREETS', canvas.width / 2, canvas.height / 3)
    context.font = '16px Syne Mono'
    context.fillStyle = 'black'
    context.fillRect(canvas.width / 2 - 50, canvas.height / 2 - 20, 100, 30)
    context.fillStyle = 'white'
    context.fillText(`PRESS ⎵`, canvas.width / 2, canvas.height / 2)

    drawHUD()
}

function renderGameOverScreen() {
    game.screen = GAME_SCREEN.GAME_OVER
    context.fillStyle = CORE.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(backdrop.first.image, 0, 0, 896, 504)
    context.textAlign = 'center'
    context.font = '24px Syne Mono'
    context.fillStyle = 'white'
    context.fillText('TRY AGAIN', canvas.width / 2, canvas.height / 4)
    context.font = '16px Syne Mono'
    context.fillText(`SCORE: ${player.score}`, canvas.width / 2, canvas.height / 2.7)
    context.font = '16px Syne Mono'
    context.fillText(`BEST: ${game.bestScore}`, canvas.width / 2, canvas.height / 2.2)
    context.font = '16px Syne Mono'
    context.fillText('PRESS ⎵', canvas.width / 2, canvas.height / 1.3)

    drawHUD()
}

function renderPublishScoreScreen() {
    game.screen = GAME_SCREEN.PUBLISH
    modal.style.display = 'flex'
    nameInput.focus()

    drawHUD()
}

function drawHUD() {
    drawScore()
    drawOptions()
}

function drawFps() {
    context.font = '14px Syne Mono'
    context.fillStyle = 'black'
    context.fillText(`fps:  ${game.fps}`, 50, 40)
}

function drawScore() {
    context.font = '14px Syne Mono'
    context.fillStyle = 'black'

    if (game.state === GAME_STATES.PLAYING) {
        context.fillText(`score: ${player.score}`, 50, 20)
    }

    if (game.bestScore) {
        context.fillText(`best: ${game.bestScore}`, canvas.width / 1.1, 20)
    }
}

function drawOptions() {
    context.font = '14px Syne Mono'
    context.fillStyle = 'black'

    if (game.screen === GAME_SCREEN.GAME) {
        return
    }

    context.fillText('menu [M]', canvas.width / 10, 20)
    context.fillText('publish [P]', canvas.width / 2.9, 20)
    context.fillText('leaderboard [L]', canvas.width / 1.5, 20)
}

function updateScore() {
    player.score++
}

function startMusic() {
    if (!game.audio) {
        game.audio = new Audio(audioSrc)
    }
    game.audio.play()
    game.audio.loop = true
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min
}

function scaleDifficultyByScore() {
    const threshold = 400

    if (player.score >= threshold * 4) {
        return
    }

    const velocityIncease = 0.07
    if (player.score % threshold === 0) {
        platformQueue.readAll().forEach((platform) => (platform.velocity += velocityIncease))
    }
    player.animationSpeed += 0.1
}

function setBestScore() {
    if (player.score > game.bestScore) {
        game.bestScore = player.score
    }
}

/**
    build an array of platform variations. not concerned about their positions 
    as this will get set at the poiint of enqueuing (based on the element in front)
 */
function generatePlatformVariations(amount, sprite) {
    const platformHeight = 50 // fixed value for now

    const platforms = []

    for (let i = 0; i < amount; i++) {
        const platform = new Platform(
            context,
            0,
            0,
            getRandomArbitrary(70, canvas.width),
            platformHeight
        )

        platform.setSprite('tile', sprite)

        platforms.push(platform)
    }

    return platforms
}

function populateInitialQueueState(queue, platforms) {
    queue.flush()

    for (let i = 0; i < platforms.length; i++) {
        if (i === 0) {
            platforms[i].x = canvas.width / 2 // first platform should be easy to land on
        } else {
            const previousPlatform = platforms[i - 1]
            const randomOffset = getRandomArbitrary(50, 150)

            platforms[i].x = previousPlatform.x + previousPlatform.width + randomOffset
        }

        platforms[i].y = getRandomArbitrary(canvas.height - 200, canvas.height - 50)

        queue.enqueue(platforms[i])
    }

    return queue
}

function requeuePlatform(queue) {
    const platform = queue.dequeue()

    const platforms = queue.readAll()
    const randomOffset = getRandomArbitrary(50, 150)

    platform.x =
        platforms[platforms.length - 1].x + platforms[platforms.length - 1].width + randomOffset
    platform.y = getRandomArbitrary(canvas.height - 200, canvas.height - 50)

    queue.enqueue(platform)
}

function renderLeaderboard() {
    game.screen = GAME_SCREEN.LEADERBOARD

    const entries = fetchLeaderboard()

    context.fillStyle = CORE.BG_COLOUR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(backdrop.first.image, 0, 0, 896, 504)
    context.textAlign = 'center'
    context.font = '20px Syne Mono'
    context.fillStyle = 'white'
    context.fillText('HALL OF FAME', canvas.width / 2, canvas.height / 6)
    context.fillText('RANK   SCORE   NAME', canvas.width / 2, canvas.height / 3)
    context.font = '16px Syne Mono'

    entries.forEach((entry, index) => {
        context.fillText(
            ` ${index + 1}       ${entry.score}     ${entry.name}`,
            canvas.width / 2,
            canvas.height / 3 + (index + 1) * 25
        )
    })

    drawHUD()
}

initialise()
