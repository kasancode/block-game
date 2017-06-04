var point = (function () {
    function point() {
    }
    return point;
}());
var size = (function () {
    function size() {
    }
    return size;
}());
var blockTemplate = (function () {
    function blockTemplate(rotateCondition, block) {
        this.blocks = new Array(rotateCondition);
        this.blocks[0] = block;
        for (var i = 1; i < rotateCondition; i++) {
            this.blocks[i] = new Array(this.blocks[0].length);
            for (var j = 0; j < this.blocks[i].length; j++) {
                var nx = this.blocks[i - 1][j].x;
                var ny = this.blocks[i - 1][j].y;
                this.blocks[i][j] = { x: -ny, y: nx };
            }
        }
    }
    return blockTemplate;
}());
var action = (function () {
    function action() {
        this.rotateClock = false;
        this.rotateCounterclock = false;
        this.down = false;
        this.moveRight = false;
        this.moveLeft = false;
    }
    action.prototype.reset = function () {
        this.rotateCounterclock = false;
        this.rotateClock = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.down = false;
    };
    action.prototype.any = function () {
        return this.down || this.moveLeft || this.moveRight || this.rotateClock || this.rotateCounterclock;
    };
    return action;
}());
var block = (function () {
    function block(blockInfos) {
        this.degree = 0;
        this.blockInfos = blockInfos;
        this.position = new point();
        this.reset(0);
    }
    block.prototype.reset = function (index) {
        this.index = index;
        this.degree = 0;
        this.position.x = 4;
        this.position.y = 1;
    };
    block.prototype.rotateClock = function () {
        this.degree++;
        var l = this.blockInfos[this.index].blocks.length;
        if (this.degree >= l)
            this.degree -= l;
    };
    block.prototype.rotateCounterclock = function () {
        this.degree--;
        if (this.degree < 0)
            this.degree += this.blockInfos[this.index].blocks.length;
    };
    block.prototype.getblockInfos = function () {
        return this.blockInfos[this.index].blocks[this.degree];
    };
    return block;
}());
var scene;
(function (scene) {
    scene[scene["playing"] = 0] = "playing";
    scene[scene["lineFlashing"] = 1] = "lineFlashing";
    scene[scene["gameOver"] = 2] = "gameOver";
})(scene || (scene = {}));
var label = (function () {
    function label(text, font, color, position) {
        this.text = text;
        this.font = font;
        this.color = color;
        this.position = position;
        this.hide = false;
    }
    label.prototype.paint = function (context) {
        if (this.hide)
            return;
        context.fillStyle = this.color;
        context.font = this.font;
        context.textAlign = "left";
        context.textBaseline = "alphabetic";
        context.fillText(this.text, this.position.x, this.position.y);
        context.fill();
    };
    return label;
}());
var button = (function () {
    function button(text, font, color, position, size, backColor, hilightColor) {
        this.hover = false;
        this.pushed = false;
        this.mousePushed = false;
        this.hide = false;
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
    button.prototype.move = function (event) {
        this.hover = this.hittest(event);
        this.pushed = this.hover && this.mousePushed;
    };
    button.prototype.mouseDown = function (event) {
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
    };
    button.prototype.mouseUp = function (event) {
        this.mousePushed = false;
        this.pushed = this.hover && this.mousePushed;
    };
    button.prototype.hittest = function (event) {
        var x;
        var y;
        if (event instanceof MouseEvent) {
            x = event.offsetX;
            y = event.offsetY;
        }
        else if (event instanceof TouchEvent) {
            var rect = event.srcElement.getBoundingClientRect();
            x = event.touches[0].pageX - rect.left;
            y = event.touches[0].pageY - rect.top;
        }
        return x >= this.position.x &&
            y >= this.position.y &&
            x <= this.position.x + this.size.width &&
            y <= this.position.y + this.size.height;
    };
    button.prototype.paint = function (context) {
        if (this.hide)
            return;
        if (this.hover) {
            context.fillStyle = this.hilightColor;
            context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
            context.fill();
        }
        context.strokeStyle = this.color;
        context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height);
        context.stroke();
        context.fillStyle = this.color;
        context.font = this.font;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(this.text, this.position.x + this.size.width / 2, this.position.y + this.size.height / 2);
        context.fill();
    };
    return button;
}());
var playGround = (function () {
    function playGround(canvas) {
        var _this = this;
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
        this.canvas.onmousedown = function (event) {
            _this.moveObjects.map(function (m) { return m.mouseDown(event); });
        };
        this.canvas.onmouseup = function (event) {
            _this.moveObjects.map(function (m) { return m.mouseUp(event); });
        };
        this.canvas.onmousemove = function (event) {
            _this.moveObjects.map(function (m) { return m.move(event); });
        };
        this.canvas.ontouchstart = function (event) {
            _this.moveObjects.map(function (m) { return m.mouseDown(event); });
        };
        this.canvas.ontouchend = function (event) {
            _this.moveObjects.map(function (m) { return m.mouseUp(event); });
        };
        this.canvas.ontouchmove = function (event) {
            _this.moveObjects.map(function (m) { return m.move(event); });
        };
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
        var lblFont = "18px 'Segoe UI', sans-serif";
        var lblClr = "white";
        this.scoreLabel = new label("", lblFont, lblClr, { x: 300, y: 210 });
        this.levelLabel = new label("", lblFont, lblClr, { x: 300, y: 240 });
        this.nextLabel = new label("Next:", lblFont, lblClr, { x: 300, y: 70 });
        this.gameoverLabel = new label("Game Over!", "40px 'Segoe UI', sans-serif", lblClr, { x: 265, y: 300 });
        this.gameoverLabel.hide = true;
        var btnSize = 30;
        var btnBase = 400;
        var btnLeft = 300;
        var btnMrgn = 10;
        var btnFont = "18px 'Segoe UI', sans-serif";
        var btnFClr = "white";
        var btnBClr = "black";
        var btnHClr = "light gray";
        var leftBtn = new button("←", btnFont, btnFClr, { x: btnLeft + (btnSize + btnMrgn) * 0, y: btnBase }, { width: btnSize, height: btnSize }, btnBClr, btnHClr);
        leftBtn.onClick = function () { _this.action.moveLeft = true; };
        var downBtn = new button("↓", btnFont, btnFClr, { x: btnLeft + (btnSize + btnMrgn) * 1, y: btnBase }, { width: btnSize, height: btnSize }, btnBClr, btnHClr);
        downBtn.onClick = function () { _this.action.down = true; };
        var rightBtn = new button("→", btnFont, btnFClr, { x: btnLeft + (btnSize + btnMrgn) * 2, y: btnBase }, { width: btnSize, height: btnSize }, btnBClr, btnHClr);
        rightBtn.onClick = function () { _this.action.moveRight = true; };
        var upBtn = new button("↑", btnFont, btnFClr, { x: btnLeft + (btnSize + btnMrgn) * 1, y: btnBase - (btnSize + btnMrgn) * 1 }, { width: btnSize, height: btnSize }, btnBClr, btnHClr);
        upBtn.onClick = function () { _this.action.rotateClock = true; };
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
        ];
        this.gameoverCooldown = 1000;
        this.currentblock = new block(this.blockInfos);
        this.reset();
    }
    playGround.prototype.reset = function () {
        for (var y = 0; y < this.cell.length; y++)
            for (var x = 0; x < this.cell[0].length; x++)
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
    };
    playGround.prototype.start = function () {
        var _this = this;
        this.timerToken = setInterval(function () {
            _this.move();
            _this.draw();
        }, this.interval);
    };
    playGround.prototype.stop = function () {
        clearTimeout(this.timerToken);
    };
    playGround.prototype.draw = function () {
        var _this = this;
        this.context.beginPath();
        this.context.fillStyle = this.backColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for (var l = 0; l < this.cell.length; l++) {
            for (var c = 0; c < this.cell[l].length; c++) {
                if (this.cell[l][c] >= 0) {
                    this.context.fillStyle = this.colorPattern[this.cell[l][c]];
                }
                else {
                    this.context.fillStyle = this.blankCellColor;
                }
                this.drawCell(c, l);
            }
        }
        this.drawblockInfos(this.blockInfos[this.nextblockType].blocks[0], this.nextblockType, this.nextblockPosition);
        this.drawblockInfos(this.currentblock.getblockInfos(), this.currentblock.index, this.currentblock.position);
        if (this.scene == scene.lineFlashing) {
            if (Math.floor(this.flashCounter / this.flashInterval) % 2 == 0) {
                this.context.fillStyle = this.flashColor;
                for (var l = 0; l < this.removeLineList.length; l++) {
                    for (var c = 0; c < this.cell[l].length; c++) {
                        this.drawCell(c, this.removeLineList[l]);
                    }
                }
            }
        }
        this.paintObjects.map(function (p) { return p.paint(_this.context); });
    };
    playGround.prototype.drawCell = function (x, y) {
        this.context.fillRect(x * this.cellSize + this.cellPoistion.x, y * this.cellSize + this.cellPoistion.y, this.cellSize - 1, this.cellSize - 1);
        this.context.fill();
    };
    playGround.prototype.drawblockInfos = function (blockInfos, index, position) {
        var x = position.x;
        var y = position.y;
        this.context.fillStyle = this.colorPattern[index];
        for (var i = 0; i < blockInfos.length; i++) {
            this.drawCell(blockInfos[i].x + x, blockInfos[i].y + y);
        }
    };
    playGround.prototype.move = function () {
        var t = Date.now();
        this.moveObjects.map(function (m) {
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
        var x = this.currentblock.position.x;
        var y = this.currentblock.position.y;
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
                var blockInfos = this.currentblock.getblockInfos();
                this.removeLineList = new Array();
                for (var i = 0; i < blockInfos.length; i++) {
                    var x_1 = blockInfos[i].x + this.currentblock.position.x;
                    var y_1 = blockInfos[i].y + this.currentblock.position.y;
                    this.cell[y_1][x_1] = this.currentblock.index;
                    if (this.removeLineList.indexOf(y_1) < 0 && this.isFilled(y_1))
                        this.removeLineList.push(y_1);
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
    };
    playGround.prototype.isFilled = function (line) {
        for (var c = 0; c < this.cell[line].length; c++) {
            if (this.cell[line][c] < 0)
                return false;
        }
        return true;
    };
    playGround.prototype.removeLines = function (lines) {
        this.scene = scene.playing;
        var newCells = this.cell.filter(function (value, index, array) {
            return lines.indexOf(index) < 0;
        });
        var emptyCells = new Array(lines.length);
        for (var l = 0; l < emptyCells.length; l++) {
            emptyCells[l] = new Array(10);
            for (var c = 0; c < emptyCells[l].length; c++) {
                emptyCells[l][c] = -1;
            }
        }
        this.score += this.scoreBase[lines.length];
        this.removeLineCount += lines.length;
        this.level = Math.floor(this.removeLineCount / 10) + 1;
        this.autoDropLimit = Math.max(this.autoDropDefault - this.level * (this.interval - 1), 0);
        this.cell = emptyCells.concat(newCells);
    };
    playGround.prototype.hitTest = function (block, offset) {
        for (var i = 0; i < block.length; i++) {
            var x = block[i].x + offset.x;
            var y = block[i].y + offset.y;
            if (x < 0 || x >= this.cell[0].length)
                return true;
            if (y < 0 || y >= this.cell.length)
                return true;
            if (this.cell[y][x] >= 0)
                return true;
        }
        return false;
    };
    playGround.prototype.initblock = function () {
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
    };
    return playGround;
}());
var play;
document.onkeydown = function (event) {
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
};
window.onload = function () {
    var canvas = document.createElement("canvas");
    canvas.id = "play-ground";
    document.body.appendChild(canvas);
    play = new playGround(canvas);
    play.start();
};
//# sourceMappingURL=app.js.map