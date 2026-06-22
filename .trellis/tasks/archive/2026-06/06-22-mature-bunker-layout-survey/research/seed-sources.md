# Mature Bunker / Road-Lattice Seed Sources

Use these as research starting points. Record license posture before adopting any detailed implementation idea.

## Evidence already identified

- Overmind bunker wiki/blog: bunker anchor, compact core, quadrant attendants, traffic-management requirement, only 51/60 extensions in main bunker to preserve exits.
  - https://github.com/bencbartlett/Overmind/wiki/Bunkers
  - https://bencbartlett.github.io/blog/screeps-5-evolution
- Adam Laycock bunker migration notes: existing-room migration is slow; storage relocation and build-before-destroy ordering matter.
  - https://alaycock.co.uk/2017/10/screeps-part-20-bunkers
- Harabi automated base planning: distance transform, core stamp, floodfill accessibility, roads/min-cut, towers, remaining structures.
  - https://sy-harabi.github.io/Automating-base-planning-in-screeps
- Screeps forum blueprint feedback: diagonal openness, tower-center tradeoffs, refilling-extension traffic, 13x13 vs 11x11 bunker footprint.
  - http://screeps.com/forum/topic/2436/room-blueprint-feedback
- Screeps workflow advice: extension checker/chess pattern is acceptable early automation, but mature designs use stronger blueprints/stamps.
  - http://screeps.com/forum/topic/2556/workflow-tips-and-prioritization-for-new-players

## Local interpretation

The local target should be a road-lattice / extension-garden planner that can later evolve toward a bunker stamp. Do not transplant broad Overmind-style architecture or source code.
