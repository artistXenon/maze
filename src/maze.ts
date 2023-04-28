import Union from "./union.js"

interface WallPosition {
    x: number;
    y: number;
    vertical: boolean;
}

export default class Maze {
    public width: number; 
    public height: number;
    public weights: number[];
    public data: number[];

    // private
    private wallqs: WallPosition[][] = [
        [], [], [],
        [], [], [],
        [], [], []
    ];

    private union: Union = new Union(0);

    constructor(
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

        if (data && data.length === size) this.data = data;
        else this.data = new Array(size);

        this.weights = weights;

        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] = Math.pow(2.0, this.weights[i] * 0.5);
        }
    }

    private setWall(wall_pos: WallPosition, wall: number) {
        const { x, y, vertical } = wall_pos;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.data[(y * this.width + x) * 2 + (vertical ? 0 : 1)] = wall;
        }
    }

    public getWall(wall_pos: WallPosition): number {
        const { x, y, vertical } = wall_pos;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.data[(y * this.width + x) * 2 + (vertical ? 0 : 1)];
        }
        return -1;
    }

    private getNeighbours(wall_pos: WallPosition): WallPosition[] {
        const { x, y, vertical } = wall_pos;
        return vertical ? [
            { x, y: y - 1, vertical: false },
            { x, y: y - 1, vertical: true },
            { x: x + 1, y: y - 1, vertical: false },
            { x, y, vertical: false },
            { x, y: y + 1, vertical: true },
            { x: x + 1, y, vertical: false }
        ] : [
            { x: x - 1, y, vertical: true },
            { x: x - 1, y, vertical: false },
            { x: x - 1, y: y + 1, vertical: true },
            { x, y, vertical: true },
            { x: x + 1, y, vertical: false },
            { x, y: y + 1, vertical: true }
        ]
    }

    /**
     *  0  3
     * 1 -- 4
     *  2  5
     * 
     *  1
     * 0 2
     *  |
     * 3 5
     *  4
     */
    private getWallType(w: WallPosition) {
        const wall_neighbours = this.getNeighbours(w);
        const t1 = this.getWallEndType(wall_neighbours[0], wall_neighbours[1], wall_neighbours[2]);
        const t2 = this.getWallEndType(wall_neighbours[3], wall_neighbours[4], wall_neighbours[5]);
        return t1 * 3 + t2;
    }

    private getWallEndType(...w: WallPosition[]) {
        const c = w.map(wall => this.getWall(wall) === 0);
        return c[0] === c[2] ? 
            (c[0] ? 2 : 0) : 
            (c[1] ? 2 : 1);
    }

    public generate() {
        this.wallqs = [
            [], [], [],
            [], [], [],
            [], [], []
        ];

        let vwall, hwall;
        for (let y = 0; y < this.height; ++y) {
            for(let x = 0; x < this.width; ++x) {
                const base_index = (y * this.width + x) * 2;
                vwall = -1
                hwall = -1
                if (x < this.width - 1) {
                    vwall = 1;
                    randomInsert(this.wallqs[0], { x, y, vertical: true });
                }

                if (y < this.height - 1) {
                    hwall = 1;
                    randomInsert(this.wallqs[0], { x, y, vertical: false });
                }
                this.data[base_index] = vwall;
                this.data[base_index + 1] = hwall;
            }
        }

        //reset union
        this.union = new Union(this.data.length / 2);

        let perf = 0;
        let w, chunks = new Array(9);
        while (true) {
            if (perf % 100 === 0) {
                console.log(
                    this.wallqs[0].length, this.wallqs[1].length, this.wallqs[2].length, 
                    this.wallqs[3].length, this.wallqs[4].length, this.wallqs[5].length, 
                    this.wallqs[6].length, this.wallqs[7].length, this.wallqs[8].length
                )
            }
            perf++;
            w = 0;
            //select a queue randomly, weighted
            for (let i = 0; i < 9; i++) {
                chunks[i] = this.wallqs[i].length * this.weights[i];
                w += chunks[i];
            }

            if (w === 0) break;

            w *= Math.random();
            let i = 0;
            for (i = 0; i < 8; i++) {
                const chunk = chunks[i]
                if (w < chunk) break;
                w -= chunk;
                }

            //pop a wall from the queue and try to remove it
            const wall_pos = this.wallqs[i].pop()!;
                const wall = this.getWall(wall_pos);
                const wall_type = this.getWallType(wall_pos);
                    
                // try to remove wall
            if (wall === 1 && wall_type === i) {
                    const c1 = wall_pos.y * this.width + wall_pos.x;
                    const c2 = c1 + (wall_pos.vertical ? 1 : this.width);

                    if (!this.union.union(c1, c2)) continue;

                    const neighbours = this.getNeighbours(wall_pos);
                for (let i = 0; i < 6; i++) {
                        this.setWall(wall_pos, 1);
                    const n_type = this.getWallType(neighbours[i]);
                        this.setWall(wall_pos, 0);
                    const neighbour = this.getWall(neighbours[i]);
                        if (neighbour === -1) continue;
                    const typ = this.getWallType(neighbours[i]);
                        if (typ <= n_type) continue;
                    randomInsert(this.wallqs[typ], neighbours[i]);
                }
            }
        }
        console.log(perf);
    }

    public toString() {
        return JSON.stringify({
            size: this.width,
            data: this.data,
            weights: this.weights
        })
    }

    public static fromString(str: string) {
        const o = JSON.parse(str);
        if (!(
            o.size && o.data && 
            typeof o.size === "number" && 
            Array.isArray(o.data) && 
            o.data.length % (o.size * 2) === 0
        )) {
            throw new Error("corrupt serialization");
        }
        return new Maze(o.size, o.data.length / (o.size * 2), o.weights, o.data);
    }
}


/*
* # util
* Add an element to a randomly permuted array
*/
function randomInsert<T>(arr: T[], item: T): void {
    if (arr.length === 0) {
        arr.push(item);
        return;
    }
    const i = Math.floor(Math.random() * (arr.length + 1));
    const arr2 = arr.splice(i);
    arr.push(item, ...arr2);
}