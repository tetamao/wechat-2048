Page({
  data: {
    grid: [],
    score: 0,
    bestScore: 0, // 新增：最高分变量
    startX: 0,
    startY: 0,
    gameOver: false
  },

  onLoad() {
    // 游戏启动时，先从手机存储中读取最高分
    const savedBest = wx.getStorageSync('bestScore') || 0;
    this.setData({
      bestScore: savedBest
    });
    this.initGame();
  },

  initGame() {
    let grid = Array(4).fill(0).map(() => Array(4).fill(0));
    this.addRandomTile(grid);
    this.addRandomTile(grid);
    this.setData({ grid, score: 0 , gameOver: false});
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

  // 记录手指按下位置
  touchStart(e) {
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    });
  },

  // 记录手指离开位置并计算方向
  touchEnd(e) {
    if (this.data.gameOver) return;
    let endX = e.changedTouches[0].clientX;
    let endY = e.changedTouches[0].clientY;
    let dx = endX - this.data.startX;
    let dy = endY - this.data.startY;

    // 滑动距离太短则忽略
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    let direction; // 0: 上, 1: 右, 2: 下, 3: 左
    if (Math.abs(dx) > Math.abs(dy)) {
      // 左右滑动
      direction = dx > 0 ? 1 : 3;
    } else {
      direction = dy > 0 ? 2 : 0;
    }
    this.move(direction);
  },

  // 移动逻辑总入口
  // 移动逻辑总入口
move(direction) {
  let grid = JSON.parse(JSON.stringify(this.data.grid));
  let score = this.data.score;
  let changed = false;

  // 0:上, 1:右, 2:下, 3:左
  // 目标是把所有方向旋转到“向左滑动”
  // 上旋转到左：逆时针90度（即顺时针270度 = 3次）
  // 右旋转到左：顺时针180度（2次）
  // 下旋转到左：顺时针90度（1次）
  // 左旋转到左：0次

  
  const rotateTimes = [3, 2, 1, 0][direction]; 
  for (let i = 0; i < rotateTimes; i++) grid = this.rotate(grid);

  // 第二步：执行向左合并逻辑
  for (let r = 0; r < 4; r++) {
    let oldRow = [...grid[r]];
    // 1. 挤掉所有的 0 (例如 [2, 0, 2, 0] -> [2, 2])
    let row = grid[r].filter(v => v !== 0);
    
    // 2. 合并相同数字 (例如 [2, 2] -> [4])
    for (let c = 0; c < row.length - 1; c++) {
      if (row[c] === row[c + 1]) {
        row[c] *= 2;
        score += row[c];
        row.splice(c + 1, 1); // 删掉被合并的那个
        changed = true;
      }
    }
    
    // 3. 末尾补齐 0 (例如 [4] -> [4, 0, 0, 0])
    while (row.length < 4) row.push(0);
    
    grid[r] = row;
    // 判断这一行是否发生了变化
    if (JSON.stringify(oldRow) !== JSON.stringify(row)) changed = true;
  }

  // 第三步：旋转回来
  const backTimes = (4 - rotateTimes) % 4;
  for (let i = 0; i < backTimes; i++) grid = this.rotate(grid);

  // 第四步：如果棋盘变了，生成新数字并更新界面
  if (changed) {
    this.addRandomTile(grid);
    this.setData({ grid, score });
    
    if (this.isGameOver(grid)) {
      let currentScore = score;
      let currentBest = this.data.bestScore;
      if (currentScore > currentBest) {
        currentBest = currentScore;
        // 同步保存到手机本地存储
        wx.setStorageSync('bestScore', currentBest);
      }
      this.setData({ 
        grid,
        score: currentScore,
        bestScore: currentBest});
     
        if (this.isGameOver(grid)) {
          this.setData({ gameOver: true });
          wx.showModal({
            title: '游戏结束',
            content: `得分：${currentScore}\n最高分：${currentBest}`,
            showCancel: false,
            success: () => this.initGame()
          });
        }
    }
  }
},

// 顺时针旋转 90 度
rotate(grid) {
  let newGrid = Array(4).fill(0).map(() => Array(4).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      newGrid[c][3 - r] = grid[r][c];
    }
  }
  return newGrid;
},



  // 检查是否输了
  isGameOver(grid) {
    // 如果还有空格，没输
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) return false;
      }
    }
    // 如果水平或垂直相邻有相等的，没输
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r][c] === grid[r][c + 1]) return false;
        if (grid[c][r] === grid[c + 1][r]) return false;
      }
    }
    return true;
  }
});