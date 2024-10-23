import * as THREE from "three";

export class HandControls extends THREE.EventDispatcher {
  constructor(target, objects, renderer, camera, scene, isDraggable = false) {
    super();
    this.target = target; // An Object3D to be used as cursor
    this.objects = objects; // An array of draggable objects
    this.isDraggable = isDraggable; // A boolean to determine if the element must be draggable after hit
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    this.viewProjectionMatrix = new THREE.Matrix4();
    this.objectBox3 = new THREE.Box3();
    this.targetBox3 = new THREE.Box3();
    this.depthPointA = new THREE.Vector3();
    this.depthPointB = new THREE.Vector3();
    this.refObjFrom = new THREE.Object3D();
    this.scene.add(this.refObjFrom);
    this.refObjTo = new THREE.Object3D();
    this.scene.add(this.refObjTo);

    this.objects.forEach((obj) => (obj.userData.hasCollision = false));

    this.pointsDist = 0;
    this.distanceToGrab = 0.25;
    this.gestureCompute = {
      depthFrom: new THREE.Vector3(),
      depthTo: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
    };
  }

  show3DLandmark(value) {
    if (!this.handsObj) {
      this.handsObj = new THREE.Object3D();
      this.scene.add(this.handsObj);

      this.createHand();
    }

    this.sphereMat.opacity = value ? 1 : 0;
  }

  //   Conversion from Polar to Cartesian - Function from THREE.js CSSRenderer
  to2D(object) {
    if (!this.renderer) {
      console.error("A valid renderer must be used.");
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const width = rect.width,
      height = rect.height;
    const widthHalf = width / 2,
      heightHalf = height / 2;
    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.applyMatrix4(this.viewProjectionMatrix);

    return {
      x: vector.x * widthHalf + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf,
    };
  }

  createHand() {
    this.sphereMat = new THREE.MeshNormalMaterial({
      transparent: true,
      opacity: this.showLandmark ? 1 : 0,
    });
    const sphereGeo = new THREE.SphereGeometry(0.025, 8, 4);
    const sphereMesh = new THREE.Mesh(sphereGeo, this.sphereMat);
    for (let i = 0; i < 21; i++) {
      const sphereMeshClone = sphereMesh.clone();
      sphereMeshClone.renderOrder = 2;
      this.handsObj.add(sphereMeshClone);
    }
  }

  update(landmarks) {
    if (landmarks.multiHandLandmarks.length === 1) {
      if (this.handsObj) {
        //  Update the position of the objects for the single detected hand
        //  It update 3D landmark
        for (let l = 0; l < 21; l++) {
          this.handsObj.children[l].position.x =
            -landmarks.multiHandLandmarks[0][l].x + 0.5;
          this.handsObj.children[l].position.y =
            -landmarks.multiHandLandmarks[0][l].y + 0.5;
          this.handsObj.children[l].position.z =
            -landmarks.multiHandLandmarks[0][l].z;
          this.handsObj.children[l].position.multiplyScalar(4);
        }
      }
      // Main points to control gestures
      this.gestureCompute.depthFrom
        .set(
          -landmarks.multiHandLandmarks[0][0].x + 0.5,
          -landmarks.multiHandLandmarks[0][0].y + 0.5,
          -landmarks.multiHandLandmarks[0][0].z
        )
        .multiplyScalar(4);
      this.gestureCompute.depthTo
        .set(
          -landmarks.multiHandLandmarks[0][10].x + 0.5,
          -landmarks.multiHandLandmarks[0][10].y + 0.5,
          -landmarks.multiHandLandmarks[0][10].z
        )
        .multiplyScalar(4);
      this.gestureCompute.from
        .set(
          -landmarks.multiHandLandmarks[0][9].x + 0.5,
          -landmarks.multiHandLandmarks[0][9].y + 0.5,
          -landmarks.multiHandLandmarks[0][9].z
        )
        .multiplyScalar(4);
      this.gestureCompute.to
        .set(
          -landmarks.multiHandLandmarks[0][12].x + 0.5,
          -landmarks.multiHandLandmarks[0][12].y + 0.5,
          -landmarks.multiHandLandmarks[0][12].z
        )
        .multiplyScalar(4);

      //  Here the closed fist gesture is detected based on distance from two middle points of the landmark
      //  it is lighter than use a GesturesRecognizer as the unique reason to have that is know when grab something.
      const pointsDist = this.gestureCompute.from.distanceTo(
        this.gestureCompute.to
      );
      this.closedFist = pointsDist < 0.35;

      // Here I convert the edge points from landmark to cartesian points to hade a radius length based on screen position
      // Then this length is converted to z-axis value.
      // To have depth feeling I invert to a negatiuve number.
      this.refObjFrom.position.copy(this.gestureCompute.depthFrom);
      const depthA = this.to2D(this.refObjFrom);
      this.depthPointA.set(depthA.x, depthA.y);

      this.refObjTo.position.copy(this.gestureCompute.depthTo);
      const depthB = this.to2D(this.refObjTo);
      this.depthPointB.set(depthB.x, depthB.y);

      const depthDistance = this.depthPointA.distanceTo(this.depthPointB);
      // This distance between landmarks 0 and 10 is used to determine z-axis movement in 3D space
      // I only limit this value between -3 and 5 to make it friendly but it is not necessary
      this.depthZ = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(depthDistance, 0, 1000, -3, 5),
        -2,
        4
      );

      this.target.position.set(
        this.gestureCompute.from.x,
        this.gestureCompute.from.y,
        -this.depthZ
      );

      if (!this.closedFist) {
        this.dispatchEvent({
          type: "closed_fist",
        });

        this.dispatchEvent({
          type: "drag_end",
          object: this.selected,
          callback: () => {
            this.selected = null;
          },
        });
      } else {
        this.selected = null;
        this.dispatchEvent({
          type: "opened_fist",
        });
      }
    }
  }

  animate() {
    if (!this.target) return;

    this.targetBox3.setFromObject(this.target);
    this.objects.forEach((obj) => {
      this.objectBox3.setFromObject(obj);
      const targetCollision = this.targetBox3.intersectsBox(this.objectBox3);
      if (targetCollision) {
        obj.userData.hasCollision = true;
        if (this.closedFist && !this.selected && this.isDraggable) {
          this.selected = obj;
          this.dispatchEvent({
            type: "drag_start",
            object: obj,
          });
        }
        this.dispatchEvent({
          type: "collision",
          state: "on",
          object: obj,
        });
        obj.material.opacity = 0.4;
      } else {
        obj.material.opacity = 1;
        if (!this.selected) {
          this.dispatchEvent({
            type: "collision",
            state: "off",
            object: null,
          });
        }
      }
    });
    // if closedFist is true, the object will follow the target (cursor)
    if (this.selected && this.closedFist && this.isDraggable) {
      this.selected.position.lerp(this.target.position, 0.3);
    }
  }
}
