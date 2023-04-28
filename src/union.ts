export default class Union {
    private array: number[];

    constructor(size: number) {
        this.array = new Array(size).fill(-1);
    }

    /*
    * # util
    * Union-find implementation
    * so we know when removing a wall will connect disconnected parts of the maze 
    */
    public find(cell: number) {
        let t: number;
        const paths: number[] = [];
        // find root
        while ((t = this.array[cell]) > -1 ) {
            cell = t;
            paths.push(t);
        }

        // link children to root 
        for (const path of paths) {
            if (path === cell) break;
            this.array[path] = cell;
        }
        return cell;
    }

    public union(cell1: number, cell2: number) {
        let 
            i = this.find(cell1),
            j = this.find(cell2);
        if (i === j) return false;
        if (this.array[i] < this.array[j]) {
            let k = i;
            i = j;
            j = k;
        }
        this.array[j] += this.array[i];
        this.array[i] = j;
        return true;
    }
}