import Maze from './maze';
import Solver from './solver';
import './style.css'


let maze: Maze, solver: Solver;

//slider values

const canvas = <any>document.getElementById("canvas")!;
const ctx = canvas.getContext("2d");

const resolution = 6;
let wall_width: number;       


/*
* Fill a wall or cell in the canvas
*/
function fill(x: number, y: number, wx: number, wy: number, clr: any) {
    wx += 1; wy += 1;

    x += (wx >> 1); 
    wx &= 1;

    y += (wy >> 1); 
    wy &= 1;

    let ex, ey;
    
    if (wx) {
        ex = Math.floor((x + 1) * (canvas.width - wall_width) / maze.width);
        x = Math.floor(x * (canvas.width - wall_width) / maze.width);
        x += wall_width;
    } else {
        x = Math.floor(x * (canvas.width - wall_width) / maze.width);
        ex = x + wall_width;
    }

    if (wy) {
        ey = Math.floor((y + 1) * (canvas.height - wall_width) / maze.height);
        y = Math.floor(y * (canvas.height - wall_width) / maze.height);
        y += wall_width;
    } else {
        y = Math.floor(y * (canvas.height - wall_width) / maze.height);
        ey = y + wall_width;
    }

    ctx.fillStyle = clr;
    ctx.fillRect(x, y, ex - x, ey - y);
}

/*
* Set up and start a new maze generation
*/
function init() {
    resetSolution();
    if (!maze) maze = new Maze();
    maze.generate();
    afterMazeGenerate();
};

/*
* Do maze generation some work.
*/
function afterMazeGenerate() {
    // set wall width
    wall_width = Math.floor(100 / (resolution * 3));

    // canvas init
    canvas.width = maze.width * 100 / resolution;
    canvas.height = maze.height * 100 / resolution;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw
    fill(maze.width - 1, 0, 0, -1, "white");
    fill(0, maze.height - 1, 0, 1, "white");
    for (let y = 0; y < maze.height; ++y) {
        for (let x = 0; x < maze.width; ++x) {
            // walls
            let wall_index = (y * maze.width + x) * 2;
            let wall = maze.data[wall_index]
            if (wall && wall.clr) fill(x, y, 1, 0, "white");
            wall = maze.data[wall_index + 1]
            if (wall && wall.clr) fill(x, y, 0, 1, "white");

            // cells
            fill(x, y, 0, 0, "white");
        }
    }
}

/**
 * reset solution
 */
function resetSolution() {
    if (!maze) return;
    for (let y = 0; y < maze.height; ++y) {
        for (let x = 0; x < maze.width; ++x) {
            fill(x, y, 0, 0, "white");
        }
    }
}

/*
* Set up and start a new maze solution
*/
function initSolution(start = { x: maze.width - 1, y: 0 }) {
    resetSolution();

    if (!solver) solver = new Solver(maze);

    const depthMap = solver.generateDepthMap();
    
    afterSolutionGenerate(depthMap);
};

function afterSolutionGenerate(solution: { state: number[][], depth:number } | undefined, end = { x: 0, y: maze.height - 1 }) {
  if (!solution) return;
    const { state, depth } = solution;
    const neighbour_pos = [[0, -1], [1, 0], [-1, 0], [0, 1]];
    const walldiff = [1 - maze.width * 2, 0, -2, 1]; // (0, -1)h, (0, 0)v, (-1, 0)v, (1, 0)h

    for (let y = 0; y < maze.height; y++) {
        for (let x = 0; x < maze.width; x++) {
            fill(x, y, 0, 0, "hsl(" + (360 * state[y][x] / depth) + "deg, 80%, 70%)");
        }
    }

    //draw solution
    let x = end.x;
    let y = end.y;
    while (true) {
        fill(x, y, 0, 0, "#000");
        const d = state[y][x];
        const wallr = (y * maze.width + x) * 2;
        let brk = false;
        for (let n = 0; n < 4; n++) {
            const tx = x + neighbour_pos[n][0];
            const ty = y + neighbour_pos[n][1];
            if (
                tx >= 0 && tx < maze.width && 
                ty >= 0 && ty < maze.height && 
                state[ty][tx] === d - 1 &&
                maze.data[wallr + walldiff[n]]!.clr) {
                x = tx;
                y = ty;
                break;
            }
            if (n === 3) brk = true;
        }
        if (brk) break;
    }
}

init();

(<any>document.querySelector("#new-maze")).onclick = init;
(<any>document.querySelector("#new-sol")).onclick = initSolution;
(<any>document.querySelector("#dest-sol")).onclick = resetSolution;