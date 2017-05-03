
class point {
    x: number;
    y: number;
}

class blockTemplate {
    blocks: point[][];

    constructor(rotateCondition: number, block: point[]) {
        this.blocks = new Array(rotateCondition);

        this.blocks[0] = block;

        for (var i = 1; i < rotateCondition; i++) {
            this.blocks[i] = new Array(this.blocks[0].length);

            for (var j = 0; j < this.blocks[i].length; j++) {
                let nx = this.blocks[i - 1][j].x;
                let ny = this.blocks[i - 1][j].y;

                this.blocks[i][j] = { x: -ny, y: nx };
            }
        }
    }
}

class action {
    rotateClock: boolean = false;
    rotateCounterclock: boolean = false;
    down: boolean = false;
    moveRight: boolean = false;
    moveLeft: boolean = false;

    reset() {
        this.rotateCounterclock = false;
        this.rotateClock = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.down = false;
    }

    any(): boolean {
        return this.down || this.moveLeft || this.moveRight || this.rotateClock || this.rotateCounterclock;
    }
}

class block {
    position: point;

    index: number;
    degree: number = 0;

    blockInfos: blockTemplate[];

    constructor(blockInfos: blockTemplate[]) {
        this.blockInfos = blockInfos;
        this.position = new point();

        this.reset(0);
    }

    reset(index: number) {
        this.index = index;
        this.degree = 0;
        this.position.x = 4;
        this.position.y = 1;
    }

    rotateClock() {
        this.degree++;

        let l = this.blockInfos[this.index].blocks.length;

        if (this.degree >= l)
            this.degree -= l;
    }

    rotateCounterclock() {
        this.degree--;

        if (this.degree < 0)
            this.degree += this.blockInfos[this.index].blocks.length;
    }

    getblockInfos(): point[] {
        return this.blockInfos[this.index].blocks[this.degree];
    }

}

enum scene {
    playing,
    lineFlashing,
    gameOver,
}

class label {
    text: string;
    font: string;
    color: string;
    position: point;

    constructor(text: string, font: string, color: string, position: point) {
        this.text = text;
        this.font = font;
        this.color = color;
        this.position = position;
    }

    draw(context: CanvasRenderingContext2D) {
        context.fillStyle = this.color;
        context.font = this.font;
        context.fillText(this.text, this.position.x, this.position.y);
        context.fill();
    }

    drawText(context: CanvasRenderingContext2D, text:string) {
        context.fillStyle = this.color;
        context.font = this.font;
        context.fillText(text, this.position.x, this.position.y);
        context.fill();
    }


}

class playGround {
    canvas: HTMLCanvasElement;
    cell: number[][];

    blockInfos: blockTemplate[]; 

    context: CanvasRenderingContext2D;

    currentblock: block;

    cellPoistion: point;

    nextblockPosition: point;
    nextblockType;

    cellSize: number;

    colorPattern: string[];

    action: action;

    timerToken: number;

    autoDropCounter: number;
    autoDropLimit: number;
    autoDropDefault: number;

    score: number;
    removeLineCount: number;
    level: number;

    flashCounter: number;
    flashInterval: number;
    flashLimit: number;
    flashColor: string;

    gameoverCooldown: number;
    gameoverCounter: number;


    scoreBase: number[];

    gameoverLabel: label;
    scoreLabel: label;
    levelLabel: label;
    nextLabel: label;

    removeLineList: number[];

    scene: scene;

    backColor: string;
    blankCellColor: string;

    interval: number;



    constructor(canvasId : string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (this.canvas == undefined)
            return;

        this.cell = new Array(20);
        for (var i = 0; i < this.cell.length; i++) {
            this.cell[i] = new Array(10);
        }

        this.action = new action();

        this.canvas.width = 500;
        this.canvas.height = 500;

        this.cellSize = 20;

        this.cellPoistion = { x: 50, y: 50 };
        this.nextblockPosition = { x: 14, y: 3 };

        this.flashInterval = 100;
        this.flashLimit = 500;
        this.flashColor = "black";

        this.initblock();

        this.context = this.canvas.getContext("2d");
        this.scene = scene.playing;

        this.interval = 50;

        this.autoDropDefault = 1000;

        this.colorPattern = [
            "aqua",
            "yellow",
            "lime",
            "red",
            "blue",
            "orange",
            "purple"
        ];
        this.backColor = "gray";
        this.blankCellColor= "black";

        this.scoreBase = [0, 40, 100, 300, 1200];

        this.scoreLabel = new label(
            "",
            "18px 'Segoe UI', sans-serif",
            "white",
            { x: 300, y: 210 });

        this.levelLabel = new label(
            "",
            "18px 'Segoe UI', sans-serif",
            "white",
            { x: 300, y: 240 });

        this.nextLabel = new label(
            "Next:",
            "18px 'Segoe UI', sans-serif",
            "white",
            { x: 300, y: 70 });

        this.gameoverLabel = new label(
            "Game Over!",
            "40px 'Segoe UI', sans-serif",
            "white",
            { x: 265, y: 300 });

        this.gameoverCooldown = 1000;

        this.currentblock = new block(this.blockInfos);

        this.reset();

    }

    reset() {
        for (let y = 0; y < this.cell.length; y++)
            for (let x = 0; x < this.cell[0].length; x++)
                this.cell[y][x] = -1;

        this.action.reset();

        this.currentblock.reset(Math.floor(Math.random() * this.blockInfos.length));
        this.autoDropCounter = 0;
        this.nextblockType = Math.floor(Math.random() * this.blockInfos.length);

        this.score = 0;
        this.removeLineCount = 0;

        this.flashCounter = 0;
        this.scene = scene.playing;
        this.gameoverCounter = 0;
        this.level = 1;

        this.autoDropLimit = this.autoDropDefault;

    }

    start() {
        this.timerToken = setInterval(()=>this.move(), this.interval);
    }

    stop() {
        clearTimeout(this.timerToken);
    }

    draw() {
        this.context.beginPath();
        this.context.fillStyle = this.backColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.scoreLabel.drawText(this.context, "Score :  " + this.score.toString());
        this.levelLabel.drawText(this.context, "Level :  " + this.level.toString());
        this.nextLabel.draw(this.context);

        for (let l = 0; l < this.cell.length; l++) {
            for (let c = 0; c < this.cell[l].length; c++) {
                if (this.cell[l][c] >= 0) {
                    this.context.fillStyle = this.colorPattern[this.cell[l][c]];
                }
                else {
                    this.context.fillStyle = this.blankCellColor;
                }

                this.drawCell(c, l);
            }
        }

        this.drawblockInfos(
            this.blockInfos[this.nextblockType].blocks[0],
            this.nextblockType,
            this.nextblockPosition);


        this.drawblockInfos(
            this.currentblock.getblockInfos(),
            this.currentblock.index,
            this.currentblock.position);


        if (this.scene == scene.gameOver) {
            this.gameoverLabel.draw(this.context);
        }
        else if (this.scene == scene.lineFlashing) {

            if (Math.floor(this.flashCounter / this.flashInterval) % 2 == 0) {
                this.context.fillStyle = this.flashColor;

                for (let l = 0; l < this.removeLineList.length; l++) {
                    for (let c = 0; c < this.cell[l].length; c++) {
                        this.drawCell(c, this.removeLineList[l]);
                    }
                }
            }
        }
    }

    drawCell(x: number, y: number) {
        this.context.fillRect(
            x * this.cellSize + this.cellPoistion.x,
            y * this.cellSize + this.cellPoistion.y,
            this.cellSize - 1,
            this.cellSize - 1);

        this.context.fill();
    }

    drawblockInfos(blockInfos: point[], index:number, position:point) {
        let x = position.x;
        let y = position.y;

        this.context.fillStyle = this.colorPattern[index];

        for (let i = 0; i < blockInfos.length; i++) {
            this.drawCell(blockInfos[i].x + x, blockInfos[i].y + y);
        }
    }

    move() {
        if (this.scene == scene.gameOver) {
            this.draw();
            this.gameoverCounter += this.interval;

            if (this.gameoverCounter > this.gameoverCooldown && this.action.any()) {
                this.reset();
            }
            this.action.reset();

            return;
        }
        else if (this.scene == scene.lineFlashing) {
            this.action.reset();

            this.flashCounter += this.interval;

            if (this.flashCounter > this.flashLimit) {
                this.flashCounter = 0;
                this.removeLines(this.removeLineList);
            }

            this.draw();
            return;
        }

        // this.scene == scene.playing

        let x = this.currentblock.position.x;
        let y = this.currentblock.position.y;

        this.autoDropCounter += this.interval;
        if (this.autoDropCounter > this.autoDropLimit) {
            this.action.down = true;
            this.autoDropCounter = 0;
        }

        if (this.action.moveLeft) {
            this.currentblock.position.x--;

            if (this.hitTest(this.currentblock.getblockInfos(), this.currentblock.position)) {
                this.currentblock.position.x++;
            }
        }

        if (this.action.moveRight) {
            this.currentblock.position.x++;

            if (this.hitTest(this.currentblock.getblockInfos(), this.currentblock.position)) {
                this.currentblock.position.x--;
            }
        }

        if (this.action.rotateClock) {
            this.currentblock.rotateClock();

            if (this.hitTest(this.currentblock.getblockInfos(), this.currentblock.position)) {
                this.currentblock.rotateCounterclock();
            }
        }

        if (this.action.rotateCounterclock) {
            this.currentblock.rotateCounterclock();

            if (this.hitTest(this.currentblock.getblockInfos(), this.currentblock.position)) {
                this.currentblock.rotateClock();
            }
        }

        if (this.action.down) {
            this.currentblock.position.y++;

            this.autoDropCounter = 0;

            if (this.hitTest(this.currentblock.getblockInfos(), this.currentblock.position)) {
                this.currentblock.position.y--;

                if (this.currentblock.position.x == 4 && this.currentblock.position.y <= 1){
                    this.scene = scene.gameOver;
                    return;
                }

                let blockInfos = this.currentblock.getblockInfos();
                this.removeLineList = new Array();

                for (let i = 0; i < blockInfos.length; i++) {
                    let x = blockInfos[i].x + this.currentblock.position.x;
                    let y = blockInfos[i].y + this.currentblock.position.y;

                    this.cell[y][x] = this.currentblock.index;

                    if (this.removeLineList.indexOf(y) < 0 && this.isFilled(y))
                        this.removeLineList.push(y);
                }


                if (this.removeLineList.length > 0)
                    this.scene= scene.lineFlashing;

                this.currentblock.reset(this.nextblockType);
                this.nextblockType = Math.floor(Math.random() * this.blockInfos.length);
            }
        }

        this.action.reset();

        this.draw();
    }

    isFilled(line: number): boolean {

        for (let c = 0; c < this.cell[line].length; c++) {
            if (this.cell[line][c] < 0)
                return false;
        }

        return true;
    }


    removeLines(lines: number[]) {
        this.scene = scene.playing;

        let newCells = this.cell.filter((value, index, array) =>
            lines.indexOf(index) < 0
        );

        let emptyCells: number[][] = new Array(lines.length);
        for (let l = 0; l < emptyCells.length; l++) {
            emptyCells[l] = new Array(10);
            for (let c = 0; c < emptyCells[l].length; c++) {
                emptyCells[l][c] = -1;
            }
        }

        this.score += this.scoreBase[lines.length];
        this.removeLineCount += lines.length;
        this.level = Math.floor(this.removeLineCount / 10) + 1;
        this.autoDropLimit = Math.max(this.autoDropDefault - this.level * (this.interval - 1), 0);

        this.cell = emptyCells.concat(newCells);
    }

    hitTest(block: point[], offset: point): boolean {

        for (let i = 0; i < block.length; i++) {
            let x = block[i].x + offset.x;
            let y = block[i].y + offset.y;

            if (x < 0 || x >= this.cell[0].length)
                return true;

            if (y < 0 || y >= this.cell.length)
                return true;

            if (this.cell[y][x] >= 0)
                return true;
        }

        return false;
    }

    initblock() {
        this.blockInfos = new Array(7);

        // I
        this.blockInfos[0] = new blockTemplate(2, [
            { x: -1, y: 0 },
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        ]);
        

        // O
        this.blockInfos[1] = new blockTemplate(1, [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
        ]);

        // S
        this.blockInfos[2] = new blockTemplate(2, [
            { x: -1, y: 1 },
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 0 },
        ]);
        
        // Z
        this.blockInfos[3] = new blockTemplate(2, [
            { x: -1, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
        ]);

        // J
        this.blockInfos[4] = new blockTemplate(4, [
            { x: -1, y: -1 },
            { x: -1, y: 0 },
            { x: 0, y: 0 },
            { x: 1, y: 0 },
        ]);

        // L
        this.blockInfos[5] = new blockTemplate(4, [
            { x: -1, y: 0 },
            { x: 0, y: 0 },
            { x: 1, y: -1 },
            { x: 1, y: 0 },
        ]);

        // T
        this.blockInfos[6] = new blockTemplate(4, [
            { x: -1, y: 0 },
            { x: 0, y: -1 },
            { x: 0, y: 0 },
            { x: 1, y: 0 },
        ]);
    }

}

var play: playGround;

document.onkeydown = (event) => {
    if (event.keyCode == 40) {
        play.action.down = true;
    }
    if (event.keyCode == 38) {
        play.action.rotateClock = true;
    }
    if (event.keyCode == 46) {
        play.action.rotateCounterclock = true;
    }
    if (event.keyCode == 37) {
        play.action.moveLeft = true;
    }
    if (event.keyCode == 39) {
        play.action.moveRight = true;
    }
}

window.onload = () => {
    play = new playGround('play-ground');
    play.start();
};