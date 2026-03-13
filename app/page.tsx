'use client'

import { Canvas } from '@react-three/fiber'
import { PointerLockControls, Sky } from '@react-three/drei'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// Player component
function Player({ position, onShoot }: any) {
  const playerRef = useRef<THREE.Group>(null)
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const moveState = useRef({ forward: false, backward: false, left: false, right: false })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = true; break
        case 'KeyS': moveState.current.backward = true; break
        case 'KeyA': moveState.current.left = true; break
        case 'KeyD': moveState.current.right = true; break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = false; break
        case 'KeyS': moveState.current.backward = false; break
        case 'KeyA': moveState.current.left = false; break
        case 'KeyD': moveState.current.right = false; break
      }
    }

    const handleClick = () => {
      onShoot()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('click', handleClick)
    }
  }, [onShoot])

  useFrame((state, delta) => {
    if (!playerRef.current) return

    const speed = 10
    direction.current.set(0, 0, 0)

    if (moveState.current.forward) direction.current.z -= 1
    if (moveState.current.backward) direction.current.z += 1
    if (moveState.current.left) direction.current.x -= 1
    if (moveState.current.right) direction.current.x += 1

    direction.current.normalize()
    
    const cameraDirection = new THREE.Vector3()
    state.camera.getWorldDirection(cameraDirection)
    cameraDirection.y = 0
    cameraDirection.normalize()

    const cameraRight = new THREE.Vector3()
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0))

    velocity.current.set(0, 0, 0)
    velocity.current.addScaledVector(cameraDirection, -direction.current.z)
    velocity.current.addScaledVector(cameraRight, direction.current.x)
    
    state.camera.position.x += velocity.current.x * speed * delta
    state.camera.position.z += velocity.current.z * speed * delta
  })

  return <group ref={playerRef} position={position} />
}

// Enemy component
function Enemy({ position, id, onHit }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [health, setHealth] = useState(100)

  useEffect(() => {
    if (health <= 0) {
      onHit(id)
    }
  }, [health, id, onHit])

  const handleClick = (e: any) => {
    e.stopPropagation()
    setHealth((h) => h - 50)
  }

  if (health <= 0) return null

  return (
    <mesh ref={meshRef} position={position} onClick={handleClick}>
      <boxGeometry args={[1, 2, 1]} />
      <meshStandardMaterial color={health > 50 ? "red" : "darkred"} />
    </mesh>
  )
}

// Ground component
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#3a7d3a" />
    </mesh>
  )
}

// Buildings/Obstacles
function Buildings() {
  const buildings = [
    { pos: [10, 2.5, -10], size: [4, 5, 4] },
    { pos: [-15, 3, -5], size: [5, 6, 5] },
    { pos: [5, 1.5, 15], size: [3, 3, 3] },
    { pos: [-8, 2, 10], size: [4, 4, 4] },
    { pos: [20, 4, 5], size: [6, 8, 6] },
    { pos: [-20, 3.5, -15], size: [5, 7, 5] },
  ]

  return (
    <>
      {buildings.map((building, i) => (
        <mesh key={i} position={building.pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={building.size as [number, number, number]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      ))}
    </>
  )
}

// Crosshair component
function Crosshair() {
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
      <div className="relative w-8 h-8">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white transform -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white transform -translate-x-1/2" />
      </div>
    </div>
  )
}

// Main Game Component
export default function Game() {
  const [score, setScore] = useState(0)
  const [ammo, setAmmo] = useState(30)
  const [health, setHealth] = useState(100)
  const [enemies, setEnemies] = useState<any[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const nextEnemyId = useRef(0)

  useEffect(() => {
    // Spawn initial enemies
    const initialEnemies = []
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5
      const distance = 15 + Math.random() * 10
      initialEnemies.push({
        id: nextEnemyId.current++,
        position: [Math.cos(angle) * distance, 1, Math.sin(angle) * distance]
      })
    }
    setEnemies(initialEnemies)

    // Spawn more enemies periodically
    const interval = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const distance = 20 + Math.random() * 15
      setEnemies((prev) => [
        ...prev,
        {
          id: nextEnemyId.current++,
          position: [Math.cos(angle) * distance, 1, Math.sin(angle) * distance]
        }
      ])
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleShoot = () => {
    if (ammo > 0 && isLocked) {
      setAmmo((a) => a - 1)
      // Reload after empty
      if (ammo - 1 === 0) {
        setTimeout(() => setAmmo(30), 1500)
      }
    }
  }

  const handleEnemyHit = (id: number) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id))
    setScore((s) => s + 100)
  }

  return (
    <div className="w-full h-screen bg-black">
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 text-white">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="text-2xl font-bold">Puntos: {score}</div>
            <div className="flex items-center gap-2">
              <div className="text-lg">❤️ {health}%</div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="text-2xl font-bold">🔫 {ammo}/30</div>
            <div className="text-sm text-gray-300">Click para disparar</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!isLocked && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-75">
          <div className="bg-gray-900 p-8 rounded-lg text-white text-center max-w-md">
            <h1 className="text-3xl font-bold mb-4">🎮 Battle Royale FPS</h1>
            <div className="space-y-2 text-left mb-6">
              <p>🎯 <strong>Click</strong> para empezar</p>
              <p>🎯 <strong>WASD</strong> - Moverse</p>
              <p>🎯 <strong>Mouse</strong> - Mirar alrededor</p>
              <p>🎯 <strong>Click izquierdo</strong> - Disparar</p>
              <p>🎯 <strong>ESC</strong> - Pausar</p>
            </div>
            <button
              onClick={() => {}}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold text-lg transition-colors"
            >
              COMENZAR PARTIDA
            </button>
          </div>
        </div>
      )}

      <Crosshair />

      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 75 }}
        shadows
      >
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        <Player position={[0, 0, 0]} onShoot={handleShoot} />
        <Ground />
        <Buildings />
        
        {enemies.map((enemy) => (
          <Enemy
            key={enemy.id}
            id={enemy.id}
            position={enemy.position}
            onHit={handleEnemyHit}
          />
        ))}

        <PointerLockControls
          onLock={() => setIsLocked(true)}
          onUnlock={() => setIsLocked(false)}
        />
      </Canvas>
    </div>
  )
}
