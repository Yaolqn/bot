# Many Bricks Breaker

一个经典的打砖块游戏，使用纯前端技术构建，可以部署到Vercel。

## 游戏特性

- 🎮 经典打砖块玩法
- 🎨 精美的视觉效果和粒子动画
- 📱 响应式设计，支持移动设备
- 🎯 多关卡系统，难度递增
- ⌨️ 键盘和鼠标控制
- 🏆 得分系统

## 游戏控制

- **鼠标移动**: 控制挡板左右移动
- **触摸滑动**: 移动设备上控制挡板
- **空格键**: 暂停/继续游戏

## 技术栈

- HTML5 Canvas
- 原生JavaScript (ES6+)
- CSS3 动画和渐变
- 响应式设计

## 本地运行

1. 克隆或下载项目文件
2. 在浏览器中打开 `index.html`
3. 开始游戏！

## 部署到Vercel

1. 将项目推送到GitHub仓库
2. 在Vercel中导入项目
3. 自动部署完成

或者使用Vercel CLI:

```bash
npm install -g vercel
vercel --prod
```

## 项目结构

```
├── index.html      # 主页面
├── style.css       # 样式文件
├── game.js         # 游戏逻辑
├── vercel.json     # Vercel部署配置
└── README.md       # 项目说明
```

## 游戏规则

1. 移动挡板接住弹跳的小球
2. 小球击碎所有砖块即可过关
3. 小球掉落到底部则游戏结束
4. 每过一关球速会增加
5. 不同颜色砖块分值不同

## 自定义配置

可以在 `game.js` 中的 `config` 对象修改游戏参数：

- `paddleWidth`: 挡板宽度
- `ballSpeed`: 球速
- `brickRows`: 砖块行数
- `brickCols`: 砖块列数

## 许可证

MIT License
