import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GUI } from 'dat.gui';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, CENTER} from './three-mesh-bvh/build/index.module.js';

// Setup
var osaka, osakaBox, obj, districts;
var notSame = -1;

var raycaster, mouse, INTERSECTED;
var intersects = [];
var controls, camera, renderer, scene, composer;

import { moveCam } from './eventClick.js';
var dx, dy, dz, dcx, dcy, dcz; // movement for camera position/ controls.target
var camLoop = 0;
var fixed = false;

function init() {
  return new Promise((resolve,reject)=>{
    raycaster = new THREE.Raycaster();
    raycaster.layers.set( 1 );

    mouse = new THREE.Vector2();
    

    scene = new THREE.Scene();
    {
      scene.background = new THREE.Color("rgb(173, 219, 225)");
      // ADD FOG LATER
    }
    scene.updateMatrixWorld(true);

    // CAMERA
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 10, 14000 );
    camera.position.set(-5000,5200,5000);
    scene.add(camera)

    // LIGHTS
    var ambientLight = new THREE.AmbientLight( 0xffffff, 0.8 );
    scene.add( ambientLight );
    var dirLight = new THREE.DirectionalLight( 0xefefff, .2);
    dirLight.position.set( 100, 100, 100 );
    scene.add( dirLight );

    // RENDERER
    renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#bg'),
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // NATURAL ORBIT CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = .09;
    controls.enablePan = false;
    controls.enableRotate = false;
    controls.enableZoom = false;

    // POST-PROCESSING
    composer = new EffectComposer(renderer);
    var renderPass = new RenderPass(scene, camera); 
    composer.addPass(renderPass);
    // const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera, outlineObj); 
    // outlinePass.renderToScreen = true;
    // outlinePass.outlineObj = outlineObj;
    // composer.addPass(outlinePass);
    // ADD SHADER PASS HERE

    var gui = new GUI();
    var cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera.position, 'z', 0, 5000);
    cameraFolder.add(camera.position, 'y', 0, 5000);
    cameraFolder.add(camera.position, 'x', 0, 5000);

    // LOAD OSAKA
    var loader = new GLTFLoader();
    loader.load('./components/models/osaka_separate/osaka.gltf', function(gltf) {
        osaka = gltf.scene;

        obj = osaka.children.slice(7,16);
        districts = obj.slice(2,9);
        console.log(osaka);
        
        // CENTERING MODEL
        osakaBox = new THREE.Box3().setFromObject(osaka);
        for (var ind = 7; ind < 16; ind++) {
          osaka.children[ind].position.x -= (osakaBox.max.x + osakaBox.min.x)/2;
          osaka.children[ind].position.z -= (osakaBox.max.z + osakaBox.min.z)/2;
        }  
        
        // buildings
        for (let i = 2; i < 9; i++) {
          if (obj[i].name == "DistrictOsakaCastle")
            obj[i].name = "DistrictOsaka Castle";
          else if (obj[i].name == "DistrictExtra")
            obj[i].name = "DistrictOther Districts";
          
          obj[i].geometry.computeBoundingBox();
          //scene.add(new THREE.BoxHelper(obj[i], 0xad322a));
          //console.log(obj[i].name, obj[i].geometry.boundingBox);
          changeColor(obj[i], 0x404040);
        }

        // highways
        changeColor(obj[1], 0x6b6b6b);

        scene.add(osaka);
    }, undefined, function (e) {
        console.error(e);
    });

    setTimeout(()=>{
      resolve();
    ;} , 5000);
  });
}

async function bvh() {
  console.log('starting init');
  await init()
  console.log('running bvh');

  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;

  for (let i = 0; i < districts.length; i++) {
    districts[i].layers.enable(1);
    districts[i].geometry.computeBoundsTree({setBoundingBox:true});
  }
}

function changeColor(obj, hexColor) {
  var newMat = obj.material.clone();
  newMat.color.setHex(hexColor);
  obj.material.dispose();
  obj.material = newMat;
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  
  animate();
}

window.addEventListener('mousemove', onDocumentMouseMove, false);
function onDocumentMouseMove( event ) 
{
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

var zoom;
var moving = false;
var districtInter;
document.getElementById("bg").onclick = function() {zoom = true};

async function update() {
  raycaster.setFromCamera( mouse, camera );
  raycaster.firstHitOnly = true;
  intersects = raycaster.intersectObjects(districts);
  if (intersects.length > 0 && intersects[0].object.name=="DistrictOther Districts")
    zoom = false;
  if (zoom == true && intersects.length > 0) {
    $("#districtTitle").css({"opacity": .2});
    $("#districtTitle").text("");
    moving = true;
    districtInter = intersects[0];
    //districtInter.material.color.setHex( 0xf2f2f2 );
    var boundBox = districtInter.object.geometry.boundingBox;
    var boxPos = new THREE.Vector3((boundBox.max.x+boundBox.min.x)/2, (boundBox.max.y+boundBox.min.y)/2, (boundBox.max.z+boundBox.min.z)/2);
    dx = (boxPos.x - camera.position.x)/110; // 180 frames for 3 seconds
    dy = (boxPos.y + 700 - camera.position.y)/110;
    dz = (boxPos.z - camera.position.z)/110; 
    dcx = (boxPos.x - controls.target.x)/110;
    dcy = (boxPos.y - controls.target.y)/110;
    dcz = (boxPos.z - controls.target.z)/110;
  }
  
  else {
    if ( intersects.length > 0 )
    {
      // if the closest object intersected is not the currently stored intersection object
      if ( intersects[ 0 ].object != INTERSECTED ) 
      {
        var name = intersects[0].object.name.substr(8,);
        if (name.indexOf("(") != -1)
          name = name.substring(0,name.indexOf("(")) + " " + name.substring(name.indexOf("("),);
        
        $("#districtTitle").css({"opacity": 1});
        $("#districtTitle").text("" + name);
        // restore previous intersection object (if it exists) to its original color
        if (INTERSECTED) 
          INTERSECTED.material.color.setHex(0x404040);
        // store reference to closest object as current intersection object
        INTERSECTED = intersects[ 0 ].object;
        // set a new color for closest object
        INTERSECTED.material.color.setHex( 0xf2f2f2 );
      }

      notSame = 0;
    } 
    else // there are no intersections
    {
      if (notSame <= 20 || notSame == -1) {
        notSame += 1;
      }
      else {
        $("#districtTitle").css({"opacity": .2});
        $("#districtTitle").text("");
        if ( INTERSECTED ) 
          INTERSECTED.material.color.setHex(0x404040);
        INTERSECTED = null;
        notSame = -1;
      }
    }
  }
  controls.update();
}

import { ID } from "./loadScreen.js";
async function load() {
  await bvh();
  // $("#load").addClass("opac");
  console.log('added');
  $("#loadText").text("");
  clearInterval(ID);
  $(".load").hide().fadeIn(3500);
}

// ANIMATION LOOP
async function animate() {
  requestAnimationFrame(animate);
  render();
  if (fixed) {
    controls.update();
  }
  else if (!moving)
    update();
  else {
    moveCam(dx, dy, dz, dcx, dcy, dcz);
    console.log(camLoop);
    camLoop += 1;
    if (camLoop == 110) {
      zoom = false;
      moving = false;
      controls.autoRotate = true;
      camLoop = 0;
      fixed = true;
      $("#xout").attr("src", "greyx.png");
    }
  }
}

function render() {
  renderer.render(scene, camera);
}

load().then(animate);

export {controls, camera, scene, render, THREE};