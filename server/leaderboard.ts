import mockLeaderboardJSON from './mockLeaderboard.json'

export const getEntries = async () => {
    return sortEntries(mockLeaderboardJSON)
}

type Entry = {
    score: number
    name: string
    date?: Date
}

export const addEntry = async (entry: Entry) => {
    if (!entry?.name || !entry?.score) {
        throw new Error('invalid shape for new entry')
    }
    mockLeaderboardJSON.push(entry)
}

const sortEntries = (entries) => {
    return entries.sort((a, b) => {
        return b.score - a.score
    })
}
