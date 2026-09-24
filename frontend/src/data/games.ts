import type { Game } from '../types/game'

// Optional `image` / `video` paths (e.g. '/games/f1-lights-out.jpg') replace the
// placeholders on the menu card and the game's detail page.
// Titles and descriptions live in the i18n translation files, keyed by id
// (see src/i18n/locales/*.json under "games.<id>.title" / "games.<id>.description").
export const games: Game[] = [
  {
    id: 'f1-lights-out',
    sortOrder: 'asc',
    image: '/games/f1-lights-out.png',
    video: '/games/f1-lights-out.mp4',
  },
  {
    id: 'simon-says-colors',
    sortOrder: 'desc',
    image: '/games/simon-says-colors.png',
    video: '/games/simon-says-colors.mp4',
  },
  {
    id: 'card-flip-matching',
    sortOrder: 'desc',
    image: '/games/card-flip-matching.png',
    video: '/games/card-flip-matching.mp4',
  },
  {
    id: 'whack-a-mole',
    sortOrder: 'desc',
    image: '/games/whack-a-mole.png',
    video: '/games/whack-a-mole.mp4',
  },
  {
    id: 'balloon-pop-precision',
    sortOrder: 'desc',
    image: '/games/balloon-pop-precision.png',
    video: '/games/balloon-pop-precision.mp4',
  },
  {
    id: 'stack-the-blocks',
    sortOrder: 'desc',
    image: '/games/stack-the-blocks.png',
    video: '/games/stack-the-blocks.mp4',
  },
  {
    id: 'maze-ball-drag',
    sortOrder: 'desc',
    image: '/games/maze-ball-drag.png',
    video: '/games/maze-ball-drag.mp4',
  },
  {
    id: 'lane-swipe-runner',
    sortOrder: 'desc',
    image: '/games/lane-swipe-runner.png',
    video: '/games/lane-swipe-runner.mp4',
  },
  { id: 'bomb-defusal', sortOrder: 'desc', wip: true },
]

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id)
}
