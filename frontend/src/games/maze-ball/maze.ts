// A fresh random maze is generated for every round. The checks below keep it
// solvable: the exit is always reachable without touching a hole, and every
// coin can be reached too. Pass a seed to get the same maze again (e.g. to test).

export type Tile = 'wall' | 'floor' | 'trap'

export interface Maze {
  size: number
  tiles: Tile[][] // tiles[row][col]
  start: { col: number; row: number }
  exit: { col: number; row: number }
  coins: { col: number; row: number }[]
}

const CELLS = 10 // corridor cells per side; the tile grid is 2 * CELLS + 1
const EXTRA_OPENINGS = 12 // walls knocked out so the maze has loops, i.e. several routes to the exit
const TRAPS_ON_ROUTE = 4 // holes placed on the shortest route (each with a way around)
const COIN_COUNT = 14
const COIN_SPACING = 4 // minimum distance between two coins, in tiles
const COIN_ZONES = 4 // grid of zones (per side) coins are drawn from round-robin, for spread
const DECOY_TRAPS = 5 // holes placed elsewhere, to make wandering risky
const TRAP_SPACING = 5 // minimum distance between two holes, in tiles

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

// Shortest route between two tiles avoiding traps, or null if there is none.
function findRoute(tiles: Tile[][], from: [number, number], to: [number, number]) {
  const size = tiles.length
  const previous = new Map<number, number>()
  const key = (col: number, row: number) => row * size + col
  const queue: [number, number][] = [from]
  previous.set(key(...from), -1)
  while (queue.length > 0) {
    const [col, row] = queue.shift()!
    if (col === to[0] && row === to[1]) {
      const route: [number, number][] = []
      for (let k = key(col, row); k !== -1; k = previous.get(k)!) {
        route.push([k % size, Math.floor(k / size)])
      }
      return route.reverse()
    }
    for (const [dc, dr] of DIRECTIONS) {
      const nc = col + dc
      const nr = row + dr
      if (tiles[nr]?.[nc] !== 'floor' || previous.has(key(nc, nr))) continue
      previous.set(key(nc, nr), key(col, row))
      queue.push([nc, nr])
    }
  }
  return null
}

// Number of steps from `from` to every reachable floor tile (traps block the
// way, and so does `avoid` if given — used to keep coins reachable without
// ever setting foot on the exit tile, which would end the round early).
function distancesFrom(tiles: Tile[][], from: [number, number], avoid?: [number, number]) {
  const size = tiles.length
  const distance = new Map<number, number>([[from[1] * size + from[0], 0]])
  const queue: [number, number][] = [from]
  while (queue.length > 0) {
    const [col, row] = queue.shift()!
    for (const [dc, dr] of DIRECTIONS) {
      const nc = col + dc
      const nr = row + dr
      if (avoid && nc === avoid[0] && nr === avoid[1]) continue
      const k = nr * size + nc
      if (tiles[nr]?.[nc] !== 'floor' || distance.has(k)) continue
      distance.set(k, distance.get(row * size + col)! + 1)
      queue.push([nc, nr])
    }
  }
  return distance
}

function tooCloseToTrap(tiles: Tile[][], col: number, row: number) {
  return tiles.some((tileRow, r) =>
    tileRow.some((tile, c) => tile === 'trap' && Math.abs(c - col) + Math.abs(r - row) < TRAP_SPACING),
  )
}

export function generateMaze(seed = Math.floor(Math.random() * 2 ** 32)): Maze {
  const random = mulberry32(seed)
  const size = CELLS * 2 + 1
  const tiles: Tile[][] = Array.from({ length: size }, () => Array<Tile>(size).fill('wall'))

  // Recursive backtracker: carve a perfect maze between the cell centres.
  const visited = new Set<number>()
  const stack: [number, number][] = [[0, 0]]
  visited.add(0)
  tiles[1][1] = 'floor'
  while (stack.length > 0) {
    const [cc, cr] = stack[stack.length - 1]
    const options = DIRECTIONS.map(([dc, dr]) => [cc + dc, cr + dr] as [number, number]).filter(
      ([nc, nr]) => nc >= 0 && nr >= 0 && nc < CELLS && nr < CELLS && !visited.has(nr * CELLS + nc),
    )
    if (options.length === 0) {
      stack.pop()
      continue
    }
    const [nc, nr] = options[Math.floor(random() * options.length)]
    tiles[cr + nr + 1][cc + nc + 1] = 'floor' // the wall between the two cells
    tiles[nr * 2 + 1][nc * 2 + 1] = 'floor'
    visited.add(nr * CELLS + nc)
    stack.push([nc, nr])
  }

  // Knock out a few inner walls between neighbouring cells to create loops.
  for (let opened = 0, attempts = 0; opened < EXTRA_OPENINGS && attempts < 500; attempts++) {
    const col = 1 + Math.floor(random() * (size - 2))
    const row = 1 + Math.floor(random() * (size - 2))
    // Only walls that sit between two corridor cells (one coordinate odd, one even).
    if ((col % 2) + (row % 2) !== 1 || tiles[row][col] !== 'wall') continue
    tiles[row][col] = 'floor'
    opened++
  }

  const start = { col: 1, row: 1 }
  const exit = { col: size - 2, row: size - 2 }

  // Holes on the shortest route, each only kept if the exit stays reachable.
  const route = findRoute(tiles, [start.col, start.row], [exit.col, exit.row])!
  const candidates = route.slice(4, route.length - 3)
  let onRoute = 0
  while (onRoute < TRAPS_ON_ROUTE && candidates.length > 0) {
    const [col, row] = candidates.splice(Math.floor(random() * candidates.length), 1)[0]
    if (tooCloseToTrap(tiles, col, row)) continue
    tiles[row][col] = 'trap'
    if (findRoute(tiles, [start.col, start.row], [exit.col, exit.row])) onRoute++
    else tiles[row][col] = 'floor'
  }

  // Decoy holes anywhere else, kept away from the start and the exit.
  for (let placed = 0, attempts = 0; placed < DECOY_TRAPS && attempts < 500; attempts++) {
    const col = 1 + Math.floor(random() * (size - 2))
    const row = 1 + Math.floor(random() * (size - 2))
    const nearStart = Math.abs(col - start.col) + Math.abs(row - start.row) < 5
    const nearExit = Math.abs(col - exit.col) + Math.abs(row - exit.row) < 3
    if (tiles[row][col] !== 'floor' || nearStart || nearExit || tooCloseToTrap(tiles, col, row)) continue
    tiles[row][col] = 'trap'
    if (findRoute(tiles, [start.col, start.row], [exit.col, exit.row])) placed++
    else tiles[row][col] = 'floor'
  }

  // Coins go in dead ends and far corners, off the fastest route, so grabbing
  // them is a detour worth weighing against the clock. The exit tile is
  // treated as blocked here so every candidate is reachable without ever
  // setting foot on it — stepping on the exit ends the round immediately.
  const reachable = distancesFrom(tiles, [start.col, start.row], [exit.col, exit.row])
  const onShortestRoute = new Set(
    findRoute(tiles, [start.col, start.row], [exit.col, exit.row])!.map(([c, r]) => r * size + c),
  )
  const spots: { col: number; row: number; value: number }[] = []
  reachable.forEach((distance, k) => {
    const col = k % size
    const row = Math.floor(k / size)
    if (distance < 4) return
    const openSides = DIRECTIONS.filter(([dc, dr]) => tiles[row + dr][col + dc] !== 'wall').length
    // Dead ends first, then whatever is far from the start; the fastest route is a last resort.
    const value = (openSides === 1 ? 100 : 0) + distance - (onShortestRoute.has(k) ? 40 : 0) + random() * 6
    spots.push({ col, row, value })
  })

  // Bucket candidates into a grid of zones and take turns drawing from each
  // zone (best value first) so coins land across the whole map instead of
  // clustering wherever the value score peaks.
  const zoneSize = size / COIN_ZONES
  const zoneKey = (col: number, row: number) =>
    Math.min(COIN_ZONES - 1, Math.floor(row / zoneSize)) * COIN_ZONES +
    Math.min(COIN_ZONES - 1, Math.floor(col / zoneSize))
  const zones = new Map<number, { col: number; row: number; value: number }[]>()
  for (const spot of spots) {
    const z = zoneKey(spot.col, spot.row)
    const list = zones.get(z)
    if (list) list.push(spot)
    else zones.set(z, [spot])
  }
  zones.forEach((list) => {
    list.sort((a, b) => b.value - a.value)
  })
  const zoneOrder = [...zones.keys()]
  for (let i = zoneOrder.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[zoneOrder[i], zoneOrder[j]] = [zoneOrder[j], zoneOrder[i]]
  }

  const coins: { col: number; row: number }[] = []
  for (let hasCandidates = true; coins.length < COIN_COUNT && hasCandidates; ) {
    hasCandidates = false
    for (const z of zoneOrder) {
      if (coins.length >= COIN_COUNT) break
      const list = zones.get(z)
      if (!list) continue
      while (list.length > 0) {
        const spot = list.shift()
        if (!spot) break
        const tooClose = coins.some(
          (coin) => Math.abs(coin.col - spot.col) + Math.abs(coin.row - spot.row) < COIN_SPACING,
        )
        if (!tooClose) {
          coins.push({ col: spot.col, row: spot.row })
          hasCandidates = true
          break
        }
      }
    }
  }

  return { size, tiles, start, exit, coins }
}
