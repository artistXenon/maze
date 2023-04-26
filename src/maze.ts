import Union from "./union.js"

interface WallPosition {
    x: number;
    y: number;
    vertical: boolean;
}

interface WallDetail {
    clr: boolean;
    typ: number;
}


export default class Maze {
    public width: number; 
    public height: number;

    public weights;
    public data: (WallDetail | null)[];

    // private
    private wallqs: WallPosition[][] = [
        [], [], [],
        [], [], [],
        [], [], []
    ];
    private union: Union | undefined;

    constructor(
        w = 27, h = 18, 
        weights = {
            PV33: 12, PV23: 10, PV13: 14, 
            PV22: 10, PV12: 8, PV11: 2
        }, 
        data?: WallDetail[]
    ) {
        const size = w * h * 2;
        this.width = w;
        this.height = h;
        if (data && data.length === size) this.data = data;
        else this.data = new Array(size);
        const {
            PV33, PV23, PV13, 
            PV22, PV12, 
            PV11 
        } = weights;
        this.weights = [
            PV33, PV23, PV13, 
            PV23, PV22, PV12, 
            PV13, PV12, PV11
        ];
        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] = Math.pow(2.0, this.weights[i] * 0.5);
        }
    }

    getWall(wall_pos: WallPosition): WallDetail | null {
        const { x, y, vertical } = wall_pos;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.data[(y * this.width + x) * 2 + (vertical ? 0 : 1)];
        }
        return null;
    }

    getNeighbours(wall_pos: WallPosition): WallPosition[] {
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

    tryWall(wall_pos: WallPosition) { 
        const { x, y, vertical } = wall_pos;
        const wall = this.getWall(wall_pos);
        if (!wall || wall.clr) return false;

        const c1 = y * this.width + x;
        const c2 = c1 + (vertical ? 1 : this.width);

        if (!this.union?.union(c1, c2)) return false;

        wall.clr = true;

        const neighbours = this.getNeighbours(wall_pos);
        for (const neighbour of neighbours) {
            const wall_detail = this.getWall(neighbour);
            if (!wall_detail) continue;

            const wall_neighbours = this.getNeighbours(neighbour);
            const t1 = this.getWallEndType(wall_neighbours[0], wall_neighbours[1], wall_neighbours[2]);
            const t2 = this.getWallEndType(wall_neighbours[3], wall_neighbours[4], wall_neighbours[5]);
            const typ = t1 * 3 + t2;

            if (typ <= wall_detail.typ) continue;
            wall_detail.typ = typ;
            randomInsert(this.wallqs[typ], neighbour);
        }
        return true;
    }

    getWallEndType(...w: WallPosition[]) {
        const c = w.map(wall => {
            const t = this.getWall(wall);
            return t && t.clr;
        });
        if (c[1] === c[3]) return c[1] ? 2 : 0;
        else return c[2] ? 2 : 1;
    }

    generate() {
        this.wallqs = [
            [], [], [],
            [], [], [],
            [], [], []
        ];

        let vwall, hwall;
        for (let y = 0; y < this.height; ++y) {
            for(let x = 0; x < this.width; ++x) {
                const base_index = (y * this.width + x) * 2;
                vwall = null
                if (x < this.width - 1) {
                    vwall = { typ: 0, clr: false };
                    randomInsert(this.wallqs[0], { x, y, vertical: true });
                }
                this.data[base_index] = vwall;

                hwall = null
                if (y < this.height - 1) {
                    hwall = { typ: 0, clr: false };
                    randomInsert(this.wallqs[0], { x, y, vertical: false });
                }
                this.data[base_index + 1] = hwall;
            }
        }

        //reset union
        this.union = new Union(this.data.length / 2);

        while (true) {
            let w = 0;
            let chunks = new Array(9);

            //select a queue randomly, weighted
            for (let i = 0; i < 9; i++) {
                chunks[i] = this.wallqs[i].length * this.weights[i];
                w += chunks[i];
            }

            if (w === 0) break;

            w *= Math.random();
            chunks.pop();
            let i = 0;
            for (const chunk of chunks) {
                if (w < chunk) break;
                w -= chunk;
                i++;
            }
            
            //pop a wall from the queue and try to remove it
            const wall_pos = this.wallqs[i].pop()!;
            const wall = this.getWall(wall_pos);
            if (wall && wall.typ === i) this.tryWall(wall_pos);
        }
    }

    toString() {
        return JSON.stringify({
            size: this.width,
            data: this.data,
            weights: {
                PV33: this.weights[0], 
                PV23: this.weights[1], 
                PV13: this.weights[2], 
                PV22: this.weights[4], 
                PV12: this.weights[5], 
                PV11: this.weights[8]
            }
        })
    }

    static fromString(str: string) {
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