import { games } from '../data/games'
import { GameCard } from './GameCard'

export function GameGrid() {
  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-6">
      {games.map((game, index) => (
        <GameCard key={game.id} game={game} index={index} />
      ))}
    </div>
  )
}
