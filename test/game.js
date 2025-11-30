import * as THREE from 'three';

// --- Configuration ---
const CONFIG = {
    cameraHeight: 40,
    flightSpeed: 0.2,
    flightRadiusX: 30,
    flightRadiusZ: 15,
};

// --- State ---
const state = {
    score: 0,
    time: 0,
};

// --- Setup Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.Fog(0x87CEEB, 20, 120);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 200;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);

// --- Environment ---
// Ground
const planeGeometry = new THREE.PlaneGeometry(500, 500);
const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b7d3b,
    roughness: 0.8,
    metalness: 0.1
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

// --- Road Generation ---
function createRoad() {
    const points = [];
    // Create a winding path
    for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (i / 10) * 400 - 200; // Spread along Z
        points.push(new THREE.Vector3(x, 0.5, z));
    }
    // Ensure start and end are somewhat far apart
    points[0].set(-50, 0.5, -200);
    points[points.length - 1].set(50, 0.5, 200);

    const curve = new THREE.CatmullRomCurve3(points);

    // Visual Road
    const geometry = new THREE.TubeGeometry(curve, 100, 2, 8, false);
    const material = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const roadMesh = new THREE.Mesh(geometry, material);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    return curve;
}

const roadCurve = createRoad();

// --- Enemy System ---
const enemies = [];
const enemyGeometry = new THREE.SphereGeometry(1.5, 16, 16);
const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

function spawnEnemy() {
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemy.castShadow = true;
    scene.add(enemy);

    enemies.push({
        mesh: enemy,
        progress: 0, // 0 to 1 along the curve
        speed: 0.05 + Math.random() * 0.05, // Random speed
        radius: 1.5
    });
}

function updateEnemies(delta) {
    // Spawn logic
    if (Math.random() < 0.01) { // Approx every 1.6s at 60fps
        spawnEnemy();
    }

    // Move enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.progress += e.speed * delta * 0.1; // Scale speed

        if (e.progress >= 1) {
            // Reached end
            scene.remove(e.mesh);
            enemies.splice(i, 1);
        } else {
            const position = roadCurve.getPointAt(e.progress);
            e.mesh.position.copy(position);
            e.mesh.position.y = 1.5; // Lift slightly above road center
        }
    }
}

// --- Shooting System ---
const projectiles = [];
const projectileGeometry = new THREE.SphereGeometry(0.5, 8, 8);
const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function shoot(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Intersect with the ground plane
    const intersects = raycaster.intersectObject(plane);

    if (intersects.length > 0) {
        const targetPoint = intersects[0].point;

        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.position.copy(camera.position);
        scene.add(projectile);

        // Calculate direction
        const direction = new THREE.Vector3().subVectors(targetPoint, camera.position).normalize();

        projectiles.push({
            mesh: projectile,
            direction: direction,
            speed: 100 // Units per second
        });
    }
}

function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        // Move projectile
        const moveDistance = p.speed * delta;
        p.mesh.position.addScaledVector(p.direction, moveDistance);

        // Collision Detection with Enemies
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = p.mesh.position.distanceTo(e.mesh.position);

            if (dist < (e.radius + 0.5)) { // Enemy radius + projectile radius
                // Hit!
                createExplosion(e.mesh.position);
                scene.remove(e.mesh);
                enemies.splice(j, 1);
                hit = true;

                // Update Score
                state.score += 10;
                const scoreEl = document.getElementById('score');
                if (scoreEl) scoreEl.innerText = state.score;
                break;
            }
        }

        // Remove if hit or too far (simple cleanup)
        if (hit || p.mesh.position.y < 0 || p.mesh.position.distanceTo(camera.position) > 300) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }
}

// --- Main Loop ---
function animate() {
    requestAnimationFrame(animate);

    const delta = 0.016; // Approx 60fps
    state.time += delta * CONFIG.flightSpeed;

    // Figure-8 Camera Movement
    // Lemniscate of Bernoulli parametric equation or simple Lissajous
    // x = A * sin(t)
    // z = B * sin(t) * cos(t)
    const t = state.time;
    camera.position.x = CONFIG.flightRadiusX * Math.sin(t);
    camera.position.z = CONFIG.flightRadiusZ * Math.sin(t) * Math.cos(t);
    camera.position.y = CONFIG.cameraHeight;

    // Look slightly ahead or down
    camera.lookAt(0, 0, 0);

    // Update Game Logic
    updateEnemies(delta);
    updateProjectiles(delta);
    updateParticles(delta);

    renderer.render(scene, camera);
}

// --- Particle System ---
const particles = [];
const particleGeometry = new THREE.BufferGeometry();
const particleMaterial = new THREE.PointsMaterial({
    color: 0xffaa00,
    size: 0.5,
    transparent: true,
    opacity: 1
});

function createExplosion(position) {
    const count = 20;
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.MeshBasicMaterial({ color: 0xff4400 })
        );
        mesh.position.copy(position);

        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );

        scene.add(mesh);
        particles.push({ mesh, velocity, life: 1.0 });
    }
}

function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= delta * 2; // Fade out speed

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        } else {
            p.mesh.position.addScaledVector(p.velocity, delta);
            p.mesh.rotation.x += delta * 5;
            p.mesh.rotation.y += delta * 5;
            p.mesh.scale.setScalar(p.life);
        }
    }
}


