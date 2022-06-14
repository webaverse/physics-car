import * as THREE from 'three';
import metaversefile from 'metaversefile';
import { Vector3 } from 'three';

const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useLocalPlayer, useActivate} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1'); 

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
window.isDebug = false


export default () => {  

    const app = useApp();
    window.heli = app
    const physics = usePhysics();
    window.physics = physics;
    const physicsIds = [];
    const localPlayer = useLocalPlayer();

    let vehicleObj;

    let velocity = new THREE.Vector3();
    let angularVelocity = new THREE.Vector3();
    let vehicle = null;
    let yaw = 0;
    let roll = 0;
    let pitch = 0;
    let enginePower = 0;
    let powerFactor = 0.10;
    let damping = 5;
    let rotor = null;
    let sitSpec = null;

    // Inputs
    let keyW = false;
    let keyA = false;
    let keyS = false;
    let keyD = false;
    let keyShift = false;
    let keyQ = false;
    let keyE = false;
    let keyC = false;

    let sitPos = null;

    let sitAnim = null;

    function onDocumentKeyDown(event) {
        var keyCode = event.which;
        if (keyCode == 87) { // W 
            keyW = true;
        }
        if (keyCode == 83) { // S 
            keyS = true;
        }
        if (keyCode == 65) { // A 
            keyA = true;
        }
        if (keyCode == 68) { // D 
            keyD = true;
        }
        if (keyCode == 69) { // E 
            keyE = true;
        }
        if (keyCode == 81) { // Q 
            keyQ = true;
        }
        if (keyCode == 16) { // L shift 
            keyShift = true;
        }
        if (keyCode == 67) { // C
            keyC = true;
        }
    };
    function onDocumentKeyUp(event) {
        var keyCode = event.which;
        if (keyCode == 87) { // W 
            keyW = false;
        }
        if (keyCode == 83) { // S 
            keyS = false;
        }
        if (keyCode == 65) { // A 
            keyA = false;
        }
        if (keyCode == 68) { // D 
            keyD = false;
        }
        if (keyCode == 69) { // E 
            keyE = false;
        }
        if (keyCode == 81) { // Q 
            keyQ = false;
        }
        if (keyCode == 16) { // L shift 
            keyShift = false;
        }
        if (keyCode == 67) { // C
            keyC = false;
        }
    };

    const _unwear = () => {
      if (sitSpec) {
        const sitAction = localPlayer.getAction('sit');
        if (sitAction) {
          localPlayer.removeAction('sit');
          // localPlayer.avatar.app.visible = true;
          // physics.setCharacterControllerPosition(localPlayer.characterController, app.position);
          sitSpec = null;
        }
      }
    };

    const loadModel = ( params ) => {

        return new Promise( ( resolve, reject ) => {
                
            const { gltfLoader } = useLoaders();
            gltfLoader.load( params.filePath + params.fileName, function( gltf ) {
                resolve( gltf.scene );     
            });
        })
    }

    const modelName = 'car/assets/car.glb';
    const modelName2 = 'heli/hoverboard_static.fbx';
    // const modelName = 'copter_var2_v2_vian.glb';
    // const modelName = 'copter_var3_v2_vian.glb';
    let p1 = loadModel( { filePath: baseUrl, fileName: modelName, pos: { x: 0, y: 0, z: 0 } } ).then( result => { vehicleObj = result } );
    let p2 = loadModel( { filePath: baseUrl, fileName: modelName2, pos: { x: 0, y: 0, z: 0 } } ).then( result => { vehicleObj = result } );

    let loadPromisesArr = [ p1 ];
    let loadPromisesArr2 = [ p2 ];

    Promise.all( loadPromisesArr ).then( models => {

        app.add( vehicleObj );

        const physicsId = physics.addBoxGeometry(
          new THREE.Vector3(0, 0.5, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(1, 0.05, 2), //0.5, 0.05, 1
          true
        );
        physicsIds.push(physicsId);
        
        vehicle = app.physicsObjects[0];
        window.vehicle = vehicle;
        vehicle.detached = true;

        vehicle.position.copy(app.position)
        physics.setTransform(vehicle);

    });

    Promise.all( loadPromisesArr2 ).then( models => {



        //app.add( vehicleObj );

        /*const physicsId = physics.addBoxGeometry(
          new THREE.Vector3(0, 0.5, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(0.5, 0.05, 1),
          true
        );
        physicsIds.push(physicsId);
        
        vehicle = app.physicsObjects[0];
        window.vehicle = vehicle;
        vehicle.detached = true;

        vehicle.position.copy(app.position)
        physics.setTransform(vehicle);*/

        sitAnim = vehicleObj;

        console.log(vehicleObj);

    });

    useFrame(( { timeDiff } ) => {

      const _updateRide = () => {
        if (sitSpec && localPlayer.avatar) {
          const {instanceId} = app;

          if(sitSpec.mountType) {
            if(sitSpec.mountType === "flying") {
               //localPlayer.avatar.app.visible = false;
              physics.enableGeometry(vehicle);
              let quat = new THREE.Quaternion(vehicle.quaternion.x, vehicle.quaternion.y, vehicle.quaternion.z, vehicle.quaternion.w);
              let right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
              let globalUp = new THREE.Vector3(0, 1, 0);
              let up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
              let forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
              let rayArray = [];
              let pointArray = [];

              let propSpec = app.getComponent("propeller");
              if(propSpec) {
                app.traverse(o => {
                  // Find propeller obj
                  if(o.name === propSpec.name) { rotor = o; }
                  if(o.name === "sitPos") {
                    sitPos = o;
                    //console.log(o, "we have a sitPos");
                  }
                  if(o.name === "frontL") {
                    rayArray[0] = o;

                  }
                  if(o.name === "frontR") {
                    rayArray[1] = o;
                    
                  }
                  if(o.name === "backL") {
                    rayArray[2] = o;
                    
                  }
                  if(o.name === "backR") {
                    rayArray[3] = o;
                  }
                  //console.log(rayArray);
                  o.castShadow = true;
                });
              }
              enginePower = 1;

              // IO
              if(keyW) {
                velocity.x += forward.x * powerFactor*4 * enginePower;
                velocity.y += forward.y * powerFactor*4 * enginePower;
                velocity.z += forward.z * powerFactor*4 * enginePower;
                //angularVelocity.x += right.x * powerFactor/2 * enginePower;
                //angularVelocity.y += right.y * powerFactor/2 * enginePower;
                //angularVelocity.z += right.z * powerFactor/2 * enginePower;
              }
              if (keyS) {
                velocity.x -= forward.x * powerFactor * enginePower;
                velocity.y -= forward.y * powerFactor * enginePower;
                velocity.z -= forward.z * powerFactor * enginePower;
                //angularVelocity.x -= right.x * powerFactor/2 * enginePower;
                //angularVelocity.y -= right.y * powerFactor/2 * enginePower;
                //angularVelocity.z -= right.z * powerFactor/2 * enginePower;
              }
              if(keyA) {
                //angularVelocity.x -= forward.x * powerFactor/2 * enginePower;
                //angularVelocity.y -= forward.y * powerFactor/2 * enginePower;
                //angularVelocity.z -= forward.z * powerFactor/2 * enginePower;
                angularVelocity.x += up.x * powerFactor * enginePower;
                angularVelocity.y += up.y * powerFactor * enginePower
                angularVelocity.z += up.z * powerFactor * enginePower;
              }
              if (keyD) {
                //angularVelocity.x += forward.x * powerFactor/2 * enginePower;
                //angularVelocity.y += forward.y * powerFactor/2 * enginePower;
                //angularVelocity.z += forward.z * powerFactor/2 * enginePower;
                angularVelocity.x -= up.x * powerFactor * enginePower;
                angularVelocity.y -= up.y * powerFactor * enginePower;
                angularVelocity.z -= up.z * powerFactor * enginePower;
              }
              let gravity = new THREE.Vector3(0, -9.81, 0);
              let gravityCompensation = new THREE.Vector3(-gravity.x, -gravity.y, -gravity.z).length();
              gravityCompensation *= timeDiff/1000;
              gravityCompensation *= 0.95;
              let dot = globalUp.dot(up);
              gravityCompensation *= Math.sqrt(THREE.MathUtils.clamp(dot, 0, 1));

              let vertDamping = new THREE.Vector3(0, velocity.y, 0).multiplyScalar(-0.01);
              let vertStab = up.clone();
              vertStab.multiplyScalar(gravityCompensation);
              vertStab.add(vertDamping);
              vertStab.multiplyScalar(enginePower);

              // Fake gravity
              localVector.copy(new THREE.Vector3(0,-9.81, 0)).multiplyScalar(timeDiff/1000);
              velocity.add(localVector);

              velocity.add(vertStab);

              // Positional damping
              velocity.x *= 0.97;
              velocity.z *= 0.97;

              //Stabilization
              let rotStabVelocity = new THREE.Quaternion().setFromUnitVectors(up, globalUp);
              rotStabVelocity.x *= 0.97;
              rotStabVelocity.y *= 0.97;
              rotStabVelocity.z *= 0.97;
              rotStabVelocity.w *= 0.97;
              let rotStabEuler = new THREE.Euler().setFromQuaternion(rotStabVelocity);
              
              angularVelocity.x += rotStabEuler.x * enginePower / damping;
              angularVelocity.y += rotStabEuler.y * enginePower/ damping;
              angularVelocity.z += rotStabEuler.z * enginePower/ damping;

              angularVelocity.x *= 0.97;
              angularVelocity.y *= 0.97;
              angularVelocity.z *= 0.97;

              const downQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.5);
              let downRay = physics.raycast(vehicle.position, downQuat);
              let target = new THREE.Vector3();
              let target2 = new THREE.Vector3();
              let target3 = new THREE.Vector3();
              let target4 = new THREE.Vector3();
               rayArray[0].getWorldPosition( target );
               rayArray[1].getWorldPosition( target2 );
               rayArray[2].getWorldPosition( target3 );
               rayArray[3].getWorldPosition( target4 );
               pointArray[0] = physics.raycast(target, rayArray[0].quaternion);
               pointArray[1] = physics.raycast(target2, rayArray[1].quaternion);
               pointArray[2] = physics.raycast(target3, rayArray[2].quaternion);
               pointArray[3] = physics.raycast(target4, rayArray[3].quaternion);
/*
              if(downRay) {
                let force = 0;
                force = Math.abs(1 / (downRay.point[1] - vehicle.position.y))
                physics.addForce(vehicle, new THREE.Vector3(0, force, 0));
              }*/

              for (var i = 0; i < rayArray.length; i++) {
            
                  if(pointArray[i] && pointArray[i].distance < 2) {
                    var dir = new THREE.Vector3(); // create once an reuse it
                    let v1 = rayArray[i].position.clone();
                    let targetss = new THREE.Vector3();
                    rayArray[i].getWorldPosition(targetss);
                    let v2 = new THREE.Vector3().fromArray(pointArray[i].point);
                    dir.subVectors(targetss, v2);
                    //velocity.add(dir);
                    let force = 0;
                    let yOffset = 0;
                    force = Math.abs(1 / ((pointArray[i].point[1]) - targetss.y))
                    force * (1/pointArray[i].distance + 2);
                    //console.log(force);
                    physics.addForceAtPos(vehicle, new THREE.Vector3(0,force,0).multiplyScalar(5.5+Math.abs(velocity.y)), targetss);
                  }
                }

              //Applying velocities
              physics.setVelocity(vehicle, velocity, false);
              //physics.addForce(vehicle, new THREE.Vector3(velocity.x, velocity.y, velocity.z));
              physics.setAngularVelocity(vehicle, angularVelocity, false);

              if (rotor) { rotor.rotateZ(enginePower * 10); }
            }
          }
        }
        if(app && vehicle) {
          //Applying physics transform to app
          app.position.copy(vehicle.position);
          app.quaternion.copy(vehicle.quaternion);
          app.updateMatrixWorld();
          // localPlayer.avatar.object.scene.children[0].children[0].quaternion.copy(vehicle.quaternion);
        }
      };
      _updateRide();

    });

    useActivate(() => {

      sitSpec = app.getComponent('sit');
      if (sitSpec) {
        let rideMesh = null;

        const {instanceId} = app;

        const rideBone = sitSpec.sitBone ? rideMesh.skeleton.bones.find(bone => bone.name === sitSpec.sitBone) : null;
        const sitAction = {
          type: 'sit',
          time: 0,
          animation: sitSpec.subtype,
          controllingId: instanceId,
          controllingBone: rideBone,
        };
        localPlayer.setControlAction(sitAction);
        app.wear(false);
      }
    
    });

    app.addEventListener('wearupdate', e => {
      if(e.wear) {
        document.addEventListener("keydown", onDocumentKeyDown, false);
        document.addEventListener('keyup', onDocumentKeyUp);
      } else {
        document.removeEventListener("keydown", onDocumentKeyDown, false);
        document.removeEventListener('keyup', onDocumentKeyUp);
        _unwear();
      }
    });

    useCleanup(() => {
      for (const physicsId of physicsIds) {
       physics.removeGeometry(physicsId);
      }
      _unwear();
    });

    return app;
}
