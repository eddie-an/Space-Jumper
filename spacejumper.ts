// Space Jumper: endless neon-space vertical jumper (MakeCode Arcade, no extensions)

// ============================================================
// CONFIG
// ============================================================

namespace SpriteKind {
    export const Planet = SpriteKind.create()
}

const JumpSpeed = 190
const Gravity = 320
const MoveSpeed = 90
const BulletSpeed = 140
const MaxActiveBullets = 3
const MaxAmmo = 5
const ScrollLine = 50

// ============================================================
// IMAGES
// ============================================================

let playerRightImg = img`
. . . . f 2 2 f . . . . . . . . 
. . . f 1 2 2 2 . . . . . . . . 
. . . 6 3 f f 9 f . . . . . . . 
. . . a 3 f f f f . . . . . . . 
. . 6 c d 2 f f f . . . . . . . 
. f 2 2 a c c 3 1 . . . . . . . 
. f 2 1 8 6 c c c 6 6 2 2 . . . 
. f 1 b f c c 2 c 2 2 2 2 9 . . 
. . b 1 1 b f b f d f f . . . . 
. . 8 f f f 1 6 . f . . . . . . 
. . . 6 1 d b 1 1 . . . . . . . 
. . 8 6 1 f . b b 2 . . . . . . 
. . b 2 a . . f 8 6 . . . . . . 
. . b 1 . . . . d b . . . . . . 
. f 1 b . . . . d 1 1 . . . . . 
. 2 2 2 . . . . 2 2 2 . . . . . 
`


let playerLeftImg = playerRightImg.clone()
playerLeftImg.flipX()

let alienImg = img`
. . . . 5 . . . . . . 5 . . . . 
. . . . c c . . . . c c . . . . 
. . . . . f f 7 7 f f . . . . . 
. . . . f 7 7 7 7 7 7 f . . . . 
. . . 7 7 f 7 7 7 7 f 7 7 . . . 
. . . 7 7 f f 7 7 f f 7 7 . . . 
. . . . f 7 f 7 7 f 7 f . . . . 
. . . . . c 6 7 7 6 c . . . . . 
. . . . f 3 a 3 3 c 3 f . . . . 
. . . . a a 6 c c 6 a a . . . . 
. . . f 6 . a 8 a a . 6 f . . . 
. . . 7 7 . f 3 3 f . 7 7 . . . 
. . . f . f a a a a f . f . . . 
. . . . . 3 3 . . 3 3 . . . . . 
. . . . . 7 6 . . c 7 . . . . . 
. . . . 4 4 4 . . 4 4 4 . . . . 
`


let planetImg = img`
    . . . . . . a a a a a a a a a a a a . . . . . .
    . . . a a a a a a a a a a a a a a a a a a . . .
    . a a a a a a a a a a a a a a a a a a a a a a .
    a a a a 3 3 3 a a a a a a a a a a a a a a a a a
    a a a a a a a a a a a a a a a a a a a a a a a a
    . c c c c c c c c c c c c c c c c c c c c c c .
    . . . c c c c c c c c c c c c c c c c c c . . .
    . . . . . . c c c c c c c c c c c c . . . . . .
`

let ammoImg = img`
    . . . 5 5 . . .
    . . 5 5 5 . . .
    . 5 5 5 . . . .
    . 5 5 5 5 5 . .
    . . . 5 5 . . .
    . . 5 5 . . . .
    . 5 5 . . . . .
    . . . . . . . .
`

let bulletImg = img`
    . 1 1 1 1 .
    1 5 5 5 5 1
    1 5 5 5 5 1
    . 1 1 1 1 .
`

// ============================================================
// STATE
// ============================================================

let player: Sprite = null
let facing = 1
let ammo = 3
let height = 0
let killBonus = 0
let prevBottom = 0
let topPlanetY = 0
let planetsSpawned = 0

let planets: Sprite[] = []

// Aliens and ammo pickups ride on a host planet; parallel arrays share an index
let aliens: Sprite[] = []
let alienHost: Sprite[] = []
let alienOff: number[] = []
let alienDir: number[] = []

let ammoSprites: Sprite[] = []
let ammoHost: Sprite[] = []
let ammoOff: number[] = []

// Fixed bullet pool (MaxActiveBullets sprites, recycled forever)
let bullets: Sprite[] = []
let bulletActive: boolean[] = []

// Background stars
let starX: number[] = []
let starY: number[] = []
let starC: number[] = []

// Score = height + 5 per alien kill
function refreshScore() {
    info.setScore(Math.floor(height / 10) + killBonus)
}

// ============================================================
// AUDIO
// ============================================================

let boingSound = music.createSoundEffect(
    WaveShape.Sine, 180, 700, 255, 0, 160,
    SoundExpressionEffect.None, InterpolationCurve.Linear
)

let epicTheme = music.stringPlayable(
    "C3 E3 G3 C4 G3 E3 C3 E3 A2 C3 E3 A3 E3 C3 A2 C3 F2 A2 C3 F3 C3 A2 F2 A2 G2 B2 D3 G3 D3 B2 G2 B2",
    120
)

function playBoing() {
    music.play(boingSound, music.PlaybackMode.InBackground)
}

function startMusic() {
    music.play(epicTheme, music.PlaybackMode.LoopingInBackground)
}

// ============================================================
// BACKGROUND
// ============================================================

function setupBackground() {
    scene.setBackgroundColor(15)
    for (let i = 0; i < 28; i++) {
        starX.push(Math.randomRange(0, 159))
        starY.push(Math.randomRange(0, 119))
        let pick = Math.randomRange(0, 2)
        starC.push(pick == 0 ? 1 : (pick == 1 ? 9 : 3))
    }
    // Stars drift slowly as you climb (parallax), drawn below every sprite
    scene.createRenderable(-100, function () {
        let shift = Math.floor(height * 0.2)
        for (let i = 0; i < starX.length; i++) {
            screen.setPixel(starX[i], (starY[i] + shift) % 120, starC[i])
        }
    })
    // HUD text in the reserved bottom strip
    game.onPaint(function () {
        screen.print("AMMO " + ammo, 2, 112, 5)
    })
}

// ============================================================
// BULLETS
// ============================================================

function createBulletPool() {
    for (let i = 0; i < MaxActiveBullets; i++) {
        let b = sprites.create(bulletImg, SpriteKind.Projectile)
        b.setPosition(-50, -50)
        b.vx = 0
        b.vy = 0
        bullets.push(b)
        bulletActive.push(false)
    }
}

function releaseBullet(i: number) {
    bulletActive[i] = false
    bullets[i].vx = 0
    bullets[i].vy = 0
    bullets[i].setPosition(-50, -50)
}

function fireBullet() {
    if (ammo <= 0) {
        return
    }
    for (let i = 0; i < bullets.length; i++) {
        if (!bulletActive[i]) {
            bulletActive[i] = true
            ammo -= 1
            bullets[i].setPosition(player.x + facing * 10, player.y)
            bullets[i].vx = facing * BulletSpeed
            bullets[i].vy = 0
            // music.play(music.playSoundEffect, music.PlaybackMode.InBackground)
            return
        }
    }
    // all 3 bullets already in flight: do nothing
}

function scrollBullets(dy: number) {
    for (let i = 0; i < bullets.length; i++) {
        if (bulletActive[i]) {
            bullets[i].y += dy
        }
    }
}

function recycleBullets() {
    for (let i = 0; i < bullets.length; i++) {
        if (bulletActive[i] && (bullets[i].x < -4 || bullets[i].x > 164)) {
            releaseBullet(i)
        }
    }
}

// ============================================================
// ALIENS
// ============================================================

function spawnAlienOn(p: Sprite) {
    let a = sprites.create(alienImg, SpriteKind.Enemy)
    a.setPosition(p.x, p.y - 10)
    aliens.push(a)
    alienHost.push(p)
    alienOff.push(0)
    alienDir.push(Math.randomRange(0, 1) == 0 ? 1 : -1)
}

function removeAlien(a: Sprite) {
    let idx = aliens.indexOf(a)
    if (idx >= 0) {
        aliens.splice(idx, 1)
        alienHost.splice(idx, 1)
        alienOff.splice(idx, 1)
        alienDir.splice(idx, 1)
    }
    a.destroy(effects.disintegrate, 200)
}

function updateAliens() {
    for (let i = 0; i < aliens.length; i++) {
        alienOff[i] += alienDir[i] * 0.4
        if (alienOff[i] > 8) {
            alienOff[i] = 8
            alienDir[i] = -1
        } else if (alienOff[i] < -8) {
            alienOff[i] = -8
            alienDir[i] = 1
        }
        aliens[i].x = alienHost[i].x + alienOff[i]
        aliens[i].bottom = alienHost[i].top + 1
    }
}

function cleanupAliens() {
    for (let i = aliens.length - 1; i >= 0; i--) {
        if (alienHost[i].y > 135) {
            let dead = aliens[i]
            aliens.splice(i, 1)
            alienHost.splice(i, 1)
            alienOff.splice(i, 1)
            alienDir.splice(i, 1)
            dead.destroy()
        }
    }
}

// ============================================================
// AMMO
// ============================================================

function spawnAmmoOn(p: Sprite) {
    let s = sprites.create(ammoImg, SpriteKind.Food)
    s.setPosition(p.x, p.y - 8)
    ammoSprites.push(s)
    ammoHost.push(p)
    ammoOff.push(Math.randomRange(-6, 6))
}

function removeAmmo(s: Sprite) {
    let idx = ammoSprites.indexOf(s)
    if (idx >= 0) {
        ammoSprites.splice(idx, 1)
        ammoHost.splice(idx, 1)
        ammoOff.splice(idx, 1)
    }
    s.destroy()
}

function updateAmmoPickups() {
    for (let i = 0; i < ammoSprites.length; i++) {
        ammoSprites[i].x = ammoHost[i].x + ammoOff[i]
        ammoSprites[i].bottom = ammoHost[i].top - 1
    }
}

function cleanupAmmo() {
    for (let i = ammoSprites.length - 1; i >= 0; i--) {
        if (ammoHost[i].y > 135) {
            let gone = ammoSprites[i]
            ammoSprites.splice(i, 1)
            ammoHost.splice(i, 1)
            ammoOff.splice(i, 1)
            gone.destroy()
        }
    }
}

// ============================================================
// PLANETS
// ============================================================

function createFloorPlanet() {
    // Starting planet at bottom center (stationary, safe)
    let floorPlanet = sprites.create(planetImg, SpriteKind.Planet)
    floorPlanet.setPosition(80, 108)
    floorPlanet.vx = 0
    planets.push(floorPlanet)
    topPlanetY = 108
}

function spawnPlanet(y: number) {
    let p = sprites.create(planetImg, SpriteKind.Planet)
    p.setPosition(Math.randomRange(16, 144), y)
    let speed = Math.randomRange(10, 25) + Math.min(25, Math.floor(height / 200) * 3)
    p.vx = Math.randomRange(0, 1) == 0 ? speed : -speed
    planets.push(p)
    topPlanetY = y
    planetsSpawned += 1

    // The first few planets are always safe
    if (planetsSpawned > 3) {
        // Alien chance ramps up with height but is capped so it stays fair
        let alienChance = Math.min(40, 8 + Math.floor(height / 150) * 2)
        let roll = Math.randomRange(0, 99)
        if (roll < alienChance) {
            spawnAlienOn(p)
        } else if (roll < alienChance + 25) {
            spawnAmmoOn(p)
        }
    }
}

// Gaps of 22..38 px stay inside the jump arc, so every planet is reachable
function fillPlanets() {
    while (topPlanetY > -12) {
        spawnPlanet(topPlanetY - Math.randomRange(22, 38))
    }
}

function bouncePlanets() {
    for (let i = 0; i < planets.length; i++) {
        let p = planets[i]
        if (p.x < 14) {
            p.x = 14
            p.vx = Math.abs(p.vx)
        } else if (p.x > 146) {
            p.x = 146
            p.vx = -Math.abs(p.vx)
        }
    }
}

function scrollPlanets(dy: number) {
    topPlanetY += dy
    for (let i = 0; i < planets.length; i++) {
        planets[i].y += dy
    }
}

function cleanupPlanets() {
    for (let i = planets.length - 1; i >= 0; i--) {
        if (planets[i].y > 135) {
            planets[i].destroy()
            planets.splice(i, 1)
        }
    }
}

// ============================================================
// PLAYER
// ============================================================

function createPlayer() {
    // Starts bottom center and jumps right away
    player = sprites.create(playerRightImg, SpriteKind.Player)
    player.setPosition(80, 96)
    player.ay = Gravity
    player.vy = -JumpSpeed
    controller.moveSprite(player, MoveSpeed, 0)
    prevBottom = player.bottom
}

// Facing direction follows the last left/right input
function updateFacing() {
    if (controller.left.isPressed()) {
        if (facing != -1) {
            facing = -1
            player.setImage(playerLeftImg)
        }
    } else if (controller.right.isPressed()) {
        if (facing != 1) {
            facing = 1
            player.setImage(playerRightImg)
        }
    }
}

function wrapPlayer() {
    if (player.x < -4) {
        player.x = 164
    } else if (player.x > 164) {
        player.x = -4
    }
}

// Only while falling, and only if we crossed a planet's top this frame
function handleLanding() {
    if (player.vy > 0) {
        for (let i = 0; i < planets.length; i++) {
            let p = planets[i]
            if (player.bottom >= p.top && prevBottom <= p.top + 4
                && player.right > p.left + 2 && player.left < p.right - 2) {
                player.bottom = p.top
                player.vy = -JumpSpeed
                playBoing()
                break
            }
        }
    }
}

// Keep the player at or below the scroll line; everything else moves down
function scrollCamera() {
    if (player.y < ScrollLine) {
        let dy = ScrollLine - player.y
        player.y = ScrollLine
        height += dy
        scrollPlanets(dy)
        scrollBullets(dy)
    }
}

function checkFell() {
    if (player.y > 128) {
        game.gameOver(false)
    }
}

// ============================================================
// MAIN
// ============================================================

function startGame() {
    setupBackground()
    createBulletPool()
    createFloorPlanet()
    createPlayer()
    fillPlanets()
    info.setScore(0)
    startMusic()
}

startGame()

// ---------- Controls ----------
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    fireBullet()
})
controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    fireBullet() // A also fires so either thumb works
})
// controller.up / controller.down: intentionally unused (horizontal movement only)
// controller.menu: intentionally left as the default system pause menu


// ---------- Overlaps ----------
sprites.onOverlap(SpriteKind.Player, SpriteKind.Enemy, function (sprite, otherSprite) {
    refreshScore()
    game.gameOver(false)
})

sprites.onOverlap(SpriteKind.Projectile, SpriteKind.Enemy, function (sprite, otherSprite) {
    let bi = bullets.indexOf(sprite)
    if (bi >= 0 && bulletActive[bi]) {
        releaseBullet(bi)
        removeAlien(otherSprite)
        killBonus += 5
        // music.play(music, music.PlaybackMode.InBackground)
    }
})

sprites.onOverlap(SpriteKind.Player, SpriteKind.Food, function (sprite, otherSprite) {
    ammo = Math.min(MaxAmmo, ammo + 1)
    removeAmmo(otherSprite)
    // music.play(music.baDing, music.PlaybackMode.InBackground)
})

// ---------- Main loop ----------
game.onUpdate(function () {
    updateFacing()
    wrapPlayer()
    bouncePlanets()
    handleLanding()
    scrollCamera()
    fillPlanets()
    updateAliens()
    updateAmmoPickups()
    cleanupAliens()
    cleanupAmmo()
    cleanupPlanets()
    recycleBullets()
    refreshScore()
    checkFell()
    prevBottom = player.bottom
})

// Verified against (from known Arcade reference docs; not re-fetched live in this session, so re-check if the editor flags anything):
// - arcade.makecode.com/reference/sprites: sprites.create, sprites.onOverlap, sprite.setPosition, sprite.vx/vy/ay, sprite.top/bottom/left/right, sprite.destroy(effect, ms), SpriteKind.create()
// - arcade.makecode.com/reference/controller: controller.moveSprite, controller.A/B.onEvent, controller.left/right.isPressed, controller.menu (left as default)
// - arcade.makecode.com/reference/game: game.onUpdate, game.onUpdateInterval, game.onPaint, game.gameOver
// - arcade.makecode.com/reference/scene: scene.setBackgroundColor, scene.createRenderable
// - arcade.makecode.com/reference/music: music.createSoundEffect, music.play + PlaybackMode, music.stringPlayable, music.pewPew/baDing/smallCrash
// - arcade.makecode.com/reference/info: info.setScore
// - arcade.makecode.com/reference/images: img`...`, image.clone(), image.flipX()
// - arcade.makecode.com/reference/effects: effects.disintegrate
// - Math.randomRange, Math.floor, Math.min, Math.abs; Array push/splice/indexOf (standard TypeScript)


