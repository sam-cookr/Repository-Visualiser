import { useState, useEffect, useRef, useCallback } from 'react'

// Seeded Random Number Generator (deterministic)
class SeededRandom {
  constructor(seed) {
    this.seed = seed
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

// Particle system for ambient atmosphere
class Particle {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = -Math.random() * 0.3 - 0.2
    this.life = 1
    this.decay = 0.01
    this.size = Math.random() * 2 + 1
    this.color = color
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.life -= this.decay
    return this.life > 0
  }

  draw(ctx) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = `${this.color}${Math.floor(this.life * 128).toString(16).padStart(2, '0')}`
    ctx.fill()
  }
}

// Language to color mapping (neon cyber-botany palette)
const LANGUAGE_COLORS = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#00d4ff',
  Java: '#ff6b6b',
  CSS: '#ff1493',
  HTML: '#e34c26',
  Go: '#00add8',
  Rust: '#ff4500',
  Ruby: '#ff6347',
  PHP: '#a78bfa',
  C: '#00ff00',
  'C++': '#00ff88',
  'C#': '#9b4993',
  Swift: '#ff6600',
  Kotlin: '#7c3aed',
  default: '#00ffaa'
}

// Mock repository data
const MOCK_REPOS = [
  {
    name: 'react',
    fullName: 'facebook/react',
    language: 'JavaScript',
    createdAt: '2013-05-24T16:15:54Z',
    lastPush: '2024-01-15T10:30:00Z',
    commitCount: 15234,
    size: 45000,
  },
  {
    name: 'tensorflow',
    fullName: 'tensorflow/tensorflow',
    language: 'Python',
    createdAt: '2015-11-07T01:19:20Z',
    lastPush: '2024-01-28T14:22:00Z',
    commitCount: 89432,
    size: 125000,
  },
  {
    name: 'linux',
    fullName: 'torvalds/linux',
    language: 'C',
    createdAt: '2011-09-04T22:48:12Z',
    lastPush: '2024-01-29T08:15:00Z',
    commitCount: 1200000,
    size: 850000,
  },
  {
    name: 'abandoned-repo',
    fullName: 'user/abandoned-repo',
    language: 'Ruby',
    createdAt: '2018-03-15T09:20:00Z',
    lastPush: '2020-06-10T11:45:00Z',
    commitCount: 234,
    size: 1200,
  }
]

function App() {
  const canvasRef = useRef(null)
  const offscreenCanvasRef = useRef(null)
  const particlesRef = useRef([])
  const [repoData, setRepoData] = useState(MOCK_REPOS[0])
  const [selectedRepo, setSelectedRepo] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [growthProgress, setGrowthProgress] = useState(0)
  const growthProgressRef = useRef(0)
  const lastRenderedProgressRef = useRef(-1)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const animationRef = useRef(null)
  const particleAnimationRef = useRef(null)

  // Calculate repo health (0-1, based on last commit recency)
  const calculateHealth = (lastPushDate) => {
    const now = new Date()
    const lastPush = new Date(lastPushDate)
    const daysSinceLastPush = (now - lastPush) / (1000 * 60 * 60 * 24)

    if (daysSinceLastPush < 30) return 1.0        // Very active
    if (daysSinceLastPush < 90) return 0.8        // Active
    if (daysSinceLastPush < 180) return 0.6       // Moderately active
    if (daysSinceLastPush < 365) return 0.4       // Stale
    return 0.2                                     // Withered
  }

  // Recursive branch drawing function (particles stored in ref)
  const drawBranch = (ctx, x, y, length, angle, depth, maxDepth, random, color, health, particles) => {
    if (depth > maxDepth || length < 2) return

    // Save canvas state
    ctx.save()

    // Calculate end point
    const endX = x + Math.cos(angle) * length
    const endY = y + Math.sin(angle) * length

    // Line style based on depth and health
    const opacity = Math.max(0.4, health) * (1 - depth / maxDepth * 0.4)
    const lineWidth = Math.max(0.5, (maxDepth - depth + 1) * (health * 0.6 + 0.4))

    // Draw branch with glow
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Glow effect (reduced for performance)
    if (depth < 2) {
      ctx.shadowBlur = 10 * health
      ctx.shadowColor = color
    }
    ctx.stroke()

    // Reset shadow
    ctx.shadowBlur = 0

    // Draw "leaves" at branch tips
    if (depth >= maxDepth - 2 && random.next() > 0.3) {
      const leafSize = 2 + random.next() * 3
      ctx.beginPath()
      ctx.arc(endX, endY, leafSize, 0, Math.PI * 2)

      // Gradient for leaves
      const gradient = ctx.createRadialGradient(endX, endY, 0, endX, endY, leafSize)
      gradient.addColorStop(0, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(1, `${color}20`)
      ctx.fillStyle = gradient
      ctx.fill()

      // Emit particles from leaves occasionally
      if (random.next() > 0.95 && particles) {
        particles.push(new Particle(endX, endY, color))
      }
    }

    ctx.restore()

    // Recursively draw child branches
    const branchCount = depth < 3 ? 2 : (random.next() > 0.4 ? 2 : 3)

    for (let i = 0; i < branchCount; i++) {
      const angleVariation = (random.next() - 0.5) * Math.PI * 0.5
      const newAngle = angle + angleVariation
      const lengthReduction = 0.65 + random.next() * 0.15
      const newLength = length * lengthReduction

      // Add droop effect for unhealthy repos
      const droopFactor = (1 - health) * 0.3
      const adjustedAngle = newAngle + droopFactor

      drawBranch(
        ctx,
        endX,
        endY,
        newLength,
        adjustedAngle,
        depth + 1,
        maxDepth,
        random,
        color,
        health,
        particles
      )
    }
  }

  // Main tree drawing function (draws to offscreen canvas)
  const drawTree = useCallback((canvas, data, progress = 1, particles = []) => {
    const ctx = canvas.getContext('2d', { alpha: false })
    const width = canvas.width
    const height = canvas.height

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
    bgGradient.addColorStop(0, '#000000')
    bgGradient.addColorStop(1, '#0a0a0f')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Draw subtle grid
    ctx.strokeStyle = '#ffffff08'
    ctx.lineWidth = 1
    for (let i = 0; i < width; i += 100) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, height)
      ctx.stroke()
    }
    for (let i = 0; i < height; i += 100) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(width, i)
      ctx.stroke()
    }

    // Create seeded random generator
    const seed = data.fullName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const random = new SeededRandom(seed)

    // Calculate tree parameters from repo data
    const health = calculateHealth(data.lastPush)
    const color = LANGUAGE_COLORS[data.language] || LANGUAGE_COLORS.default

    // Map commit count to recursion depth (4-10, reduced for performance)
    const maxDepth = Math.min(10, Math.max(4, Math.floor(Math.log10(data.commitCount + 1) * 1.6)))

    // Map repo size to initial trunk length
    const baseTrunkLength = Math.min(180, 100 + Math.log10(data.size + 1) * 18)
    const trunkLength = baseTrunkLength * progress

    // Starting position (bottom center, offset for sidebar)
    const startX = width / 2 + 150
    const startY = height - 80
    const startAngle = -Math.PI / 2 // Pointing upward

    // Draw the tree
    if (progress > 0) {
      drawBranch(
        ctx,
        startX,
        startY,
        trunkLength,
        startAngle,
        0,
        maxDepth,
        random,
        color,
        health,
        particles
      )
    }

    // Draw ground glow
    const groundGradient = ctx.createLinearGradient(0, height - 80, 0, height)
    groundGradient.addColorStop(0, `${color}40`)
    groundGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = groundGradient
    ctx.fillRect(0, height - 80, width, 80)

    // Draw ground line
    ctx.beginPath()
    ctx.moveTo(0, height - 80)
    ctx.lineTo(width, height - 80)
    ctx.strokeStyle = `${color}60`
    ctx.lineWidth = 1
    ctx.shadowBlur = 10
    ctx.shadowColor = color
    ctx.stroke()
    ctx.shadowBlur = 0
  }, [])

  // Composite render function (tree + particles)
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current
    if (!canvas || !offscreen) return

    const ctx = canvas.getContext('2d', { alpha: false })

    // Copy offscreen tree to main canvas
    ctx.drawImage(offscreen, 0, 0)

    // Draw particles on top
    ctx.globalCompositeOperation = 'lighter'
    particlesRef.current.forEach(particle => {
      particle.draw(ctx)
    })
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return

    const duration = 2000 // 2 seconds
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)

      // Ease-out curve
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setGrowthProgress(easedProgress)
      growthProgressRef.current = easedProgress

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating])

  // Particle animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !offscreenCanvasRef.current) return

    const animateParticles = () => {
      const currentProgress = growthProgressRef.current

      // Only redraw tree to offscreen canvas if progress changed significantly
      if (Math.abs(currentProgress - lastRenderedProgressRef.current) > 0.01) {
        drawTree(offscreenCanvasRef.current, repoData, currentProgress, particlesRef.current)
        lastRenderedProgressRef.current = currentProgress
      }

      // Update and filter particles
      particlesRef.current = particlesRef.current.filter(p => p.update())

      // Composite render (cheap operation)
      renderFrame()

      particleAnimationRef.current = requestAnimationFrame(animateParticles)
    }

    // Cancel any existing animation before starting new one
    if (particleAnimationRef.current) {
      cancelAnimationFrame(particleAnimationRef.current)
    }

    animateParticles()

    return () => {
      if (particleAnimationRef.current) {
        cancelAnimationFrame(particleAnimationRef.current)
      }
    }
  }, [repoData, drawTree, renderFrame])

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Create offscreen canvas
    offscreenCanvasRef.current = document.createElement('canvas')
    offscreenCanvasRef.current.width = window.innerWidth
    offscreenCanvasRef.current.height = window.innerHeight
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      const offscreen = offscreenCanvasRef.current
      if (!canvas || !offscreen) return

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      offscreen.width = window.innerWidth
      offscreen.height = window.innerHeight

      // Force redraw of tree to offscreen canvas
      lastRenderedProgressRef.current = -1
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load a new repository
  const loadRepo = (index) => {
    setSelectedRepo(index)
    setRepoData(MOCK_REPOS[index])
    setGrowthProgress(0)
    growthProgressRef.current = 0
    lastRenderedProgressRef.current = -1 // Force redraw
    particlesRef.current = [] // Clear particles when switching repos
    setIsAnimating(true)
  }

  // Initial animation
  useEffect(() => {
    growthProgressRef.current = 0
    setIsAnimating(true)
  }, [])

  const health = calculateHealth(repoData.lastPush)
  const healthLabel = health > 0.8 ? 'Thriving' : health > 0.6 ? 'Active' : health > 0.4 ? 'Dormant' : 'Withered'
  const color = LANGUAGE_COLORS[repoData.language] || LANGUAGE_COLORS.default

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />

      {/* Left Sidebar */}
      <div
        className={`absolute top-0 left-0 h-full z-10 transition-all duration-500 ease-in-out ${
          sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="h-full w-80 bg-gradient-to-br from-black/95 via-black/90 to-transparent backdrop-blur-2xl border-r border-white/5">
          {/* Header */}
          <div className="p-8 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
              />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Repo Biome
              </h1>
            </div>
            <p className="text-white/40 text-xs font-medium tracking-wide uppercase">
              Fractal Data Visualization
            </p>
          </div>

          {/* Current Repo Display */}
          <div className="p-8 border-b border-white/5">
            <div className="mb-4">
              <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">
                Current Repository
              </div>
              <div className="text-white text-lg font-mono font-semibold">
                {repoData.fullName}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Language */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="text-white/40 text-xs mb-1">Language</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="text-white text-sm font-medium">{repoData.language}</span>
                </div>
              </div>

              {/* Health */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="text-white/40 text-xs mb-1">Health</div>
                <div className="text-white text-sm font-medium">{healthLabel}</div>
                <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${health * 100}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 10px ${color}`
                    }}
                  />
                </div>
              </div>

              {/* Commits */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="text-white/40 text-xs mb-1">Commits</div>
                <div className="text-white text-sm font-mono font-medium">
                  {repoData.commitCount.toLocaleString()}
                </div>
              </div>

              {/* Last Push */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="text-white/40 text-xs mb-1">Last Push</div>
                <div className="text-white text-xs font-medium">
                  {new Date(repoData.lastPush).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Repository Selector */}
          <div className="p-8">
            <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-4">
              Explore Repositories
            </div>
            <div className="space-y-2">
              {MOCK_REPOS.map((repo, index) => {
                const repoHealth = calculateHealth(repo.lastPush)
                const repoColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.default
                const isSelected = selectedRepo === index

                return (
                  <button
                    key={repo.fullName}
                    onClick={() => loadRepo(index)}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-300 border ${
                      isSelected
                        ? 'bg-white/10 border-white/20 shadow-lg'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono text-sm text-white font-medium">
                        {repo.fullName}
                      </div>
                      <div
                        className="w-2 h-2 rounded-full mt-1"
                        style={{ backgroundColor: repoColor, boxShadow: `0 0 8px ${repoColor}` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>{repo.language}</span>
                      <span>•</span>
                      <span>{(repoHealth * 100).toFixed(0)}% health</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5">
            <div className="text-white/30 text-xs text-center">
              v1.0 • Deterministic Generation
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute top-6 left-6 z-20 w-10 h-10 rounded-lg bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
        style={{ transform: sidebarCollapsed ? 'translateX(0)' : 'translateX(304px)' }}
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Info Overlay (Top Right) */}
      <div className="absolute top-6 right-6 z-10 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="text-white/40 text-xs">FPS</div>
          <div className="w-px h-4 bg-white/20" />
          <div className="text-white text-xs font-mono">60</div>
          <div className="w-px h-4 bg-white/20" />
          <div className="text-white/40 text-xs">Particles</div>
          <div className="text-white text-xs font-mono">{particlesRef.current.length}</div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isAnimating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            <span className="text-white text-sm font-medium">
              Growing tree... {Math.round(growthProgress * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
