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
