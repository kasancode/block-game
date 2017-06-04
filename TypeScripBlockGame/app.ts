
class point {
    x: number;
    y: number;
}

class size {
    width: number;
    height: number;
}

interface onMouseObject {
    move(event: MouseEvent);
    mouseDown(event: MouseEvent);
    mouseUp(event: MouseEvent);
}

interface onPaintObject {
    hide: boolean;
    paint(context:CanvasRenderingContext2D);
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

class label implements onPaintObject {
    text: string;
    font: string;
    color: string;
    position: point;
    hide: boolean;

    constructor(text: string, font: string, color: string, position: point) {
        this.text = text;
        this.font = font;
        this.color = color;
        this.position = position;
        this.hide = false;
    }

    paint(context: CanvasRenderingContext2D) {
        if (this.hide)
            return;

        context.fillStyle = this.color;
        context.font = this.font;
        context.textAlign = "left";
        context.textBaseline = "alphabetic";

        context.fillText(this.text, this.position.x, this.position.y);
        context.fill();
    }
}

class button implements onMouseObject, onPaintObject {
    position: point;
    size: size;

    backColor: string;
    color: string;
    hilightColor: string;
    hover: boolean = false;
    pushed: boolean = false;
    mousePushed: boolean = false;

    hide: boolean = false;
    text: string;
    font: string;

    pushedTime: number;

    constructor(
        text: string,
        font: string,
        color: string,
        position: point,
        size: size,
        backColor: string,
        hilightColor: string) {

        this.text = text;
        this.font = font;
        this.color = color;
        this.position = position;
        this.size = size;
        this.backColor = backColor;
        this.hilightColor = hilightColor;
        this.hide = false;
        this.pushed = false;
    }

    move(event: MouseEvent|TouchEvent){
        this.hover = this.hittest(event);

        this.pushed = this.hover && this.mousePushed;
    }

    mouseDown(event: MouseEvent | TouchEvent) {
        if (event instanceof MouseEvent) {
            this.mousePushed = event.button == 0;
        }
        else if (event instanceof TouchEvent) {
            this.mousePushed = event.touches.length > 0;
        }

        this.hover = this.hittest(event);

        if (!this.pushed && this.hover && this.mousePushed) {
            this.pushed = this.hover && this.mousePushed;
            this.pushedTime = Date.now();
            if (this.onClick)
                this.onClick();
        }
    }

    mouseUp(event: MouseEvent | TouchEvent) {
        this.mousePushed = false;
        this.pushed = this.hover && this.mousePushed;
    }


    hittest(event: MouseEvent | TouchEvent): boolean {
        let x: number;
        let y: number;

        if (event instanceof MouseEvent) {
            x = event.offsetX;
            y = event.offsetY;
        }
        else if (event instanceof TouchEvent) {
            let rect = event.srcElement.getBoundingClientRect();

            x = event.touches[0].pageX - rect.left;
            y = event.touches[0].pageY - rect.top;
        }

        return x >= this.position.x &&
            y >= this.position.y &&
            x <= this.position.x + this.size.width &&
            y <= this.position.y + this.size.height;
    }

    paint(context: CanvasRenderingContext2D) {
        if (this.hide)
            return;

        if (this.hover) {
            context.fillStyle = this.hilightColor;
            context.fillRect(
                this.position.x,
                this.position.y,
                this.size.width,
                this.size.height);
            context.fill();
        }

        context.strokeStyle = this.color;
        context.strokeRect(
            this.position.x,
            this.position.y,
            this.size.width,
            this.size.height);
        context.stroke();

        context.fillStyle = this.color;
        context.font = this.font;
        context.textAlign = "center";
        context.textBaseline = "middle";

        context.fillText(
            this.text,
            this.position.x + this.size.width / 2,
            this.position.y + this.size.height / 2);
        context.fill();

    }

    onClick: () => void;
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

    paintObjects: [onPaintObject];
    moveObjects: [button];



    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

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

        this.canvas.onmousedown = (event: MouseEvent) => {
            this.moveObjects.map((m) => m.mouseDown(event));
        }
        this.canvas.onmouseup = (event: MouseEvent) => {
            this.moveObjects.map((m) => m.mouseUp(event));
        }
        this.canvas.onmousemove = (event: MouseEvent) => {
            this.moveObjects.map((m) => m.move(event));
        }
        
        this.canvas.ontouchstart = (event: TouchEvent) => {
            this.moveObjects.map((m) => m.mouseDown(event));
        }
        this.canvas.ontouchend = (event: TouchEvent) => {
            this.moveObjects.map((m) => m.mouseUp(event));
        }
        this.canvas.ontouchmove = (event: TouchEvent) => {
            this.moveObjects.map((m) => m.move(event));
        }

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
        this.blankCellColor = "black";

        this.scoreBase = [0, 40, 100, 300, 1200];

        let lblFont = "18px 'Segoe UI', sans-serif";
        let lblClr = "white";

        this.scoreLabel = new label(
            "",
            lblFont,
            lblClr,
            { x: 300, y: 210 });

        this.levelLabel = new label(
            "",
            lblFont,
            lblClr,
            { x: 300, y: 240 });

        this.nextLabel = new label(
            "Next:",
            lblFont,
            lblClr,
            { x: 300, y: 70 });

        this.gameoverLabel = new label(
            "Game Over!",
            "40px 'Segoe UI', sans-serif",
            lblClr,
            { x: 265, y: 300 });
        this.gameoverLabel.hide = true;


        let btnSize = 30;
        let btnBase = 400;
        let btnLeft = 300;
        let btnMrgn = 10;
        let btnFont = "18px 'Segoe UI', sans-serif";
        let btnFClr = "white";
        let btnBClr = "black";
        let btnHClr = "light gray";

        let leftBtn = new button(
            "←",
            btnFont,
            btnFClr,
            { x: btnLeft + (btnSize + btnMrgn) * 0, y: btnBase },
            { width: btnSize, height: btnSize },
            btnBClr,
            btnHClr
        );
        leftBtn.onClick = () => { this.action.moveLeft = true };

        let downBtn = new button(
            "↓",
            btnFont,
            btnFClr,
            { x: btnLeft + (btnSize + btnMrgn) * 1, y: btnBase },
            { width: btnSize, height: btnSize },
            btnBClr,
            btnHClr
        );
        downBtn.onClick = () => { this.action.down = true };

        let rightBtn = new button(
            "→",
            btnFont,
            btnFClr,
            { x: btnLeft + (btnSize + btnMrgn) * 2, y: btnBase },
            { width: btnSize, height: btnSize },
            btnBClr,
            btnHClr
        );
        rightBtn.onClick = () => { this.action.moveRight = true };

        let upBtn = new button(
            "↑",
            btnFont,
            btnFClr,
            { x: btnLeft + (btnSize + btnMrgn) * 1, y: btnBase - (btnSize + btnMrgn) * 1 },
            { width: btnSize, height: btnSize },
            btnBClr,
            btnHClr
        );
        upBtn.onClick = () => { this.action.rotateClock = true };


        this.paintObjects = [
            this.scoreLabel,
            this.levelLabel,
            this.nextLabel,
            this.gameoverLabel,
            leftBtn,
            rightBtn,
            downBtn,
            upBtn
        ];

        this.moveObjects = [
            leftBtn,
            rightBtn,
            downBtn,
            upBtn
        ]


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
        this.timerToken = setInterval(() => {
            this.move();
            this.draw();
        }, this.interval);
    }

    stop() {
        clearTimeout(this.timerToken);
    }

    draw() {
        this.context.beginPath();
        this.context.fillStyle = this.backColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);


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

        if (this.scene == scene.lineFlashing) {

            if (Math.floor(this.flashCounter / this.flashInterval) % 2 == 0) {
                this.context.fillStyle = this.flashColor;

                for (let l = 0; l < this.removeLineList.length; l++) {
                    for (let c = 0; c < this.cell[l].length; c++) {
                        this.drawCell(c, this.removeLineList[l]);
                    }
                }
            }
        }

        this.paintObjects.map((p) => p.paint(this.context));
    }

    drawCell(x: number, y: number) {
        this.context.fillRect(
            x * this.cellSize + this.cellPoistion.x,
            y * this.cellSize + this.cellPoistion.y,
            this.cellSize - 1,
            this.cellSize - 1);

        this.context.fill();
    }

    drawblockInfos(blockInfos: point[], index: number, position: point) {
        let x = position.x;
        let y = position.y;

        this.context.fillStyle = this.colorPattern[index];

        for (let i = 0; i < blockInfos.length; i++) {
            this.drawCell(blockInfos[i].x + x, blockInfos[i].y + y);
        }
    }

    move() {
        let t = Date.now();
        this.moveObjects.map((m) => {
            if (m.pushed && (t - m.pushedTime) > 300 && m.onClick)
                m.onClick();
        });
        this.gameoverLabel.hide = true;

        if (this.scene == scene.gameOver) {
            this.gameoverLabel.hide = false;

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

                if (this.currentblock.position.x == 4 && this.currentblock.position.y <= 1) {
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
                    this.scene = scene.lineFlashing;

                this.currentblock.reset(this.nextblockType);
                this.nextblockType = Math.floor(Math.random() * this.blockInfos.length);
            }
        }

        this.action.reset();

        this.scoreLabel.text = "Score :  " + this.score.toString();
        this.levelLabel.text = "Level :  " + this.level.toString();

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
    let canvas = document.createElement("canvas");
    canvas.id = "play-ground";

    document.body.appendChild(canvas);

    play = new playGround(canvas);

    play.start();
};