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

export function fetchLeaderboard() {
    return sortEntries(mockLeaderboard)
}

function sortEntries(entries) {
    return entries.sort((a, b) => b.score - a.score)
}

export function publishScore({ name, score }) {
    mockLeaderboard.push({ name, score })
}
