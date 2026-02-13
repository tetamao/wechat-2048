Page({
  data: {
    grid: [],
    score: 0,
    bestScore: 0,
    startX: 0,
    startY: 0,
    gameOver: false,
    gameWin: false, // 触发胜利状态（用于显示结算层）
    hasWon: false,  // 记录本局是否已经达成过 2048
    motivation: '',
    isContinuing: false, // 记录玩家是否选择了“挑战极限”继续游戏
  },

  onLoad() {
    this.initAudio();
    const savedBest = wx.getStorageSync('bestScore') || 0;
    this.setData({
      bestScore: savedBest
    });
    this.initGame();
  },

  // ------------------- 音效管理 -------------------
  initAudio() {
    if (this.moveAudio) return;
    
    this.moveAudio = wx.createInnerAudioContext();
    this.moveAudio.src = '/assets/move.mp3';
    this.moveAudio.useWebAudioImplement = true;

    this.mergeAudio = wx.createInnerAudioContext();
    this.mergeAudio.src = '/assets/merge.mp3';
    this.mergeAudio.useWebAudioImplement = true;

    // 增加：胜利庆祝音效
    this.winAudio = wx.createInnerAudioContext();
    this.winAudio.src = '/assets/victory.mp3'; 
    this.winAudio.useWebAudioImplement = true;

    const errorCallback = (res) => {
      console.error('音频播放错误', res);
      this.reInitAudio();
    };
    this.moveAudio.onError(errorCallback);
    this.mergeAudio.onError(errorCallback);
    this.winAudio.onError(errorCallback);
  },

  reInitAudio() {
    if (this.moveAudio) this.moveAudio.destroy();
    if (this.mergeAudio) this.mergeAudio.destroy();
    if (this.winAudio) this.winAudio.destroy();
    this.moveAudio = null;
    this.initAudio();
  },

  playSound(type) {
    let audio;
    if (type === 'move') audio = this.moveAudio;
    else if (type === 'merge') audio = this.mergeAudio;
    else if (type === 'win') audio = this.winAudio;

    if (!audio) return;
    audio.stop();
    audio.seek(0);
    audio.play();
  },

  onUnload() {
    if (this.moveAudio) this.moveAudio.destroy();
    if (this.mergeAudio) this.mergeAudio.destroy();
    if (this.winAudio) this.winAudio.destroy();
  },

  // ------------------- 游戏核心逻辑 -------------------
  initGame() {
    let grid = Array(4).fill(0).map(() => Array(4).fill(0));
    this.addRandomTile(grid);
    this.addRandomTile(grid);
    this.setData({
      grid,
      score: 0,
      gameOver: false,
      gameWin: false,
      hasWon: false,
      isContinuing: false,
      motivation: ''
    });
  },

  // 点击“挑战极限”：只关闭弹窗，不重置棋盘
  continueGame() {
    this.setData({
      gameWin: false,
      isContinuing: true
    });
  },

  // 显式重置函数（对应结算层的重新开始按钮）
  resetGame() {
    this.initGame();
  },

  addRandomTile(grid) {
    let emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      let { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  },

  touchStart(e) {
    if (this.data.gameOver || this.data.gameWin) return;
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    });
  },

  touchEnd(e) {
    if (this.data.gameOver || this.data.gameWin) return;
    let endX = e.changedTouches[0].clientX;
    let endY = e.changedTouches[0].clientY;
    let dx = endX - this.data.startX;
    let dy = endY - this.data.startY;

    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;

    let direction; // 0: 上, 1: 右, 2: 下, 3: 左
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 1 : 3;
    } else {
      direction = dy > 0 ? 2 : 0;
    }
    this.move(direction);
  },

  getMotivation(score, isWin) {
    if (isWin) return "天才！你已经站在了数字之巅！";
    if (score > 5000) return "离 2048 仅一步之遥，手感热得发烫！";
    if (score > 2000) return "渐入佳境，这把稳了，继续努力！";
    return "生活就像 2048，总有合不上的地方。";
  },

  move(direction) {
    let grid = JSON.parse(JSON.stringify(this.data.grid));
    let score = this.data.score;
    let changed = false;
    let hasMerged = false;

    const rotateTimes = [3, 2, 1, 0][direction];
    for (let i = 0; i < rotateTimes; i++) grid = this.rotate(grid);

    for (let r = 0; r < 4; r++) {
      let oldRow = [...grid[r]];
      let row = grid[r].filter(v => v !== 0);
      for (let c = 0; c < row.length - 1; c++) {
        if (row[c] === row[c + 1]) {
          row[c] *= 2;
          score += row[c];
          row.splice(c + 1, 1);
          changed = true;
          hasMerged = true;
        }
      }
      while (row.length < 4) row.push(0);
      grid[r] = row;
      if (JSON.stringify(oldRow) !== JSON.stringify(row)) changed = true;
    }

    const backTimes = (4 - rotateTimes) % 4;
    for (let i = 0; i < backTimes; i++) grid = this.rotate(grid);

    if (changed) {
      // 1. 胜利判定：仅在第一次达到2048且未处于继续模式时弹窗
      if (!this.data.hasWon) {
        const isWin = grid.some(row => row.some(cell => cell === 2048));
        if (isWin) {
          this.playSound('win');
          this.setData({ 
            grid, score, 
            gameWin: true, 
            hasWon: true,
            motivation: this.getMotivation(score, true) 
          });
          return; 
        }
      }

      this.playSound(hasMerged ? 'merge' : 'move');
      this.addRandomTile(grid);

      if (this.isGameOver(grid)) {
        if (score > this.data.bestScore) {
          wx.setStorageSync('bestScore', score);
          this.setData({ bestScore: score });
        }
        this.setData({ 
          grid, score, 
          gameOver: true, 
          motivation: this.getMotivation(score, false) 
        });
      } else {
        this.setData({ grid, score });
      }
    }
  },

  rotate(grid) {
    let newGrid = Array(4).fill(0).map(() => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        newGrid[c][3 - r] = grid[r][c];
      }
    }
    return newGrid;
  },

  isGameOver(grid) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) return false;
        if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
        if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
      }
    }
    return true;
  }
});