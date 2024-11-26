import Union from "./union.js";
import seedrandom from "seedrandom";

interface WallPosition {
    x: number;
    y: number;
    vertical: boolean;
}
export default class Maze {
    public width: number;
    public height: number;
    public weights: number[];
    public seed: number;
    public data: number[];

    private random: () => number;

    // private
    private wallqs: WallPosition[][] = [
        [], [], [],
        [], [], [],
        [], [], []
    ];

    private union: Union = new Union(0);

    constructor(
        seed: number,
        w = 27, h = 18,
        weights =
            [
                12, 10, 14,
                10, 10, 8,
                14, 8, 2
            ],
        data?: number[]
    ) {
        const size = w * h * 2;
        this.width = w;
        this.height = h;
        this.seed = seed;
        this.random = seedrandom(String(seed));

        if (data && data.length === size) this.data = data;
        else this.data = new Array(size);

        this.weights = weights;

        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] = Math.pow(2.0, this.weights[i] * 0.5);
        }
    }

    private randomInsert<T>(arr: T[], item: T): void {
        arr.length++;
        let to_insert = item, replaces;
        let prev_index = 0, target_index = prev_index + Math.floor(this.random() * (arr.length - prev_index));
        do {
            replaces = arr[target_index];
            arr[target_index] = to_insert;
            to_insert = replaces;
            prev_index = target_index;
            target_index = prev_index + ((arr.length - prev_index) >>> 1);
        } while (prev_index !== arr.length - 1);
    }

    private pos2Index(wall_pos: WallPosition): number {
        const { x, y, vertical } = wall_pos;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return (y * this.width + x) * 2 + (vertical ? 0 : 1);
        }
        return -1;
    }

    private setWall(wall_pos: WallPosition | number, wall: number) {
        let index;
        if (typeof wall_pos === "number") index = wall_pos;
        else {
            index = this.pos2Index(wall_pos);
            if (index === -1) return;
        }
        this.data[index] = wall;
    }

    public getWall(wall_pos: WallPosition): number {
        const index = this.pos2Index(wall_pos);
        if (index === -1) return -1;
        return this.data[index];
    }

    private getNeighbours(wall_pos: WallPosition): WallPosition[] {
        const { x, y, vertical } = wall_pos;
        return vertical ? [
            { x, y: y - 1, vertical: !vertical },
            { x, y: y - 1, vertical },
            { x: x + 1, y: y - 1, vertical: !vertical },
            { x, y, vertical: !vertical },
            { x, y: y + 1, vertical },
            { x: x + 1, y, vertical: !vertical }
        ] : [
            { x: x - 1, y, vertical: !vertical },
            { x: x - 1, y, vertical },
            { x: x - 1, y: y + 1, vertical: !vertical },
            { x, y, vertical: !vertical },
            { x: x + 1, y, vertical },
            { x, y: y + 1, vertical: !vertical }
        ];
    }

    /**
     *  1
     * 0 2
     *  |
     * 3 5
     *  4
     *
     *  0  3
     * 1 -- 4
     *  2  5
     * 
     */
    private getWallType(w: WallPosition) {
        const wall_neighbours = this.getNeighbours(w);
        return this.getWallEndType(...wall_neighbours);
    }

    private getWallEndType(...w: WallPosition[]) {
        const [c0, c1, c2, c3, c4, c5] = w.map(wall => this.getWall(wall) === 0);
        const type1 = (c0 === c2) ? (c0 ? 2 : 0) : (c1 ? 2 : 1);
        const type2 = (c3 === c5) ? (c3 ? 2 : 0) : (c4 ? 2 : 1);
        return type1 * 3 + type2;
    }

    private prepareQueue() {
        this.random = seedrandom(String(this.seed));
        this.data.fill(1);
        const invalid_walls = new Array(this.width + this.height);
        let array = new Array(this.data.length);
        for (let i = 0; i < array.length; i++) {
            let ci = i;
            let vertical = ci % 2 === 0;
            if (!vertical) ci--;
            ci /= 2;
            let x = ci % this.width;
            let y = Math.floor(ci / this.width);
            if ((vertical && x === this.width - 1) || (!vertical && y === this.height - 1)) {
                invalid_walls.push(i);
                this.data[i] = -1;
            }
            array[i] = { x, y, vertical };
        }
         let qi = array.length - 1,
            wi = invalid_walls.length - 1;
        while (--wi > 0 && --qi > 0) {
            if (qi === invalid_walls[wi]) continue;
            [array[invalid_walls[wi]], array[qi]] = [array[invalid_walls[wi]], array[qi]];
        }
        this.wallqs[0].length = qi;

        let currentIndex = array.length;

        while (currentIndex !== 0) {
            let randomIndex = Math.floor(this.random() * currentIndex);
            currentIndex--;

            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }

        this.wallqs[0] = array;
    }

    public generate() {
        let perf_time = performance.now();
        this.prepareQueue();

        // reset union
        this.union = new Union(this.data.length / 2);

        let perf = 0;
        let w, chunks = new Array(9);
        while (true) {
            if (perf % 1000 === 0) {
                console.log("updateWall",
                    this.wallqs[0].length, this.wallqs[1].length, this.wallqs[2].length,
                    this.wallqs[3].length, this.wallqs[4].length, this.wallqs[5].length,
                    this.wallqs[6].length, this.wallqs[7].length, this.wallqs[8].length
                )
            }
            perf++;
            w = 0;
            // select a queue randomly, weighted
            for (let i = 0; i < 9; i++) {
                chunks[i] = this.wallqs[i].length * this.weights[i];
                w += chunks[i];
            }

            if (w === 0) break;

            w *= this.random();
            let i = 0;
            for (i = 0; i < 8; i++) {
                const chunk = chunks[i]
                if (w < chunk) break;
                w -= chunk;
            }

            // pop a wall from the queue and try to remove it
            const wall_pos = this.wallqs[i].pop()!;
            const wall_index = this.pos2Index(wall_pos);
            const wall = this.getWall(wall_pos);
            const wall_type = this.getWallType(wall_pos);

            // try to remove wall
            if (wall === 1 && wall_type === i) {
                const c1 = wall_pos.y * this.width + wall_pos.x;
                const c2 = c1 + (wall_pos.vertical ? 1 : this.width);

                if (!this.union.union(c1, c2)) continue;

                const neighbours = this.getNeighbours(wall_pos);
                for (let i = 0; i < 6; i++) {
                    this.setWall(wall_index, 1);
                    const n_type = this.getWallType(neighbours[i]);
                    this.setWall(wall_index, 0);
                    const neighbour = this.getWall(neighbours[i]);
                    if (neighbour === -1) continue;
                    const typ = this.getWallType(neighbours[i]);
                    if (typ <= n_type) continue;
                    this.randomInsert(this.wallqs[typ], neighbours[i]);
                }
            }
        }
        console.log(perf, Math.floor(performance.now() - perf_time));
    }

    public solve(greedy_depth_map: boolean = false, start = { x: this.width - 1, y: 0 }, end = { x: 0, y: this.height - 1 }): { depth_map: number[][], depth: number, path: number[][] } | undefined {
        const walldiff = [1 - this.width * 2, 0, -2, 1]; // (0, -1)h, (0, 0)v, (-1, 0)v, (1, 0)h
        const neighbour_pos = [[0, -1], [1, 0], [-1, 0], [0, 1]];

        const depth_map = new Array(this.height);
        
        for (let y = 0; y < this.height; y++) {
            depth_map[y] = new Array(this.width).fill(0);
        }
        let level = [[start.x, start.y]];
        depth_map[start.y][start.x] = 1;

        let depth = 1, treeCount = 1;
        let brk = false;

        while (!brk) {
            depth++;
            const oldLevel = level;
            level = [];

            for (let i = 0; i < oldLevel.length; ++i) {
                const [ cx, cy ] = oldLevel[i];
                const wallr = (cy * this.width + cx) * 2;
                for (let n = 0; n < 4; n++) {
                    const tx = cx + neighbour_pos[n][0];
                    const ty = cy + neighbour_pos[n][1];
                    if (
                        tx >= 0 && tx < this.width && 
                        ty >= 0 && ty < this.height && 
                        depth_map[ty][tx] === 0 &&
                        this.data[wallr + walldiff[n]] === 0
                    ) {
                        treeCount++;
                        level.push([tx, ty]);
                        depth_map[ty][tx] = depth;
                        // TODO: think of the logic. idk wtf smh
                        if (!greedy_depth_map && tx === end.x && ty === end.y) {
                            brk = true;
                            break;
                        } 
                    }
                }
                if (brk) break;
            }

            const fullTree = treeCount === this.data.length / 2;
            if (brk || fullTree || level.length === 0) break;
        }


        brk = false;
        let path = new Array(depth);
        let { x, y }  = end;
        for (let i = depth - 1; i >= 0; --i) {
            path[i] = [x, y];
            const d = depth_map[y][x];
            const wallr = (y * this.width + x) * 2;
            for (let n = 0; n < 4; n++) {
                const tx = x + neighbour_pos[n][0];
                const ty = y + neighbour_pos[n][1];
                if (
                    tx >= 0 && tx < this.width && 
                    ty >= 0 && ty < this.height && 
                    depth_map[ty][tx] === d - 1 &&
                    this.data[wallr + walldiff[n]] === 0
                ) {
                    x = tx;
                    y = ty;
                    break;
                }
                if (n === 3) brk = true;
            }
            if (brk) break;
        }


        return { depth_map, depth, path };
    }

    public toString() {
        return JSON.stringify({
            width: this.width,
            height: this.height,
            seed: this.seed,
            weights: this.weights
        })
    }

    public static fromString(str: string) {
        const o = JSON.parse(str);
        if (!(
            o.width && o.height && o.data && o.seed &&
            typeof o.width === "number" &&
            typeof o.height === "number"
        )) {
            throw new Error("corrupt serialization");
        }

        return new Maze(o.seed, o.width, o.height, o.weights);
    }
}

