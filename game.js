class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('gameOverlay');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        
        // 游戏状态
        this.gameState = 'ready'; // ready, playing, paused, gameOver, levelComplete
        this.score = 0;
        this.level = 1;
        
        // 游戏对象
        this.paddle = null;
        this.balls = []; // 支持多个小球
        this.bricks = [];
        this.particles = [];
        this.powerUps = []; // 道具
        
        // 游戏配置
        this.config = {
            paddleWidth: 120,
            paddleHeight: 18,
            ballRadius: 10,
            ballSpeed: 3, // 降低球速
            brickRows: 8, // 增加行数
            brickCols: 16, // 增加列数
            brickWidth: 50, // 减小宽度
            brickHeight: 20, // 减小高度
            brickPadding: 4,
            brickOffsetTop: 60,
            brickOffsetLeft: 30,
            unbreakableBrickChance: 0.1, // 10%概率出现不可破坏砖块
            powerUpChance: 0.15 // 15%概率掉落道具
        };
        
        // 灵敏度设置
        this.sensitivity = 1.0;
        this.sensitivitySlider = null;
        this.sensitivityValue = null;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.createGameObjects();
        this.setupSensitivityControl();
        this.setupEventListeners();
        this.showOverlay('准备开始', '点击开始游戏');
    }
    
    setupCanvas() {
        // 设置画布大小为容器的可用空间
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // 设置更大的画布尺寸，几乎填满容器
        this.canvas.width = Math.min(rect.width - 20, 1400);
        this.canvas.height = Math.min(rect.height - 20, 800);
    }
    
    createGameObjects() {
        // 创建挡板
        this.paddle = {
            x: this.canvas.width / 2 - this.config.paddleWidth / 2,
            y: this.canvas.height - 30,
            width: this.config.paddleWidth,
            height: this.config.paddleHeight,
            speed: 8,
            color: '#4CAF50',
            originalWidth: this.config.paddleWidth
        };
        
        // 创建初始球
        this.balls = [{
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            radius: this.config.ballRadius,
            dx: this.config.ballSpeed,
            dy: -this.config.ballSpeed,
            color: '#FF5722',
            trail: []
        }];
        
        // 清空道具
        this.powerUps = [];
        
        // 创建砖块
        this.createBricks();
    }
    
    createBricks() {
        this.bricks = [];
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        const unbreakableColor = '#333333';
        
        // 计算砖块总宽度
        const totalBrickWidth = this.config.brickCols * (this.config.brickWidth + this.config.brickPadding) - this.config.brickPadding;
        
        // 计算居中偏移量
        const offsetX = (this.canvas.width - totalBrickWidth) / 2;
        
        // 随机生成砖块位置模式
        const pattern = Math.floor(Math.random() * 4);
        
        // 先生成所有砖块（暂时都是普通砖块）
        const brickPositions = [];
        
        for (let r = 0; r < this.config.brickRows; r++) {
            this.bricks[r] = [];
            for (let c = 0; c < this.config.brickCols; c++) {
                // 根据模式决定是否放置砖块
                let shouldPlace = true;
                if (pattern === 1 && (r + c) % 3 === 0) shouldPlace = false;
                if (pattern === 2 && r % 2 === 0 && c % 2 === 0) shouldPlace = false;
                if (pattern === 3 && Math.random() < 0.2) shouldPlace = false;
                
                if (!shouldPlace) {
                    this.bricks[r][c] = null;
                    continue;
                }
                
                const brickX = c * (this.config.brickWidth + this.config.brickPadding) + offsetX;
                const brickY = r * (this.config.brickHeight + this.config.brickPadding) + this.config.brickOffsetTop;
                
                this.bricks[r][c] = {
                    x: brickX,
                    y: brickY,
                    width: this.config.brickWidth,
                    height: this.config.brickHeight,
                    status: 1, // 先设为普通砖块
                    color: colors[r % colors.length],
                    points: (this.config.brickRows - r) * 10,
                    isUnbreakable: false
                };
                
                // 记录砖块位置
                brickPositions.push({ r, c });
            }
        }
        
        // 计算允许的不可破坏砖块数量（不超过总数的10%）
        const maxUnbreakable = Math.floor(brickPositions.length * 0.1);
        
        // 随机选择砖块设为不可破坏
        for (let i = 0; i < maxUnbreakable; i++) {
            if (brickPositions.length === 0) break;
            
            const randomIndex = Math.floor(Math.random() * brickPositions.length);
            const { r, c } = brickPositions.splice(randomIndex, 1)[0];
            
            if (this.bricks[r][c]) {
                this.bricks[r][c].status = 2; // 设为不可破坏
                this.bricks[r][c].color = unbreakableColor;
                this.bricks[r][c].isUnbreakable = true;
            }
        }
    }
    
    setupSensitivityControl() {
        this.sensitivitySlider = document.getElementById('sensitivitySlider');
        this.sensitivityValue = document.getElementById('sensitivityValue');
        
        this.sensitivitySlider.addEventListener('input', (e) => {
            this.sensitivity = parseFloat(e.target.value);
            this.sensitivityValue.textContent = this.sensitivity.toFixed(1);
        });
    }
    
    setupEventListeners() {
        // 鼠标控制
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameState === 'playing') {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const targetX = mouseX - this.paddle.width / 2;
                
                // 使用灵敏度调节移动速度
                const diff = targetX - this.paddle.x;
                this.paddle.x += diff * this.sensitivity * 0.15; // 降低基础移动速度
                
                // 限制挡板在画布内
                if (this.paddle.x < 0) this.paddle.x = 0;
                if (this.paddle.x + this.paddle.width > this.canvas.width) {
                    this.paddle.x = this.canvas.width - this.paddle.width;
                }
            }
        });
        
        // 触摸控制
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.gameState === 'playing') {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const touchX = touch.clientX - rect.left;
                const targetX = touchX - this.paddle.width / 2;
                
                // 使用灵敏度调节移动速度
                const diff = targetX - this.paddle.x;
                this.paddle.x += diff * this.sensitivity * 0.15; // 降低基础移动速度
                
                if (this.paddle.x < 0) this.paddle.x = 0;
                if (this.paddle.x + this.paddle.width > this.canvas.width) {
                    this.paddle.x = this.canvas.width - this.paddle.width;
                }
            }
        });
        
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            }
        });
        
        // 按钮控制
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        
        // 窗口大小调整监听
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    startGame() {
        // 如果游戏结束，先重置游戏
        if (this.gameState === 'gameOver') {
            this.restartGame();
            return;
        }
        
        this.gameState = 'playing';
        this.hideOverlay();
        this.gameLoop();
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showOverlay('游戏暂停', '按空格键继续');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hideOverlay();
            this.gameLoop();
        }
    }
    
    restartGame() {
        this.score = 0;
        this.level = 1;
        this.updateScore();
        this.createGameObjects();
        this.gameState = 'ready';
        this.showOverlay('准备开始', '点击开始游戏');
    }
    
    handleResize() {
        // 保存当前游戏状态
        const wasPlaying = this.gameState === 'playing';
        
        // 重新设置画布大小
        this.setupCanvas();
        
        // 重新创建游戏对象以适应新尺寸
        this.createGameObjects();
        
        // 如果之前在游戏，暂停游戏
        if (wasPlaying) {
            this.gameState = 'paused';
            this.showOverlay('窗口大小已调整', '点击继续游戏');
        }
    }
    
    gameLoop() {
        if (this.gameState !== 'playing') return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // 更新所有小球的位置
        this.balls = this.balls.filter(ball => {
            ball.x += ball.dx;
            ball.y += ball.dy;
            
            // 添加球的轨迹
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 10) {
                ball.trail.shift();
            }
            
            // 墙壁碰撞检测
            if (ball.x + ball.radius > this.canvas.width || ball.x - ball.radius < 0) {
                ball.dx = -ball.dx;
            }
            if (ball.y - ball.radius < 0) {
                ball.dy = -ball.dy;
            }
            
            // 底部边界检测
            if (ball.y - ball.radius > this.canvas.height) {
                return false; // 移除这个球
            }
            
            // 挡板碰撞检测
            this.checkPaddleCollision(ball);
            
            // 砖块碰撞检测
            this.checkBrickCollisions(ball);
            
            return true;
        });
        
        // 检查是否所有球都消失了
        if (this.balls.length === 0) {
            this.gameOver();
            return;
        }
        
        // 更新道具
        this.updatePowerUps();
        
        // 更新粒子效果
        this.updateParticles();
        
        // 检查关卡完成
        if (this.checkLevelComplete()) {
            this.levelComplete();
        }
    }
    
    checkPaddleCollision(ball) {
        if (ball.x > this.paddle.x && 
            ball.x < this.paddle.x + this.paddle.width &&
            ball.y + ball.radius > this.paddle.y &&
            ball.y - ball.radius < this.paddle.y + this.paddle.height) {
            
            ball.dy = -ball.dy;
            
            // 根据球击中挡板的位置调整角度
            const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
            ball.dx = 8 * (hitPos - 0.5);
        }
    }
    
    checkBrickCollisions(ball) {
        for (let r = 0; r < this.config.brickRows; r++) {
            for (let c = 0; c < this.config.brickCols; c++) {
                const brick = this.bricks[r][c];
                if (!brick) continue;
                
                if (brick.status === 1) {
                    if (ball.x > brick.x && 
                        ball.x < brick.x + brick.width &&
                        ball.y > brick.y && 
                        ball.y < brick.y + brick.height) {
                        
                        ball.dy = -ball.dy;
                        brick.status = 0;
                        this.score += brick.points;
                        this.updateScore();
                        
                        // 创建粒子效果
                        this.createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
                        
                        // 随机掉落道具
                        if (Math.random() < this.config.powerUpChance) {
                            this.spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                        }
                    }
                } else if (brick.status === 2) {
                    // 不可破坏砖块
                    if (ball.x > brick.x && 
                        ball.x < brick.x + brick.width &&
                        ball.y > brick.y && 
                        ball.y < brick.y + brick.height) {
                        
                        ball.dy = -ball.dy;
                        // 不破坏砖块，只是反弹
                    }
                }
            }
        }
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                dx: (Math.random() - 0.5) * 4,
                dy: (Math.random() - 0.5) * 4,
                radius: Math.random() * 3 + 1,
                color: color,
                life: 1
            });
        }
    }
    
    spawnPowerUp(x, y) {
        const types = ['extraBall', 'widenPaddle'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x: x,
            y: y,
            type: type,
            radius: 12,
            dy: 2, // 下落速度
            color: type === 'extraBall' ? '#FFD700' : '#4CAF50',
            spawnX: x, // 记录生成位置
            spawnY: y
        });
    }
    
    updatePowerUps() {
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.y += powerUp.dy;
            
            // 检查与挡板的碰撞
            if (powerUp.x > this.paddle.x && 
                powerUp.x < this.paddle.x + this.paddle.width &&
                powerUp.y + powerUp.radius > this.paddle.y &&
                powerUp.y - powerUp.radius < this.paddle.y + this.paddle.height) {
                
                this.applyPowerUp(powerUp);
                return false; // 移除道具
            }
            
            // 检查是否掉出屏幕
            if (powerUp.y - powerUp.radius > this.canvas.height) {
                return false;
            }
            
            return true;
        });
    }
    
    applyPowerUp(powerUp) {
        if (powerUp.type === 'extraBall') {
            // 添加额外的小球，出现在道具生成位置
            const newBall = {
                x: powerUp.spawnX,
                y: powerUp.spawnY,
                radius: this.config.ballRadius,
                dx: (Math.random() - 0.5) * 6,
                dy: -this.config.ballSpeed,
                color: '#FF5722',
                trail: []
            };
            this.balls.push(newBall);
        } else if (powerUp.type === 'widenPaddle') {
            // 加宽挡板
            this.paddle.width = Math.min(this.paddle.width + 30, this.canvas.width / 2);
        }
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.life -= 0.02;
            particle.radius *= 0.98;
            return particle.life > 0;
        });
    }
    
    checkLevelComplete() {
        for (let r = 0; r < this.config.brickRows; r++) {
            for (let c = 0; c < this.config.brickCols; c++) {
                const brick = this.bricks[r][c];
                if (brick && brick.status === 1) {
                    return false;
                }
            }
        }
        return true;
    }
    
    levelComplete() {
        this.level++;
        this.updateScore();
        this.config.ballSpeed += 0.5;
        
        // 重置小球数量为1
        this.balls = [{
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            radius: this.config.ballRadius,
            dx: this.config.ballSpeed,
            dy: -this.config.ballSpeed,
            color: '#FF5722',
            trail: []
        }];
        
        // 重置挡板宽度
        this.paddle.width = this.paddle.originalWidth;
        
        // 清空道具
        this.powerUps = [];
        
        this.createBricks();
        this.showOverlay(`关卡 ${this.level - 1} 完成！`, '点击继续');
        this.gameState = 'ready';
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.showOverlay('游戏结束', `最终得分: ${this.score}`);
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制所有球的轨迹和球
        this.balls.forEach(ball => {
            // 绘制球的轨迹
            ball.trail.forEach((point, index) => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, ball.radius * (index / 10), 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 87, 34, ${index / 20})`;
                this.ctx.fill();
            });
            
            // 绘制球
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = ball.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        
        // 绘制挡板
        this.ctx.fillStyle = this.paddle.color;
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        
        // 绘制砖块
        for (let r = 0; r < this.config.brickRows; r++) {
            for (let c = 0; c < this.config.brickCols; c++) {
                const brick = this.bricks[r][c];
                if (!brick) continue;
                
                if (brick.status === 1 || brick.status === 2) {
                    this.ctx.fillStyle = brick.color;
                    this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                    this.ctx.strokeStyle = brick.status === 2 ? '#FFD700' : '#fff'; // 不可破坏砖块用金色边框
                    this.ctx.lineWidth = brick.status === 2 ? 2 : 1;
                    this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
                    
                    // 不可破坏砖块添加特殊标记
                    if (brick.status === 2) {
                        this.ctx.fillStyle = '#FFD700';
                        this.ctx.font = '12px Arial';
                        this.ctx.fillText('★', brick.x + brick.width / 2 - 6, brick.y + brick.height / 2 + 4);
                    }
                }
            }
        }
        
        // 绘制道具
        this.powerUps.forEach(powerUp => {
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = powerUp.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // 绘制道具图标
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            const icon = powerUp.type === 'extraBall' ? '●' : '═';
            this.ctx.fillText(icon, powerUp.x - 4, powerUp.y + 5);
        });
        
        // 绘制粒子效果
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255).toString(16).padStart(2, '0')}`;
            this.ctx.fill();
        });
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
    }
    
    showOverlay(title, message) {
        document.getElementById('overlayTitle').textContent = title;
        document.getElementById('overlayMessage').textContent = message;
        this.overlay.classList.remove('hidden');
        
        if (this.gameState === 'gameOver') {
            document.getElementById('startBtn').textContent = '重新开始';
        } else if (this.gameState === 'ready' && this.level > 1) {
            document.getElementById('startBtn').textContent = '继续游戏';
        } else {
            document.getElementById('startBtn').textContent = '开始游戏';
        }
    }
    
    hideOverlay() {
        this.overlay.classList.add('hidden');
    }
}

// 游戏初始化
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
