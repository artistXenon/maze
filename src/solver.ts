import Maze from "./maze.js";

export default class Solver {
    private maze: Maze;
    constructor(maze: Maze) {
        this.maze = maze;
    }

    generateDepthMap(start = { x: this.maze.width - 1, y: 0 }): { state: number[][], depth: number } | undefined {
        if (!this.maze.data) return;
        const walldiff = [1 - this.maze.width * 2, 0, -2, 1]; // (0, -1)h, (0, 0)v, (-1, 0)v, (1, 0)h
        const neighbour_pos = [[0, -1], [1, 0], [-1, 0], [0, 1]];

        const solution_state = new Array(this.maze.height);
        
        for (let y = 0; y < this.maze.height; y++) {
            solution_state[y] = new Array(this.maze.width).fill(0);
        }
        let level = [[start.x, start.y]];
        solution_state[start.y][start.x] = 1;

        let depth = 1;
        let treeCount = 1;

        while (true) {
            depth++;
            const oldLevel = level;
            level = [];

            for (let i = 0; i < oldLevel.length; ++i) {
                const pos = oldLevel[i];
                const cx = pos[0];
                const cy = pos[1];
                const wallr = (cy * this.maze.width + cx) * 2;
                for (let n = 0; n < 4; n++) {
                    const tx = cx + neighbour_pos[n][0];
                    const ty = cy + neighbour_pos[n][1];
                    if (
                        tx >= 0 && tx < this.maze.width && 
                        ty >= 0 && ty < this.maze.height && 
                        solution_state[ty][tx] === 0 &&
                        this.maze.data[wallr + walldiff[n]] === 0
                    ) {
                        treeCount++;
                        level.push([tx, ty]);
                        solution_state[ty][tx] = depth;
                    }
                }
            }

            const fullTree = treeCount === this.maze.data.length / 2;
            if (fullTree || level.length === 0) break;
        }
        return { state: solution_state, depth };
    }
}