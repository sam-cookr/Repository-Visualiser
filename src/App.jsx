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

// Firefly particle for high-star repos - drifts randomly around tree
class Firefly {
  constructor(x, y, color, bounds) {
    this.x = x
    this.y = y
    this.baseX = x
    this.baseY = y
    this.bounds = bounds // { minX, maxX, minY, maxY }
    this.angle = Math.random() * Math.PI * 2
    this.speed = 0.3 + Math.random() * 0.4
    this.wobble = Math.random() * Math.PI * 2
    this.wobbleSpeed = 0.02 + Math.random() * 0.02
    this.life = 1
    this.decay = 0.002 + Math.random() * 0.002
    this.size = 1.5 + Math.random() * 2
    this.color = color
    this.glowPhase = Math.random() * Math.PI * 2
  }

  update() {
    // Gentle drifting movement
    this.wobble += this.wobbleSpeed
    this.angle += (Math.random() - 0.5) * 0.1

    this.x += Math.cos(this.angle) * this.speed + Math.sin(this.wobble) * 0.3
    this.y += Math.sin(this.angle) * this.speed + Math.cos(this.wobble * 0.7) * 0.2

    // Soft boundary wrapping
    if (this.bounds) {
      if (this.x < this.bounds.minX) this.angle = Math.PI - this.angle
      if (this.x > this.bounds.maxX) this.angle = Math.PI - this.angle
      if (this.y < this.bounds.minY) this.angle = -this.angle
      if (this.y > this.bounds.maxY) this.angle = -this.angle
    }

    this.glowPhase += 0.05
    this.life -= this.decay
    return this.life > 0
  }

  draw(ctx) {
    const glow = 0.5 + 0.5 * Math.sin(this.glowPhase)
    const alpha = this.life * glow

    // Outer glow
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2)
    ctx.fillStyle = `${this.color}${Math.floor(alpha * 40).toString(16).padStart(2, '0')}`
    ctx.fill()

    // Inner bright core
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = `${this.color}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`
    ctx.fill()
  }
}

// Falling leaf particle for unhealthy trees
class FallingLeaf {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.8
    this.vy = 0.3 + Math.random() * 0.5
    this.life = 1
    this.decay = 0.003 + Math.random() * 0.002
    this.size = 2 + Math.random() * 3
    this.color = color
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 0.05
    this.swayPhase = Math.random() * Math.PI * 2
    this.swaySpeed = 0.03 + Math.random() * 0.02
  }

  update() {
    // Gentle swaying descent
    this.swayPhase += this.swaySpeed
    this.x += this.vx + Math.sin(this.swayPhase) * 0.5
    this.y += this.vy
    this.rotation += this.rotationSpeed
    this.life -= this.decay
    return this.life > 0
  }

  draw(ctx) {
    const alpha = this.life * 0.7

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    // Draw petal-shaped leaf
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(this.size * 0.5, -this.size * 0.3, this.size, 0)
    ctx.quadraticCurveTo(this.size * 0.5, this.size * 0.3, 0, 0)

    // Desaturated color for falling leaves
    ctx.fillStyle = `${this.color}${Math.floor(alpha * 150).toString(16).padStart(2, '0')}`
    ctx.fill()

    ctx.restore()
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

// Parse GitHub URL to extract owner and repo name
const parseGitHubUrl = (url) => {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/\s]+)/i, // https://github.com/owner/repo
    /^([^\/\s]+)\/([^\/\s]+)$/,           // owner/repo
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      const owner = match[1]
      let repo = match[2]
      // Remove .git suffix if present
      repo = repo.replace(/\.git$/, '')
      // Remove trailing slash or query params
      repo = repo.split(/[?#]/)[0].replace(/\/$/, '')
      return { owner, repo }
    }
  }
  return null
}

// Fetch repository data from GitHub API
const fetchGitHubRepo = async (owner, repo) => {
  try {
    // Fetch main repo data
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error('Repository not found')
      } else if (repoResponse.status === 403) {
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      throw new Error('Failed to fetch repository')
    }
    const repoData = await repoResponse.json()

    // Fetch commit count (use contributors as proxy since commits endpoint is expensive)
    let commitCount = 100 // Default fallback
    try {
      const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`)
      if (commitsResponse.ok) {
        const linkHeader = commitsResponse.headers.get('Link')
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/)
          if (match) {
            commitCount = parseInt(match[1])
          }
        }
      }
    } catch (e) {
      // Use stargazers as fallback estimate
      commitCount = Math.max(100, repoData.stargazers_count * 2)
    }

    // Calculate age in years
    const createdDate = new Date(repoData.created_at)
    const now = new Date()
    const ageInYears = (now - createdDate) / (1000 * 60 * 60 * 24 * 365.25)

    return {
      name: repoData.name,
      fullName: repoData.full_name,
      language: repoData.language || 'Unknown',
      createdAt: repoData.created_at,
      lastPush: repoData.pushed_at,
      commitCount: commitCount,
      size: repoData.size,
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      age: ageInYears,
      isCustom: true
    }
  } catch (error) {
    throw error
  }
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
    stars: 218000,
    forks: 45800,
    age: 12.7,
  },
  {
    name: 'tensorflow',
    fullName: 'tensorflow/tensorflow',
    language: 'Python',
    createdAt: '2015-11-07T01:19:20Z',
    lastPush: '2024-01-28T14:22:00Z',
    commitCount: 89432,
    size: 125000,
    stars: 180000,
    forks: 89000,
    age: 10.2,
  },
  {
    name: 'linux',
    fullName: 'torvalds/linux',
    language: 'C',
    createdAt: '2011-09-04T22:48:12Z',
    lastPush: '2024-01-29T08:15:00Z',
    commitCount: 1200000,
    size: 850000,
    stars: 165000,
    forks: 52000,
    age: 14.4,
  },
  {
    name: 'abandoned-repo',
    fullName: 'user/abandoned-repo',
    language: 'Ruby',
    createdAt: '2018-03-15T09:20:00Z',
    lastPush: '2020-06-10T11:45:00Z',
    commitCount: 234,
    size: 1200,
    stars: 45,
    forks: 12,
    age: 7.9,
  }
]

// Draw root system based on fork count
const drawRoots = (ctx, x, y, forkCount, color, random, health) => {
  // Calculate number of root tendrils (3-8 based on forks)
  const rootCount = Math.min(8, Math.max(3, Math.floor(Math.log10(forkCount + 1) * 2.5) + 3))
  const maxRootLength = 60 + Math.log10(forkCount + 1) * 20

  ctx.save()

  for (let i = 0; i < rootCount; i++) {
    // Spread roots across bottom, biased toward center
    const spreadFactor = (i / (rootCount - 1) - 0.5) * 2 // -1 to 1
    const baseAngle = Math.PI / 2 + spreadFactor * (Math.PI / 3) // 60-120 degrees down
    const angleVariation = (random.next() - 0.5) * 0.3

    const rootLength = maxRootLength * (0.6 + random.next() * 0.4)
    const opacity = Math.max(0.3, health * 0.7)

    // Draw root with organic curves
    drawRootTendril(ctx, x, y, rootLength, baseAngle + angleVariation, 0, 3, random, color, opacity)
  }

  ctx.restore()
}

// Recursive root tendril drawing
const drawRootTendril = (ctx, x, y, length, angle, depth, maxDepth, random, color, opacity) => {
  if (depth > maxDepth || length < 5) return

  const curvature = (random.next() - 0.5) * length * 0.2
  const midX = x + Math.cos(angle) * length * 0.5 + Math.cos(angle + Math.PI / 2) * curvature
  const midY = y + Math.sin(angle) * length * 0.5 + Math.sin(angle + Math.PI / 2) * curvature
  const endX = x + Math.cos(angle) * length
  const endY = y + Math.sin(angle) * length

  const lineWidth = Math.max(0.5, (maxDepth - depth + 1) * 0.8)

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(midX, midY, endX, endY)
  ctx.strokeStyle = `${color}${Math.floor(opacity * 180 * (1 - depth / maxDepth * 0.5)).toString(16).padStart(2, '0')}`
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'

  // Subtle glow on main roots
  if (depth < 2) {
    ctx.shadowBlur = 6
    ctx.shadowColor = color
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // Branch into smaller roots
  if (depth < maxDepth && random.next() > 0.3) {
    const branchCount = random.next() > 0.5 ? 2 : 1
    for (let i = 0; i < branchCount; i++) {
      const newAngle = angle + (random.next() - 0.5) * Math.PI * 0.4
      const newLength = length * (0.5 + random.next() * 0.3)
      drawRootTendril(ctx, endX, endY, newLength, newAngle, depth + 1, maxDepth, random, color, opacity)
    }
  }
}

// Draw aura glow behind tree based on star count
const drawAura = (ctx, centerX, centerY, starCount, color, breathingFactor = 1) => {
  if (starCount < 100) return // No aura for very low star counts

  // Calculate aura intensity based on log10(stars)
  const intensity = Math.min(1, Math.log10(starCount) / 5.5) // 0 to 1 scale, maxes around 300k stars
  const baseRadius = 150 + intensity * 150
  const radius = baseRadius * breathingFactor

  ctx.save()

  // Create radial gradient for aura
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  gradient.addColorStop(0, `${color}${Math.floor(intensity * 25).toString(16).padStart(2, '0')}`)
  gradient.addColorStop(0.3, `${color}${Math.floor(intensity * 18).toString(16).padStart(2, '0')}`)
  gradient.addColorStop(0.6, `${color}${Math.floor(intensity * 10).toString(16).padStart(2, '0')}`)
  gradient.addColorStop(1, `${color}00`)

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// Convert hex color to HSL for saturation manipulation
const hexToHsl = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// Convert HSL to hex
const hslToHex = (h, s, l) => {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2

  let r, g, b
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Adjust color saturation based on health
const adjustSaturation = (hexColor, health) => {
  const hsl = hexToHsl(hexColor)
  // Health affects saturation: 30% to 100%
  const saturationMultiplier = 0.3 + health * 0.7
  hsl.s = Math.min(100, hsl.s * saturationMultiplier)
  return hslToHex(hsl.h, hsl.s, hsl.l)
}

function App() {
  const canvasRef = useRef(null)
  const offscreenCanvasRef = useRef(null)
  const particlesRef = useRef([])
  const firefliesRef = useRef([])
  const fallingLeavesRef = useRef([])
  const animationTimeRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const [repoData, setRepoData] = useState(MOCK_REPOS[0])
  const [selectedRepo, setSelectedRepo] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [growthProgress, setGrowthProgress] = useState(0)
  const growthProgressRef = useRef(0)
  const lastRenderedProgressRef = useRef(-1)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const animationRef = useRef(null)
  const particleAnimationRef = useRef(null)
  const [customRepos, setCustomRepos] = useState([])
  const [repoUrl, setRepoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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

  // Recursive branch drawing function with enhanced metrics
  // metrics: { commitDensity, ageMultiplier, sizeSpread, health, windOffset, glowIntensity }
  const drawBranch = (ctx, x, y, length, angle, depth, maxDepth, random, color, health, particles, metrics = {}) => {
    if (depth > maxDepth || length < 2) return

    const {
      commitDensity = 0.5,  // 0-1, affects branch count
      ageMultiplier = 1,    // 1-2, affects trunk thickness
      sizeSpread = 0.5,     // 0-1, affects angle spread
      windOffset = 0,       // Wind sway in radians
      glowIntensity = 1     // 0-1, affected by health and breathing
    } = metrics

    // Save canvas state
    ctx.save()

    // Apply wind sway (more effect on outer branches)
    const windEffect = windOffset * (depth / maxDepth) * 0.8
    const swayedAngle = angle + windEffect

    // Calculate end point with subtle curve
    const curvature = (random.next() - 0.5) * length * 0.12
    const midX = (x + Math.cos(swayedAngle) * length * 0.5) + Math.cos(swayedAngle + Math.PI/2) * curvature
    const midY = (y + Math.sin(swayedAngle) * length * 0.5) + Math.sin(swayedAngle + Math.PI/2) * curvature
    const endX = x + Math.cos(swayedAngle) * length
    const endY = y + Math.sin(swayedAngle) * length

    // Line style based on depth, health, and age
    const opacity = Math.max(0.4, health) * (1 - depth / maxDepth * 0.4)
    // Trunk thickness: base width scaled by age (older = thicker trunk)
    const ageThicknessFactor = depth === 0 ? ageMultiplier : (1 + (ageMultiplier - 1) * Math.max(0, 1 - depth / 3))
    const baseWidth = Math.max(0.5, (maxDepth - depth + 1) * (health * 0.6 + 0.4) * ageThicknessFactor)

    // Draw branch with smooth quadratic curve
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(midX, midY, endX, endY)

    // Tapered width effect with gradient
    const gradient = ctx.createLinearGradient(x, y, endX, endY)
    gradient.addColorStop(0, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`)
    gradient.addColorStop(0.7, `${color}${Math.floor(opacity * 220).toString(16).padStart(2, '0')}`)
    gradient.addColorStop(1, `${color}${Math.floor(opacity * 180).toString(16).padStart(2, '0')}`)

    ctx.strokeStyle = gradient
    ctx.lineWidth = baseWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Glow effect (intensity affected by health and breathing)
    if (depth < 3) {
      ctx.shadowBlur = 12 * health * glowIntensity
      ctx.shadowColor = color
    }
    ctx.stroke()

    // Reset shadow
    ctx.shadowBlur = 0

    // Calculate leaf density based on health and commit density
    const leafChance = 0.3 - (1 - health) * 0.2 - (1 - commitDensity) * 0.1 // 0.0 to 0.3
    const shouldDrawLeaf = random.next() > (1 - Math.max(0.1, leafChance * 2))

    // Draw "leaves" at branch tips with organic petal shapes
    if (depth >= maxDepth - 2 && shouldDrawLeaf) {
      // More leaves for healthy, high-commit repos
      const leafCount = health > 0.6 && commitDensity > 0.5 ? (random.next() > 0.5 ? 2 : 1) : 1

      for (let l = 0; l < leafCount; l++) {
        const leafSize = (3 + random.next() * 4) * (0.8 + health * 0.4)
        const leafAngle = random.next() * Math.PI * 2
        const leafOffsetX = l > 0 ? (random.next() - 0.5) * 6 : 0
        const leafOffsetY = l > 0 ? (random.next() - 0.5) * 6 : 0

        // Draw petal-shaped leaf
        ctx.save()
        ctx.translate(endX + leafOffsetX, endY + leafOffsetY)
        ctx.rotate(leafAngle + windEffect * 2)

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(leafSize * 0.5, -leafSize * 0.3, leafSize, 0)
        ctx.quadraticCurveTo(leafSize * 0.5, leafSize * 0.3, 0, 0)

        // Gradient for leaves
        const leafGradient = ctx.createRadialGradient(leafSize * 0.3, 0, 0, leafSize * 0.3, 0, leafSize)
        leafGradient.addColorStop(0, `${color}${Math.floor(opacity * 255 * glowIntensity).toString(16).padStart(2, '0')}`)
        leafGradient.addColorStop(0.5, `${color}${Math.floor(opacity * 220 * glowIntensity).toString(16).padStart(2, '0')}`)
        leafGradient.addColorStop(1, `${color}30`)
        ctx.fillStyle = leafGradient
        ctx.fill()

        // Subtle leaf glow for healthy trees
        if (health > 0.6) {
          ctx.strokeStyle = `${color}${Math.floor(opacity * 150 * glowIntensity).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 0.5
          ctx.shadowBlur = 6 * glowIntensity
          ctx.shadowColor = color
          ctx.stroke()
          ctx.shadowBlur = 0
        }

        ctx.restore()
      }

      // Emit particles from leaves (rate based on health)
      const particleChance = 0.95 - health * 0.1 // Higher health = more particles
      if (random.next() > particleChance && particles) {
        particles.push(new Particle(endX, endY, color))
      }
    }

    ctx.restore()

    // Branch count based on commit density: 2-4 branches
    // Low commits = sparse (2), High commits = dense (3-4)
    let branchCount
    if (depth < 2) {
      branchCount = 2 // Keep trunk splits consistent
    } else {
      const densityRoll = random.next()
      if (commitDensity > 0.7 && densityRoll > 0.6) {
        branchCount = 4
      } else if (commitDensity > 0.4 && densityRoll > 0.4) {
        branchCount = 3
      } else {
        branchCount = 2
      }
    }

    // Canopy spread: size affects angle variation (±20° to ±45°)
    const baseAngleSpread = Math.PI * (0.11 + sizeSpread * 0.14) // ~20° to ~45°

    for (let i = 0; i < branchCount; i++) {
      const angleVariation = (random.next() - 0.5) * baseAngleSpread * 2
      const newAngle = swayedAngle + angleVariation
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
        particles,
        metrics
      )
    }
  }

  // Main tree drawing function (draws to offscreen canvas)
  // animationTime: current time in ms for animations
  const drawTree = useCallback((canvas, data, progress = 1, particles = [], animationTime = 0) => {
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
    const baseColor = LANGUAGE_COLORS[data.language] || LANGUAGE_COLORS.default
    // Adjust color saturation based on health
    const color = adjustSaturation(baseColor, health)

    // Map commit count to recursion depth (4-10, reduced for performance)
    const maxDepth = Math.min(10, Math.max(4, Math.floor(Math.log10(data.commitCount + 1) * 1.6)))

    // Map repo size to initial trunk length
    const baseTrunkLength = Math.min(180, 100 + Math.log10(data.size + 1) * 18)
    const trunkLength = baseTrunkLength * progress

    // Starting position (bottom center, offset for sidebar)
    const startX = width / 2 + 150
    const startY = height - 80
    const startAngle = -Math.PI / 2 // Pointing upward

    // Calculate normalized metrics for visual effects
    const stars = data.stars || 0
    const forks = data.forks || 0
    const age = data.age || 1
    const commitCount = data.commitCount || 100
    const size = data.size || 1000

    // Commit density: 0-1 scale (logarithmic, maxes around 100k commits)
    const commitDensity = Math.min(1, Math.log10(commitCount + 1) / 6)

    // Age multiplier: 1.0 (new) to 2.0 (10+ years old)
    const ageMultiplier = 1 + Math.min(1, age / 10)

    // Size spread: 0-1 scale (logarithmic, affects canopy spread)
    const sizeSpread = Math.min(1, Math.log10(size + 1) / 6)

    // Calculate animation values (subtle mode)
    // Wind sway: gentle oscillation, 5-7 second period
    const windCycle = 6000 // 6 seconds
    const windOffset = Math.sin(animationTime / windCycle * Math.PI * 2 + seed * 0.01) * 0.05 // ±3 degrees max

    // Breathing effect: soft pulsing, 4 second cycle
    const breathingCycle = 4000
    const breathingFactor = 0.97 + 0.03 * Math.sin(animationTime / breathingCycle * Math.PI * 2)
    const glowIntensity = breathingFactor

    // Tree center for aura (approximate based on trunk)
    const treeCenterX = startX
    const treeCenterY = startY - baseTrunkLength * 0.6

    // Draw aura behind tree (for starred repos)
    if (progress > 0.5 && stars > 100) {
      drawAura(ctx, treeCenterX, treeCenterY, stars, baseColor, breathingFactor)
    }

    // Draw the tree
    if (progress > 0) {
      const metrics = {
        commitDensity,
        ageMultiplier,
        sizeSpread,
        windOffset,
        glowIntensity
      }

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
        particles,
        metrics
      )
    }

    // Draw ground glow (intensity based on health)
    const groundGlowIntensity = Math.floor(64 * health * glowIntensity)
    const groundGradient = ctx.createLinearGradient(0, height - 80, 0, height)
    groundGradient.addColorStop(0, `${baseColor}${groundGlowIntensity.toString(16).padStart(2, '0')}`)
    groundGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = groundGradient
    ctx.fillRect(0, height - 80, width, 80)

    // Draw ground line
    ctx.beginPath()
    ctx.moveTo(0, height - 80)
    ctx.lineTo(width, height - 80)
    ctx.strokeStyle = `${baseColor}${Math.floor(96 * glowIntensity).toString(16).padStart(2, '0')}`
    ctx.lineWidth = 1
    ctx.shadowBlur = 10 * glowIntensity
    ctx.shadowColor = baseColor
    ctx.stroke()
    ctx.shadowBlur = 0

    // Draw roots below ground (for forked repos)
    if (progress > 0.3 && forks > 10) {
      // Create a separate random for roots to keep them deterministic
      const rootRandom = new SeededRandom(seed + 12345)
      drawRoots(ctx, startX, startY, forks, baseColor, rootRandom, health)
    }
  }, [])

  // Composite render function (tree + particles)
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const offscreen = offscreenCanvasRef.current
    if (!canvas || !offscreen) return

    const ctx = canvas.getContext('2d', { alpha: false })

    // Copy offscreen tree to main canvas
    ctx.drawImage(offscreen, 0, 0)

    // Draw particles on top with additive blending
    ctx.globalCompositeOperation = 'lighter'

    // Draw energy particles
    particlesRef.current.forEach(particle => {
      particle.draw(ctx)
    })

    // Draw fireflies (for starred repos)
    firefliesRef.current.forEach(firefly => {
      firefly.draw(ctx)
    })

    ctx.globalCompositeOperation = 'source-over'

    // Draw falling leaves (normal blending for leaves)
    fallingLeavesRef.current.forEach(leaf => {
      leaf.draw(ctx)
    })
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
      const now = performance.now()
      const deltaTime = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now
      animationTimeRef.current += deltaTime

      const currentProgress = growthProgressRef.current
      const animTime = animationTimeRef.current

      // Calculate tree metrics for particle spawning
      const health = calculateHealth(repoData.lastPush)
      const stars = repoData.stars || 0
      const baseColor = LANGUAGE_COLORS[repoData.language] || LANGUAGE_COLORS.default
      const width = canvas.width
      const height = canvas.height
      const startX = width / 2 + 150
      const startY = height - 80
      const baseTrunkLength = Math.min(180, 100 + Math.log10((repoData.size || 1000) + 1) * 18)

      // Always redraw tree with current animation time for wind/breathing
      drawTree(offscreenCanvasRef.current, repoData, currentProgress, particlesRef.current, animTime)
      lastRenderedProgressRef.current = currentProgress

      // Update and filter all particle types
      particlesRef.current = particlesRef.current.filter(p => p.update())
      firefliesRef.current = firefliesRef.current.filter(f => f.update())
      fallingLeavesRef.current = fallingLeavesRef.current.filter(l => l.update())

      // Spawn fireflies for high-star repos (subtle mode: conservative spawn rate)
      if (currentProgress > 0.8 && stars > 500) {
        const maxFireflies = Math.min(15, Math.floor(Math.log10(stars) * 3))
        const spawnChance = 0.01 * (stars / 10000) // Very low spawn rate

        if (firefliesRef.current.length < maxFireflies && Math.random() < spawnChance) {
          // Spawn around the tree canopy area
          const spawnX = startX + (Math.random() - 0.5) * 300
          const spawnY = startY - baseTrunkLength * 0.3 - Math.random() * baseTrunkLength * 0.8
          const bounds = {
            minX: startX - 200,
            maxX: startX + 200,
            minY: startY - baseTrunkLength * 1.5,
            maxY: startY - 20
          }
          firefliesRef.current.push(new Firefly(spawnX, spawnY, baseColor, bounds))
        }
      }

      // Spawn falling leaves for unhealthy repos (subtle mode)
      if (currentProgress > 0.8 && health < 0.5) {
        const maxLeaves = Math.floor((1 - health) * 8) // More leaves for unhealthier trees
        const spawnChance = 0.005 * (1 - health) // Low spawn rate

        if (fallingLeavesRef.current.length < maxLeaves && Math.random() < spawnChance) {
          // Spawn from branch tips area
          const spawnX = startX + (Math.random() - 0.5) * 200
          const spawnY = startY - baseTrunkLength * (0.4 + Math.random() * 0.5)
          fallingLeavesRef.current.push(new FallingLeaf(spawnX, spawnY, baseColor))
        }
      }

      // Composite render (cheap operation)
      renderFrame()

      particleAnimationRef.current = requestAnimationFrame(animateParticles)
    }

    // Cancel any existing animation before starting new one
    if (particleAnimationRef.current) {
      cancelAnimationFrame(particleAnimationRef.current)
    }

    // Reset animation time when repo changes
    animationTimeRef.current = 0
    lastFrameTimeRef.current = performance.now()

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
  const loadRepo = (index, isCustom = false) => {
    setSelectedRepo(isCustom ? -1 : index)
    const repo = isCustom ? customRepos[index] : MOCK_REPOS[index]
    setRepoData(repo)
    setGrowthProgress(0)
    growthProgressRef.current = 0
    lastRenderedProgressRef.current = -1 // Force redraw
    // Clear all particles when switching repos
    particlesRef.current = []
    firefliesRef.current = []
    fallingLeavesRef.current = []
    setIsAnimating(true)
  }

  // Handle loading custom GitHub repository
  const handleLoadCustomRepo = async (e) => {
    e.preventDefault()
    setError('')

    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }

    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      setError('Invalid GitHub URL. Use format: github.com/owner/repo or owner/repo')
      return
    }

    setIsLoading(true)
    try {
      const repoData = await fetchGitHubRepo(parsed.owner, parsed.repo)

      // Check if already in custom repos
      const existingIndex = customRepos.findIndex(r => r.fullName === repoData.fullName)
      if (existingIndex >= 0) {
        // Already exists, just load it
        loadRepo(existingIndex, true)
      } else {
        // Add to custom repos
        const newCustomRepos = [...customRepos, repoData]
        setCustomRepos(newCustomRepos)

        // Save to localStorage
        localStorage.setItem('customRepos', JSON.stringify(newCustomRepos))

        // Load the new repo
        setRepoData(repoData)
        setSelectedRepo(-1) // Indicate custom repo
        setGrowthProgress(0)
        growthProgressRef.current = 0
        lastRenderedProgressRef.current = -1
        particlesRef.current = []
        setIsAnimating(true)
      }

      setRepoUrl('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load custom repos from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('customRepos')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCustomRepos(parsed)
      } catch (e) {
        console.error('Failed to parse saved repos:', e)
      }
    }
  }, [])

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
        <div className="h-full w-80 bg-gradient-to-br from-black/95 via-black/90 to-transparent backdrop-blur-2xl border-r border-white/5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 flex flex-col">
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
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                />
                <span className="text-white/60 text-sm">{repoData.language}</span>
              </div>
            </div>

            {/* Enhanced Tree Metrics Panel */}
            <div className="space-y-4">
              <div className="text-white/40 text-xs font-medium uppercase tracking-wider">
                Tree Metrics
              </div>

              {/* Stars → Aura Glow */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">★</span>
                    <span className="text-white/60 text-xs">Stars</span>
                  </div>
                  <span className="text-white text-sm font-mono">
                    {(repoData.stars || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.log10((repoData.stars || 0) + 1) / 5.5 * 100)}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`
                    }}
                  />
                </div>
                <div className="text-white/30 text-xs mt-1.5 text-right">→ Aura Glow</div>
              </div>

              {/* Forks → Root Depth */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">⑂</span>
                    <span className="text-white/60 text-xs">Forks</span>
                  </div>
                  <span className="text-white text-sm font-mono">
                    {(repoData.forks || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.log10((repoData.forks || 0) + 1) / 5 * 100)}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`
                    }}
                  />
                </div>
                <div className="text-white/30 text-xs mt-1.5 text-right">→ Root Depth</div>
              </div>

              {/* Commits → Tree Density */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">◉</span>
                    <span className="text-white/60 text-xs">Commits</span>
                  </div>
                  <span className="text-white text-sm font-mono">
                    {repoData.commitCount.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.log10(repoData.commitCount + 1) / 6 * 100)}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`
                    }}
                  />
                </div>
                <div className="text-white/30 text-xs mt-1.5 text-right">→ Tree Density</div>
              </div>

              {/* Size → Trunk Scale */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">▣</span>
                    <span className="text-white/60 text-xs">Size</span>
                  </div>
                  <span className="text-white text-sm font-mono">
                    {repoData.size >= 1000
                      ? `${(repoData.size / 1000).toFixed(1)} MB`
                      : `${repoData.size} KB`
                    }
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.log10(repoData.size + 1) / 6 * 100)}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`
                    }}
                  />
                </div>
                <div className="text-white/30 text-xs mt-1.5 text-right">→ Trunk Scale</div>
              </div>

              {/* Health → Vitality */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={health > 0.6 ? 'text-green-400' : health > 0.3 ? 'text-yellow-400' : 'text-red-400'}>♥</span>
                    <span className="text-white/60 text-xs">Health</span>
                  </div>
                  <span className="text-white text-sm font-medium">{healthLabel}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${health * 100}%`,
                      backgroundColor: health > 0.6 ? color : health > 0.3 ? '#fbbf24' : '#ef4444',
                      boxShadow: `0 0 8px ${health > 0.6 ? color : health > 0.3 ? '#fbbf24' : '#ef4444'}`
                    }}
                  />
                </div>
                <div className="text-white/30 text-xs mt-1.5 text-right">→ Vitality</div>
              </div>

              {/* Age → Maturity */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">◷</span>
                    <span className="text-white/60 text-xs">Age</span>
                  </div>
                  <span className="text-white text-sm font-mono">
                    {(repoData.age || 0).toFixed(1)} years
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, (repoData.age || 0) / 15 * 100)}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`
                    }}
                  />
                </div>
                <div className="text-white/30 text-xs mt-1.5 text-right">→ Maturity</div>
              </div>
            </div>
          </div>

          {/* GitHub URL Input */}
          <div className="p-8 border-b border-white/5">
            <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">
              Visualize Any Repo
            </div>
            <form onSubmit={handleLoadCustomRepo} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="owner/repo or github.com/owner/repo"
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/30 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-all disabled:opacity-50 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Load Repository</span>
                  </>
                )}
              </button>
              {error && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Repository Selector */}
          <div className="p-8">
            <div className="text-white/40 text-xs font-medium uppercase tracking-wider mb-4">
              Example Repositories
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

            {/* Custom Repositories */}
            {customRepos.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white/40 text-xs font-medium uppercase tracking-wider">
                    Your Repositories
                  </div>
                  <button
                    onClick={() => {
                      setCustomRepos([])
                      localStorage.removeItem('customRepos')
                      if (repoData.isCustom) {
                        loadRepo(0)
                      }
                    }}
                    className="text-white/30 hover:text-white/60 text-xs transition-colors"
                    title="Clear all custom repos"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {customRepos.map((repo, index) => {
                    const repoHealth = calculateHealth(repo.lastPush)
                    const repoColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.default
                    const isSelected = selectedRepo === -1 && repoData.fullName === repo.fullName

                    return (
                      <button
                        key={repo.fullName}
                        onClick={() => loadRepo(index, true)}
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
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 mt-auto">
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
          <div className="text-white text-xs font-mono">
            {particlesRef.current.length + firefliesRef.current.length + fallingLeavesRef.current.length}
          </div>
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
