/*global document */

const button = document.querySelector("#publish > .round-button")
button.addEventListener("click", forcePublish)

function forcePublish() {
    restartAnimation()
}

let circle = document.querySelector("#publish > .countdown > .countdown-circle")

function restartAnimation() {
    const clone = circle.cloneNode(true)
    circle.parentNode.replaceChild(clone, circle)
    circle = clone
}
