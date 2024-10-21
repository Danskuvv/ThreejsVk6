import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadow maps
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Add a light source
const light = new THREE.PointLight(0xffffff, 200, 100);
light.position.set(0, 10, 0);
light.castShadow = true; // Enable shadows for the light
scene.add(light);

// add a point light to the side
const light2 = new THREE.PointLight(0xffffff, 100, 100);
light2.position.set(0, 0, 10);
light2.castShadow = true; // Enable shadows for the light
scene.add(light2);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 20, 100);
controls.update();

// Create the floor
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xfffff });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // Rotate the floor to be horizontal
floor.position.y = -2; // Position the floor under the cube
floor.receiveShadow = true; // Enable shadow receiving for the floor
scene.add(floor);

// Create a wall perpendicular to the floor
const wallGeometry = new THREE.PlaneGeometry(10, 10);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xfffff });
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.position.z = -5; // Position the wall behind the cube
wall.receiveShadow = true; // Enable shadow receiving for the wall
scene.add(wall);

// Create a cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x5a47c9 });
const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true; // Enable shadow casting for the cube
scene.add(cube);

camera.position.z = 5;

function animate() {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // required if controls.enableDamping or controls.autoRotate are set to true
  controls.update();

  renderer.render(scene, camera);
}
