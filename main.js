import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js"; // Import VRButton

let camera, scene, renderer;

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.25,
    1000
  );
  camera.position.set(-1.8, 5, 2.7);

  scene = new THREE.Scene();

  new RGBELoader()
    .setPath("images/")
    .load("qwantani_dusk_2_4k.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;

      render();

      // model

      const loader = new GLTFLoader().setPath("models/");
      loader.load("World_poly.glb", async function (gltf) {
        const model = gltf.scene;

        // wait until the model can be added to the scene without blocking due to shader compilation

        await renderer.compileAsync(model, camera, scene);

        scene.add(model);

        render();
      });

      // dog model
      loader.load("Dog.glb", async function (gltf) {
        const model = gltf.scene;

        // wait until the model can be added to the scene without blocking due to shader compilation

        await renderer.compileAsync(model, camera, scene);

        // Move and scale the second model
        model.position.set(4, 0.4, 0); // Move the model to (5, 0, 0)
        model.scale.set(0.3, 0.3, 0.3); // Scale the model

        scene.add(model);

        render();
      });
    });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.xr.enabled = true; // Enable XR on the renderer
  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer)); // Add VRButton to the document

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use if there is no animation loop
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.update();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

//

function render() {
  renderer.render(scene, camera);
}
