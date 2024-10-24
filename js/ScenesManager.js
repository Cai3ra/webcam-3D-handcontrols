import {
  Scene,
  PerspectiveCamera,
  Color,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  SpotLight,
  Clock,
} from "three";

export class ScenesManager {
  static scene;
  static camera;
  static renderer;
  static clock;

  static setup() {
    ScenesManager.scene = new Scene();
    ScenesManager.scene.background = new Color(0xcccccc);

    ScenesManager.camera = new PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    const isMobile = window.innerWidth < window.innerHeight;
    ScenesManager.camera.position.set(0, 0, isMobile ? 4 : 2);

    ScenesManager.clock = new Clock();

    ScenesManager.renderer = new WebGLRenderer({ antialias: true });
    ScenesManager.renderer.setSize(window.innerWidth, window.innerHeight);
    ScenesManager.renderer.setPixelRatio(window.devicePixelRatio);
    ScenesManager.renderer.shadowMap.enabled = true;

    const ambLight = new AmbientLight(0xffffff, 1);
    ScenesManager.scene.add(ambLight);
    const dirLight = new DirectionalLight(0xffffff, 1);
    dirLight.position.set(-30, 30, 30);
    ScenesManager.scene.add(dirLight);

    const light = new SpotLight(0xffffff, 4.5);
    light.position.set(0, 10, 5);
    light.angle = Math.PI * 0.2;
    light.decay = 0;
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500;
    light.shadow.bias = -0.000222;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    ScenesManager.scene.add(light);

    ScenesManager.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(ScenesManager.renderer.domElement);
  }

  static render() {
    ScenesManager.renderer.render(ScenesManager.scene, ScenesManager.camera);
  }
}
