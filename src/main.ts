import Maze from './maze';
import './style.css'


let maze: Maze;

//slider values

const canvas = <any>document.getElementById("canvas")!;
const ctx = canvas.getContext("2d");

let wall_width: number;       
let maze_width: number;
let maze_height: number;


/*
* Fill a wall or cell in the canvas
*/
function fillWall(x: number, y: number, wx: number, wy: number, clr: any) {
  wx += 1; wy += 1;

  x += (wx >> 1); 
  wx &= 1;

  y += (wy >> 1); 
  wy &= 1;

  let ex, ey;
  
  if (wx) {
    ex = Math.floor((x + 1) * (maze_width - wall_width) / maze.width);
    x = Math.floor(x * (maze_width - wall_width) / maze.width);
    x += wall_width;
  } 
  else {
    x = Math.floor(x * (maze_width - wall_width) / maze.width);
    ex = x + wall_width;
  } 

  if (wy) {
    ey = Math.floor((y + 1) * (maze_height - wall_width) / maze.height);
    y = Math.floor(y * (maze_height - wall_width) / maze.height);
    y += wall_width;
  } 
  else {
    y = Math.floor(y * (maze_height - wall_width) / maze.height);
    ey = y + wall_width;
  } 

  ctx.fillStyle = clr;
  ctx.fillRect(x, y, ex - x, ey - y);
}

function fillCell(x: number, y: number, clr: any) {
  let ex, ey;

  ex = Math.floor((x + 1) * (maze_width - wall_width) / maze.width);
  x = Math.floor(x * (maze_width - wall_width) / maze.width) + wall_width;

  ey = Math.floor((y + 1) * (maze_height - wall_width) / maze.height);
  y = Math.floor(y * (maze_height - wall_width) / maze.height) + wall_width;

  ctx.fillStyle = clr;
  ctx.fillRect(x, y, ex - x, ey - y);
}

/*
* Set up and start a new maze generation
*/
function init() {
  resetSolution();
  maze = new Maze(Math.random() * 65535, 100, 60);
  //if (!maze) maze = new Maze(960, 540);
  maze.generate();
  afterMazeGenerate();
  (<any> window).maze = maze;
};

/*
* Do maze generation some work.
*/
function afterMazeGenerate() {

  const resolution = Math.max(maze.width / canvas.width, maze.height / canvas.height);

  maze_width = Math.floor(maze.width / resolution);
  maze_height = Math.floor(maze.height / resolution);

  wall_width = Math.floor(1 / (resolution * 3));

  // canvas init
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, maze_width, maze_height);

  // draw
  fillWall(maze.width - 1, 0, 0, -1, "white");
  fillWall(0, maze.height - 1, 0, 1, "white");
  for (let y = 0; y < maze.height; ++y) {
    for (let x = 0; x < maze.width; ++x) {
      // walls
      let wall_index = (y * maze.width + x) * 2;
      let wall = maze.data[wall_index]
      if (wall === 0) fillWall(x, y, 1, 0, "white");
      wall = maze.data[wall_index + 1]
      if (wall === 0) fillWall(x, y, 0, 1, "white");
      // cells
      fillCell(x, y, "white");
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
      fillCell(x, y, "white");
    }
  }
}

/*
* Set up and start a new maze solution
*/
function initSolution() {
  resetSolution();


  const depthMap = maze.solve();
  if (!depthMap) return;
  afterSolutionGenerate(depthMap);
}

function afterSolutionGenerate(solution: { depth_map: number[][], depth:number, path: number[][] }) {
  console.log(solution);
  const { depth_map, depth, path } = solution;

  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (depth_map[y][x] === 0) continue;
      fillCell(x, y, "hsl(" + (360 * depth_map[y][x] / depth) + "deg, 80%, 70%)");
    }
  }

  for (let i = path.length - 1; i > 0 ; --i) {
    if (!path[i]) continue;
    fillCell(path[i][0], path[i][1], "#000");
  }
}

// init();

(<any>document.querySelector("#new-maze")).onclick = init;
(<any>document.querySelector("#new-sol")).onclick = initSolution;
(<any>document.querySelector("#dest-sol")).onclick = resetSolution;
(<any> window).Maze = Maze;
