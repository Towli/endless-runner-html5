const mockLeaderboard = require('./scores.json')

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
    return sortEntries(mockLeaderboard)
}

function sortEntries(entries) {
    return entries.sort((a, b) => b.score - a.score)
}

export async function publishScore({ name, score }) {
    if (!score || isNaN(score)) {
        return new Error('Invalid score')
    }

    mockLeaderboard.push({ name, score })
}
