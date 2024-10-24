import * as THREE from "https://esm.sh/three";
import { Pane } from "https://esm.sh/tweakpane";
import { HandControls } from "./HandControls.js";
import { MediaPipeHands } from "./MediaPipeHands.js";
import { ScenesManager } from "./ScenesManager.js";

export class App {
  constructor() {
    this.pane = new Pane();

    ScenesManager.setup();

    this.build();

    if (this.hasGetUserMedia()) {
      const enableWebcamButton = document.getElementById("webcamButton");
      enableWebcamButton.addEventListener("click", (e) => {
        if (this.hasCamera) return;
        e.preventDefault();
        this.hasCamera = true;

        const videoElement = document.getElementById("inputVideo");
        this.mediaPiepeHands = new MediaPipeHands(videoElement, (landmarks) =>
          this.onMediaPipeHandsResults(landmarks)
        );
        this.mediaPiepeHands.start();
        enableWebcamButton.remove();
      });
    } else {
      console.warn("getUserMedia() is not supported by your browser");
    }

    ScenesManager.renderer.setAnimationLoop(() => this.animate());
  }

  hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  onMediaPipeHandsResults(landmarks) {
    if (this.handControls) {
      this.handControls.update(landmarks);
    }
  }

  async build() {
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    planeGeometry.rotateX(-Math.PI / 2);
    const planeMaterial = new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.2,
    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.y = -1;
    plane.receiveShadow = true;
    ScenesManager.scene.add(plane);

    const helper = new THREE.GridHelper(20, 10);
    helper.position.y = -0.9;
    helper.material.opacity = 0.25;
    helper.material.transparent = true;
    ScenesManager.scene.add(helper);

    const objects = [];
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const object = new THREE.Mesh(
      geometry,
      new THREE.MeshNormalMaterial({ transparent: true })
    );
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshNormalMaterial({ transparent: true });
      const _object = object.clone();
      _object.material = mat;

      _object.position.x = Math.random() * 2 - 1;
      _object.position.y = Math.random() * 0.5 - 0.25;
      _object.position.z = Math.random() * 2 - 1;

      _object.rotation.x = Math.random() * 2 * Math.PI;
      _object.rotation.y = Math.random() * 2 * Math.PI;
      _object.rotation.z = Math.random() * 2 * Math.PI;

      _object.castShadow = true;
      _object.receiveShadow = true;

      ScenesManager.scene.add(_object);
      objects.push(_object);
    }

    const cursorMat = new THREE.MeshNormalMaterial({
      depthTest: false,
      depthWrite: false,
    });
    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 32, 16),
      cursorMat
    );
    ScenesManager.scene.add(cursor);

    this.handControls = new HandControls(
      cursor,
      objects,
      ScenesManager.renderer,
      ScenesManager.camera,
      ScenesManager.scene,
      true
    );
    const PARAMS = {
      showLandmark: false,
    };
    this.pane.addBinding(PARAMS, "showLandmark").on("change", (ev) => {
      this.handControls.show3DLandmark(ev.value);
    });

    this.handControls.addEventListener("drag_start", (event) => {
      event.object.material.opacity = 0.4;
    });
    this.handControls.addEventListener("drag_end", (event) => {
      if (event.object) event.object.material.opacity = 1;
      event.callback();
    });
    this.handControls.addEventListener("collision", (event) => {
      if (event.state === "on") {
        cursorMat.opacity = 0.4;
      } else {
        cursorMat.opacity = 1;
      }
    });

    window.addEventListener("resize", this.onWindowResize, false);
  }

  onWindowResize() {
    ScenesManager.camera.aspect = window.innerWidth / window.innerHeight;
    ScenesManager.camera.updateProjectionMatrix();

    ScenesManager.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.handControls?.animate();
    ScenesManager.render();
  }
}

document.addEventListener("DOMContentLoaded", () => new App());
