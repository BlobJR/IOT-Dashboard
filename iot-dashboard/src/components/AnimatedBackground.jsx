import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import './AnimatedBackground.css'

/**
 * A 3D animated background component using Three.js.
 * Visualizes a stylized IoT parking lot with real-time effects and interactivity.
 */
const AnimatedBackground = () => {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup with fog for depth perception
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020205)
    scene.fog = new THREE.FogExp2(0x020205, 0.02)

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 14, 22)
    camera.lookAt(0, 0, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)

    // Post-processing pipeline for glow effects
    const renderScene = new RenderPass(scene, camera)
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    )
    bloomPass.threshold = 0.1
    bloomPass.strength = 1.2
    bloomPass.radius = 0.5

    const composer = new EffectComposer(renderer)
    composer.addPass(renderScene)
    composer.addPass(bloomPass)

    // Environmental elements: Floor and Grid system
    const planeGeometry = new THREE.PlaneGeometry(500, 500)
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.1,
      metalness: 0.6,
    })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.receiveShadow = true
    scene.add(plane)

    const grid = new THREE.GridHelper(500, 100, 0x0044ff, 0x0a0a0a)
    grid.position.y = 0.01
    scene.add(grid)

    // Basic lighting configuration
    const ambientLight = new THREE.AmbientLight(0x404040, 2)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xaaccff, 0.5)
    dirLight.position.set(50, 100, 50)
    dirLight.castShadow = true
    scene.add(dirLight)

    /**
     * Helper to create a stylized vehicle mesh.
     */
    const createCar = (color, x, z) => {
        const carGroup = new THREE.Group()

        const bodyMat = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.7,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        })
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.5), bodyMat)
        body.position.y = 0.65
        body.castShadow = true
        carGroup.add(body)

        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.5, 2.5), 
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.0, metalness: 0.9 })
        )
        cabin.position.set(0, 1.25, -0.2)
        carGroup.add(cabin)

        const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }))
        tailLight.position.set(0, 0.7, 2.26)
        carGroup.add(tailLight)

        const headLight = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xaaddff }))
        headLight.position.set(0, 0.7, -2.26)
        carGroup.add(headLight)

        carGroup.position.set(x, 0, z)
        return carGroup
    }

    // Initialize parking spots with simulated sensors
    const sensors = [];
    
    for (let i = -2; i <= 2; i++) {
        const x = i * 7
        const z = 0
        const isOccupied = Math.random() > 0.4;

        // Visual parking spot indicator
        const spotGeo = new THREE.PlaneGeometry(3.5, 7)
        const spotMat = new THREE.MeshBasicMaterial({ 
            color: isOccupied ? 0xaa0000 : 0x00aa00,
            transparent: true, 
            opacity: 0.1, 
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending 
        })
        const spot = new THREE.Mesh(spotGeo, spotMat)
        spot.rotation.x = -Math.PI / 2
        spot.position.set(x, 0.02, z)
        scene.add(spot)

        const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.5, 0.1, 7))
        const borderMat = new THREE.LineBasicMaterial({ color: isOccupied ? 0xff0000 : 0x00ff00 })
        const border = new THREE.LineSegments(borderGeo, borderMat)
        border.position.set(x, 0.02, z)
        scene.add(border)

        // Simulated IoT sensor hardware representation
        const sensorNodeGeo = new THREE.ConeGeometry(0.3, 0.8, 4);
        const sensorNodeMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: isOccupied ? 0xff0000 : 0x00ff00, emissiveIntensity: 2 });
        const sensorNode = new THREE.Mesh(sensorNodeGeo, sensorNodeMat);
        sensorNode.position.set(x, 5, z);
        sensorNode.rotation.x = Math.PI;
        scene.add(sensorNode);

        const beamHeight = isOccupied ? 3.5 : 5;
        const beamGeo = new THREE.CylinderGeometry(0.05, 1.5, beamHeight, 32, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: isOccupied ? 0xff0000 : 0x00ff00,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(x, 5 - (beamHeight / 2), z);
        scene.add(beam);

        sensors.push({ beam, spotMat, originalOpacity: 0.15 });

        if (isOccupied) {
            const colors = [0x333333, 0x111111, 0x1a2b4c, 0x555555]
            const color = colors[Math.floor(Math.random() * colors.length)]
            const car = createCar(color, x, z);
            scene.add(car);
        }
    }

    // Scanner animation effect representing data acquisition
    const scannerGeo = new THREE.BoxGeometry(40, 0.05, 0.2);
    const scannerMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.5,
        blending: THREE.AdditiveBlending 
    });
    const scanner = new THREE.Mesh(scannerGeo, scannerMat);
    scanner.position.set(0, 0.5, 0);
    scene.add(scanner);

    const scannerLight = new THREE.PointLight(0x00ffff, 2, 10);
    scannerLight.position.set(0, 2, 0);
    scene.add(scannerLight);

    // Decorative data flow lines in the background
    const trafficLines = []
    for(let i=0; i<20; i++) {
        const geo = new THREE.BoxGeometry(0.05, 0.05, 3 + Math.random() * 8)
        const mat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x00ffff : 0xffffff })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set((Math.random() - 0.5) * 100, 1 + Math.random() * 8, -20 - Math.random() * 40)
        scene.add(mesh)
        trafficLines.push({ mesh, speed: 0.2 + Math.random() * 0.5 })
    }

    const clock = new THREE.Clock()
    
    // Mouse interaction handling
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    /**
     * Primary animation loop for the 3D scene.
     */
    const animate = () => {
        requestAnimationFrame(animate)
        const time = clock.getElapsedTime();

        // Animate scanning plane
        const scanZ = Math.sin(time * 0.5) * 10;
        scanner.position.z = scanZ;
        scannerLight.position.z = scanZ;
        scannerMat.opacity = 0.3 + Math.sin(time * 10) * 0.2;

        // Sensor pulsing effects
        sensors.forEach((s, idx) => {
            s.beam.material.opacity = s.originalOpacity + Math.sin(time * 3 + idx) * 0.05;
        });

        // Background traffic movement
        trafficLines.forEach(item => {
            item.mesh.position.z += item.speed
            if(item.mesh.position.z > 20) item.mesh.position.z = -60
        })

        // Interactive camera sway
        const targetX = mouseX * 2;
        const targetY = 14 + mouseY * 1;
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.y += (targetY - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0)

        composer.render()
    }

    animate()

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        composer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup resources on component unmount
    return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('mousemove', handleMouseMove)
        if (containerRef.current && renderer.domElement) {
            containerRef.current.removeChild(renderer.domElement)
        }
        renderer.dispose()
    }
  }, [])

  return <div ref={containerRef} className="animated-background" />
}

export default AnimatedBackground