import type { ComponentType } from 'react'
import { BalloonPopGame } from './balloon-pop/BalloonPopGame'
import { CardFlipGame } from './card-flip/CardFlipGame'
import { F1LightsOutGame } from './f1-lights-out/F1LightsOutGame'
import { LaneRunnerGame } from './lane-runner/LaneRunnerGame'
import { MazeBallGame } from './maze-ball/MazeBallGame'
import { SimonSaysGame } from './simon-says/SimonSaysGame'
import { StackBlocksGame } from './stack-blocks/StackBlocksGame'
import { WhackAMoleGame } from './whack-a-mole/WhackAMoleGame'

// Games not listed here fall back to the "coming soon" placeholder in GamePage.
export const gameComponents: Record<string, ComponentType> = {
  'f1-lights-out': F1LightsOutGame,
  'simon-says-colors': SimonSaysGame,
  'card-flip-matching': CardFlipGame,
  'whack-a-mole': WhackAMoleGame,
  'balloon-pop-precision': BalloonPopGame,
  'stack-the-blocks': StackBlocksGame,
  'maze-ball-drag': MazeBallGame,
  'lane-swipe-runner': LaneRunnerGame,
}
