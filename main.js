import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

let camera, scene, renderer;

// Controllers
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster;
const intersected = [];
let group;

let marker, floor, baseReferenceSpace;
let INTERSECTION;
const tempMatrix = new THREE.Matrix4();

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.25,
    1000
  );
  camera.position.set(-1.8, 5, 2.7);

  scene = new THREE.Scene();

  const xrRig = new THREE.Group(); // Create the XR rig
  xrRig.add(camera); // Add the camera to the XR rig
  scene.add(xrRig); // Add the XR rig to the scene

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
        model.position.set(4, 0.13, 0); // Move the model to (5, 0, 0)
        model.scale.set(0.1, 0.1, 0.1); // Scale the model

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
  baseReferenceSpace = renderer.xr.getReferenceSpace();
  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer)); // Add VRButton to the document

  // Initialize group
  group = new THREE.Group();
  scene.add(group);

  // Add a grabbable cube
  const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 1.5, -1);
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);

  // Add floor for teleportation
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 2, 2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xbcbcbc,
      transparent: true,
      opacity: 0.1,
    })
  );
  scene.add(floor);

  // Add marker for teleportation
  marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
  );
  scene.add(marker);

  // Controllers
  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  xrRig.add(controller1); // Add controller1 to the XR rig

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  xrRig.add(controller2); // Add controller2 to the XR rig

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  xrRig.add(controllerGrip1); // Add controllerGrip1 to the XR rig

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  xrRig.add(controllerGrip2); // Add controllerGrip2 to the XR rig

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const line = new THREE.Line(geometry);
  line.name = "line";
  line.scale.z = 5;

  controller1.add(line.clone());
  controller2.add(line.clone());

  raycaster = new THREE.Raycaster();

  // Camera Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render); // use if there is no animation loop
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.update();

  window.addEventListener("resize", onWindowResize);

  // Start the animation loop
  renderer.setAnimationLoop(animate);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();
}

function onSelectStart(event) {
  const controller = event.target;
  controller.userData.isSelecting = true;

  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];
    const object = intersection.object;
    object.material.emissive.b = 1;
    controller.attach(object);
    controller.userData.selected = object;
  }

  controller.userData.targetRayMode = event.data.targetRayMode;
}

function onSelectEnd(event) {
  console.log("selectend event triggered");
  const controller = event.target;
  controller.userData.isSelecting = false;

  // Handle object release
  if (controller.userData.selected !== undefined) {
    const object = controller.userData.selected;
    object.material.emissive.b = 0;
    group.attach(object);
    controller.userData.selected = undefined;
  }

  // Handle teleportation
  if (INTERSECTION) {
    const xrRig = camera.parent; // Ensure the camera is parented to the XR rig
    if (xrRig) {
      xrRig.position.set(INTERSECTION.x, xrRig.position.y, INTERSECTION.z); // Keep the height constant
      console.log("Teleporting to:", INTERSECTION);
    } else {
      console.warn("XR Rig is not defined or incorrectly set up!");
    }
  }

  // Reset marker visibility
  marker.visible = false;
}

function getIntersections(controller) {
  const tempMatrix = new THREE.Matrix4()
    .identity()
    .extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  return raycaster.intersectObjects(group.children.concat(floor), false); // Intersect with the floor and group children
}

function intersectObjects(controller) {
  if (controller.userData.targetRayMode === "screen") return;
  if (controller.userData.selected !== undefined) return;

  const line = controller.getObjectByName("line");
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];
    const object = intersection.object;
    if (object && object.material && object.material.emissive) {
      object.material.emissive.r = 1;
      intersected.push(object);
      line.scale.z = intersection.distance;
    }
  } else {
    line.scale.z = 5;
  }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    object.material.emissive.r = 0;
  }
}

function render() {
  cleanIntersected();
  intersectObjects(controller1);
  intersectObjects(controller2);
  renderer.render(scene, camera);
}

function animate() {
  INTERSECTION = undefined;

  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  } else if (controller2.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  }

  if (INTERSECTION) marker.position.copy(INTERSECTION);

  marker.visible = INTERSECTION !== undefined;
  render();
}
