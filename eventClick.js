import { MapControls } from "three/examples/jsm/controls/OrbitControls.js";
import {controls, camera, THREE} from "./main.js";

function moveCam(dx, dy, dz, dcx, dcy, dcz) {
    controls.autoRotate = false;
    var camPos = camera.position;
    camera.position.set(camPos.x + dx, camPos.y + dy, camPos.z + dz);
    controls.target = new THREE.Vector3(controls.target.x+dcx, controls.target.y+dcy, controls.target.z+dcz);
    controls.update();
}

export {moveCam};