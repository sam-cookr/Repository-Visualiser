# 🌳 Repository Biome

**A fractal data visualization that transforms repository metrics into living, breathing digital trees.**

Repository Biome is an interactive visualization tool that represents GitHub repositories as organic, fractal tree structures. Each tree's appearance is uniquely determined by the repository's characteristics—commit history, size, activity, and programming language—creating a beautiful, data-driven botanical garden of code.

---

## ✨ Features

### 🎨 **Data-Driven Visualization**
- **Fractal Complexity**: Tree depth and branch count reflect commit history
- **Organic Growth**: Repository size determines trunk length and overall scale
- **Health Indicators**: Activity recency affects tree vitality and visual appearance
- **Language Colors**: Each programming language has a unique neon color palette

### 🚀 **Performance Optimized**
- **Offscreen Canvas Caching**: Trees are rendered once and cached for smooth 60 FPS animation
- **Smart Redraw Logic**: Only redraws when necessary, reducing CPU/GPU usage
- **Optimized Recursion**: Intelligent depth limiting prevents exponential complexity
- **Particle System**: Ambient atmosphere with efficient particle rendering

### 🎯 **Interactive Experience**
- **Smooth Animations**: Organic tree growth with ease-out curves
- **Multiple Repositories**: Switch between different repos and watch new trees grow
- **Responsive Design**: Adapts to any screen size
- **Collapsible Sidebar**: Clean, minimal interface with smooth transitions

### 🎭 **Visual Effects**
- **Deterministic Generation**: Same repository always produces the same tree
- **Glow Effects**: Neon-cyber aesthetic with dynamic shadows
- **Particle Effects**: Ambient particles emit from tree leaves
- **Gradient Backgrounds**: Subtle atmospheric gradients and grid overlays

---

## 🛠️ Tech Stack

- **React** - Component-based UI framework
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first styling framework
- **Canvas API** - High-performance 2D graphics rendering
- **JavaScript** - Seeded random generation and animation logic

---

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/sam-cookr/Repository-Visualiser.git
cd Repository-Visualiser

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🎮 Usage

1. **Launch the app**: Start the development server and open in your browser
2. **Explore repositories**: Click on different repositories in the sidebar
3. **Watch trees grow**: Each tree animates from the ground up over 2 seconds
4. **Observe characteristics**:
   - Larger trees = bigger repositories
   - More complex branching = more commits
   - Vibrant colors = recently active
   - Withered appearance = abandoned repos

---

## 🌲 How It Works

### Tree Generation Algorithm

The visualization uses a **recursive fractal algorithm** with deterministic randomness:

#### 1. **Seeded Random Generation**
```javascript
class SeededRandom {
  constructor(seed) {
    this.seed = seed
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}
```
- Repository name is hashed to create a unique seed
- Same repository always generates identical tree structure

#### 2. **Recursive Branch Drawing**
- **Base case**: Stops at max depth or minimum branch length
- **Branching factor**: 2-3 child branches per parent
- **Angle variation**: Random angles create organic appearance
- **Length reduction**: Each level is 65-80% of parent length

#### 3. **Data Mapping**

| Repository Metric | Tree Characteristic | Formula |
|------------------|---------------------|---------|
| Commit Count | Recursion Depth | `min(10, max(4, log10(commits) * 1.6))` |
| Repository Size | Trunk Length | `min(180, 100 + log10(size) * 18)` |
| Last Push Date | Health (0-1) | Exponential decay over time |
| Language | Color | Predefined neon palette |

#### 4. **Health Calculation**

```javascript
const calculateHealth = (lastPushDate) => {
  const daysSinceLastPush = (now - lastPush) / (1000 * 60 * 60 * 24)

  if (daysSinceLastPush < 30)  return 1.0  // Thriving
  if (daysSinceLastPush < 90)  return 0.8  // Active
  if (daysSinceLastPush < 180) return 0.6  // Moderate
  if (daysSinceLastPush < 365) return 0.4  // Dormant
  return 0.2                                // Withered
}
```

---

## ⚡ Performance Optimizations

### Offscreen Canvas Caching
The tree structure is rendered to an **offscreen canvas** and cached. The main canvas only copies this cached image and draws particles on top:

- **Before**: 60 full tree redraws per second = ~7,200 during animation
- **After**: ~100 tree redraws during entire 2-second animation

### Smart Redraw Logic
```javascript
// Only redraw tree if progress changed by >1%
if (Math.abs(currentProgress - lastRenderedProgress) > 0.01) {
  drawTree(offscreenCanvas, repoData, currentProgress)
  lastRenderedProgress = currentProgress
}
```

### Reduced Shadow Effects
Shadow blur is **expensive** in Canvas API:
- Only applied to trunk and primary branches (depth < 2)
- Reduces shadow operations by ~90%

### Recursion Depth Limiting
- Capped at depth 10 (down from 12)
- **3^10 = 59,049** max branches vs **3^12 = 531,441**
- ~90% reduction in worst-case complexity

---

## 🎨 Language Color Palette

```javascript
JavaScript → #f7df1e  TypeScript → #3178c6
Python     → #00d4ff  Java       → #ff6b6b
CSS        → #ff1493  HTML       → #e34c26
Go         → #00add8  Rust       → #ff4500
Ruby       → #ff6347  PHP        → #a78bfa
C          → #00ff00  C++        → #00ff88
C#         → #9b4993  Swift      → #ff6600
Kotlin     → #7c3aed  Default    → #00ffaa
```

---

## 🔮 Future Enhancements

- [ ] **GitHub API Integration**: Connect to real GitHub repositories
- [ ] **Custom Data Sources**: Support GitLab, Bitbucket, local repos
- [ ] **Advanced Metrics**: Incorporate contributor count, issue activity, PR velocity
- [ ] **3D Visualization**: WebGL-based three-dimensional trees
- [ ] **Export Options**: Save trees as PNG/SVG/video
- [ ] **Comparison Mode**: View multiple trees side-by-side
- [ ] **Animation Controls**: Pause, replay, adjust speed
- [ ] **Color Themes**: Multiple visual styles and palettes
- [ ] **Historical View**: Animate tree growth over time
- [ ] **Interactive Branches**: Click branches to explore specific commits

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Test performance impact of visual changes
- Update README if adding new features
- Keep commits focused and descriptive

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- Inspired by fractal geometry and organic growth patterns
- Built with assistance from Claude Sonnet 4.5
- Color palette influenced by cyberpunk aesthetics

---

## 📸 Screenshots

> Add screenshots here once deployed

---

## 🐛 Known Issues

- None currently reported

**Found a bug?** [Open an issue](https://github.com/sam-cookr/Repository-Visualiser/issues)

---

## 📞 Contact

**Sam Cook** - [@sam-cookr](https://github.com/sam-cookr)

**Project Link**: [https://github.com/sam-cookr/Repository-Visualiser](https://github.com/sam-cookr/Repository-Visualiser)

---

<div align="center">

**Made with 💚 and fractal mathematics**

⭐ **Star this repo if you find it interesting!** ⭐

</div>
