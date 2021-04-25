const mockLeaderboard = require('./scores.json')
const LEADERBOARD_API_URI = 'https://simple-game-api.herokuapp.com'
// const LEADERBOARD_API_URI = 'http://localhost:3000'

export function loadImages(images) {
    const imageLoadTasks = images.map((image) => {
        return new Promise((resolve, reject) => {
            image.onload = () => {
                resolve()
            }

            image.onerror = (error) => {
                reject(error)
            }
        })
    })

    return Promise.all(imageLoadTasks)
}

export function loadFonts(fonts) {
    const fontLoadTasks = fonts.map((font) => {
        return font.load()
    })

    return Promise.all(fontLoadTasks)
}

export function fetchLeaderboard() {
    return fetch(LEADERBOARD_API_URI + '/leaderboard')
        .then((response) => response.json())
        .then((data) => {
            console.log('entries: ', data)
            return data
        })
}

export async function publishScore({ name, score }) {
    const url = LEADERBOARD_API_URI + '/leaderboard/scores'

    if (!score || isNaN(score)) {
        return new Error('Invalid score')
    }

    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, score }),
    })

    mockLeaderboard.push({ name, score })
}
