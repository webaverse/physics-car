import * as THREE from 'three';
import metaversefile from 'metaversefile';
import { Vector3 } from 'three';

const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useLocalPlayer, useActivate, useScene, useInternals} = metaversefile;

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
    const scene = useScene();
    const physicsIds = [];
    const localPlayer = useLocalPlayer();
    const {camera} = useInternals();

    let vehicleObj;

    let velocity = new THREE.Vector3();
    let angularVelocity = new THREE.Vector3();
    let vehicle = null;
    let yaw = 0;
    let roll = 0;
    let pitch = 0;
    let enginePower = 0;
    let powerFactor = 0.10;
    let damping =1;
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
    let rayArray = [];
    let wheelArray = [];
    let pointArray = [];
    let sceneWheels = [];
    let moveSpeed = 0;
    let newRot = 0;

    // SFX
    let engineSound = null;
    let crashSound = null;

    //Suspension

    let suspensionMaxLength = 0.6;
    let wheelRadius = 0.35;
    let stiffness = 300;
    let damper = 25;
    let suspensionLengthArray = [];
    let wheelFriction = 1;
    let brakeForce = 70;
    let steeringAngle = 35;
    let actualSpeed = 0;


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

    const modelName = 'car/assets/supra.glb';
    let p1 = loadModel( { filePath: baseUrl, fileName: modelName, pos: { x: 0, y: 0, z: 0 } } ).then( result => { vehicleObj = result } );

    let loadPromisesArr = [ p1 ];

    Promise.all( loadPromisesArr ).then( models => {

        app.add( vehicleObj );

        const physicsId = physics.addBoxGeometry(
          new THREE.Vector3(0, 1.5, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(1, 0.1, 1.25), //0.5, 0.05, 1
          true,
          new THREE.Vector3(1,1,0),
          500
        );
        physicsIds.push(physicsId);
        
        vehicle = app.physicsObjects[0];
        window.vehicle = vehicle;
        vehicle.detached = true;

        vehicle.position.copy(app.position)
        physics.setTransform(vehicle);
        //physics.setMass(vehicle, 2000);


        app.traverse(o => {
                  
                  if(o.name === "sitPos") {
                    sitPos = o;
                    //console.log(o, "we have a sitPos");
                  }
                  if(o.name === "Glass") {
                    o.material = new THREE.MeshLambertMaterial( { color: 0x000000, opacity: 0.5, transparent: true} );
                    //console.log(o, "we have a sitPos");
                  }
                  if(o.name === "originFL") {
                    rayArray[0] = o;

                  }
                  if(o.name === "originFR") {
                    rayArray[1] = o;
                    
                  }
                  if(o.name === "originBL") {
                    rayArray[2] = o;
                    
                  }
                  if(o.name === "originBR") {
                    rayArray[3] = o;
                  }
                  if(o.name === "frontL") {
                    wheelArray[0] = o;

                  }
                  if(o.name === "frontR") {
                    wheelArray[1] = o;
                    
                  }
                  if(o.name === "backL") {
                    wheelArray[2] = o;
                    
                  }
                  if(o.name === "backR") {
                    wheelArray[3] = o;
                  }
                  //console.log(rayArray);
                  o.castShadow = true;
                });

                for (var i = 0; i < wheelArray.length; i++) {
                  let dum = new THREE.Object3D;
                  dum = wheelArray[i].clone();
                  scene.add(dum);
                  sceneWheels[i] = dum;
                  sceneWheels[i].updateMatrixWorld();
                  wheelArray[i].visible = false;
                }

               const listener = new THREE.AudioListener();
               camera.add( listener );

               engineSound = new THREE.PositionalAudio( listener );
               crashSound = new THREE.PositionalAudio( listener );
               const audioLoader = new THREE.AudioLoader();
                audioLoader.load( 'scenes/car/test2.mp3', function( buffer ) {
                      engineSound.setBuffer( buffer );
                      engineSound.setRefDistance( 5 );
                      engineSound.setVolume( 0.5 );
                      engineSound.setLoop(true);
                      
                });
                audioLoader.load( 'scenes/car/crashTemp.ogg', function( buffer ) {
                      crashSound.setBuffer( buffer );
                      crashSound.setRefDistance( 5 );
                      crashSound.setVolume( 0.5 );
                      //engineSound.setLoop(true);
                      
                });

                app.add(engineSound);
                app.add(crashSound);

                suspensionLengthArray[0] = 0.5;
                suspensionLengthArray[1] = 0.5;
                suspensionLengthArray[2] = 0.5;
                suspensionLengthArray[3] = 0.5;

                app.updateMatrixWorld();
    });
    useFrame(( { timeDiff } ) => {

      const _updateEngine = () => {
        if(engineSound) {

            const rpmStartPoint = -500;
            var spd = rpmStartPoint + (moveSpeed*3);
            engineSound.setDetune(spd);

        }
      }

      const _updateSuspension = () => {

      }

      const _updateRide = () => {
        if (sitSpec && localPlayer.avatar && rayArray.length > 0) {
          const {instanceId} = app;

          physics.disableGeometryQueries(vehicle);

          if(sitSpec) {
            if(sitSpec) {
              localPlayer.avatar.app.visible = false;
              let quat = new THREE.Quaternion(vehicle.quaternion.x, vehicle.quaternion.y, vehicle.quaternion.z, vehicle.quaternion.w);
              let right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
              let globalUp = new THREE.Vector3(0, 1, 0);
              let up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
              let forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);

              if(engineSound && !engineSound.isPlaying) {
                engineSound.play();
              }
              
              enginePower = 1;

              // IO
              if(keyW) {
                moveSpeed += powerFactor*2 * enginePower*55;
              }
              if(!keyW && actualSpeed > 0) {
                moveSpeed -= powerFactor*2 * enginePower*5;
              }
              if(!keyW && actualSpeed < 0) {
                moveSpeed += powerFactor*2 * enginePower*5;
              }
              if (keyS) {
                moveSpeed -= powerFactor*2 * enginePower*15;
              }
              if(keyA) {
                //newRot += powerFactor * moveSpeed/10;
                newRot = steeringAngle;
              }
              if (keyD) {
                //newRot -= powerFactor * moveSpeed/10;
                newRot = -steeringAngle;
              }
              if (keyShift) {
                if(moveSpeed > 0) {
                    //moveSpeed -= powerFactor*2 * brakeForce;
                }
              }

              moveSpeed *= 0.99;
              newRot *= 0.9;

              const downQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.5);
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

              for (var i = 0; i < rayArray.length; i++) {

                    var dir = new THREE.Vector3(); // create once an reuse it
                    let v1 = rayArray[i].position.clone();
                    let targetss = new THREE.Vector3();
                    rayArray[i].getWorldPosition(targetss);
                    let targetss2 = new THREE.Vector3();
                    wheelArray[i].getWorldPosition(targetss2);
                    let v2 = new THREE.Vector3().fromArray(pointArray[i].point);
                    dir.subVectors(targetss, v2);
                    //velocity.add(dir);
                    let force = 0;
                    let yOffset = 0;
                    force = Math.abs(1 / ((pointArray[i].point[1] + 0.4) - targetss.y))
                    //force * (1/pointArray[i].distance + 3);
                    //console.log(force);
                    let newVec = new THREE.Vector3(0,force*2,0);

                    let tempLinear = new THREE.Vector3();
                    let tempAngular = new THREE.Vector3();
                    physics.getLinearVelocity(vehicle, tempLinear);
                    physics.getAngularVelocity(vehicle, tempAngular);

                    let crossedVec = tempAngular.cross(new THREE.Vector3().fromArray(pointArray[i].point).sub(vehicle.position));

                    let pointVel = tempLinear.add(crossedVec);

                    let fx = 0;
                    let fy = 0;

                    let newRotVec = new THREE.Vector3(0,0,0);
                    let newPointVec = new THREE.Vector3(0,0,0);
                    var clampedRot = THREE.Math.clamp(newRot, -steeringAngle, steeringAngle)
                    fx = clampedRot / 2;
                    fy = pointVel.x;

                    newRotVec.x = fx * right.x;
                    newRotVec.y = fx * right.y;
                    newRotVec.z = fx * right.z;

                    newPointVec.x = fy * -up.x;
                    newPointVec.y = fy * -up.y;
                    newPointVec.z = fy * -up.z;

                    let rayDistance = new THREE.Vector3();
                    let pointVector =  new THREE.Vector3().fromArray(pointArray[i].point);
                    let originVector = targetss.clone();
                    rayDistance.x = (originVector.x - pointVector.x);
                    rayDistance.y = (originVector.y - pointVector.y);
                    rayDistance.z = (originVector.z - pointVector.z);

                    let rayMag = rayDistance.length();

                    let springLength = THREE.Math.clamp(rayMag - wheelRadius, 0, suspensionMaxLength);
                    //console.log(springLength);
                    let stiffnessForce = stiffness * (suspensionMaxLength - springLength);
                    let damperForce = damper * ((suspensionLengthArray[i] - springLength) / (timeDiff/1000));

                    let suspensionForce2 = new THREE.Vector3();
                    suspensionForce2.x = up.x * (stiffnessForce + damperForce);
                    suspensionForce2.y = up.y * (stiffnessForce + damperForce);
                    suspensionForce2.z = up.z * (stiffnessForce + damperForce);

                    suspensionLengthArray[i] = springLength;

                    let xForce = new THREE.Vector3();
                    

                    let zForce = new THREE.Vector3();
                    zForce.x = forward.x * (moveSpeed*0.5);
                    zForce.y = forward.y * (moveSpeed*0.5);
                    zForce.z = forward.z * (moveSpeed*0.5);

                    /*if(suspensionForce2.length() > 150) {
                        if(crashSound && !crashSound.isPlaying) {
                            crashSound.play();
                        }
                    }*/

                    let localVelocity = new THREE.Vector3();
                    let forwardDir = forward.clone().normalize();
                    let rightDir = right.clone().normalize();
                    physics.getLinearVelocity(vehicle, localVelocity);
                    actualSpeed = localVelocity.dot(forwardDir);
                    let rightDot = localVelocity.dot(rightDir);
                    let forwardVelocity = new THREE.Vector3();
                    let sidewayVelocity = new THREE.Vector3();

                    forwardVelocity.x = forwardDir.x * actualSpeed;
                    forwardVelocity.y = forwardDir.y * actualSpeed;
                    forwardVelocity.z = forwardDir.z * actualSpeed;

                    sidewayVelocity.x = rightDir.x * rightDot;
                    sidewayVelocity.y = rightDir.y * rightDot;
                    sidewayVelocity.z = rightDir.z * rightDot;

                    xForce.x = (right.x * -sidewayVelocity.x);
                    xForce.y = (right.y * -sidewayVelocity.x);
                    xForce.z = (right.z * -sidewayVelocity.x);

                    if(pointArray[i] === pointArray[0] || pointArray[i] === pointArray[1]) {

                        if(pointArray[i].distance < (springLength + wheelRadius*2)) {
                            

                            if(keyShift && actualSpeed > 0) {
                                let brakeVec = new THREE.Vector3();
                                brakeVec.x = -forward.x * brakeForce;
                                brakeVec.y = -forward.y * brakeForce;
                                brakeVec.z = -forward.z * brakeForce;
                                physics.addForceAtPos(vehicle, brakeVec, targetss);

                            }
                            physics.addForceAtPos(vehicle, suspensionForce2, targetss);
                            if(pointArray[i] === pointArray[0]) {
                                if(keyA) {
                                    newRotVec.x = fx * right.x;
                                    newRotVec.y = fx * right.y;
                                    newRotVec.z = fx * right.z;
                                }
                                if(keyD) {
                                    fx -= 2;
                                    newRotVec.x = fx * right.x;
                                    newRotVec.y = fx * right.y;
                                    newRotVec.z = fx * right.z;
                                    
                                }
                                physics.addForceAtPos(vehicle, new THREE.Vector3(newRotVec.x, newRotVec.y, newRotVec.z), targetss);
                            }

                            if(pointArray[i] === pointArray[1]) {
                                if(keyA) {
                                    fx += 2;
                                    newRotVec.x = fx * right.x;
                                    newRotVec.y = fx * right.y;
                                    newRotVec.z = fx * right.z;
                                }
                                if(keyD) {
                                    newRotVec.x = fx * right.x;
                                    newRotVec.y = fx * right.y;
                                    newRotVec.z = fx * right.z;
                                    
                                }
                                physics.addForceAtPos(vehicle, new THREE.Vector3(newRotVec.x, newRotVec.y, newRotVec.z), targetss);
                            }
                            

                            
                        }
                        
                    }
                    if(pointArray[i] === pointArray[2] || pointArray[i] === pointArray[3]) {
                        if(pointArray[i].distance < (springLength + wheelRadius*2)) {
                            physics.addForceAtPos(vehicle, suspensionForce2, targetss);
                            let accVec = new THREE.Vector3();
                            accVec.x = forward.x * moveSpeed * 1;
                            accVec.y = forward.y * moveSpeed * 1;
                            accVec.z = forward.z * moveSpeed * 1;
                            physics.addForceAtPos(vehicle, accVec, targetss);
                            
                        }
                        
                        //physics.addForceAtPos(vehicle, new THREE.Vector3(-newRotVec.x, -newRotVec.y, -newRotVec.z), targetss);
                        //physics.addForceAtPos(vehicle, new THREE.Vector3(-newPointVec.x, -newPointVec.y, -newPointVec.z), targetss);
                    }

                    let xNewForce = new THREE.Vector3();
                            //localVelocity.applyQuaternion(forward);
                            xNewForce.x = -sidewayVelocity.x * wheelFriction;
                            xNewForce.y = -sidewayVelocity.x * wheelFriction;
                            xNewForce.z = -sidewayVelocity.x * wheelFriction;

                    //physics.addForceAtPos(vehicle, xForce, targetss);
                            

                    

                    if(pointArray[i].distance < (springLength + wheelRadius*2)) {
                        if(pointArray[i] === pointArray[3]) {

                            let tempLinear = new THREE.Vector3();
                              
                            
                            
                            let tempAngular = new THREE.Vector3();
                              physics.getLinearVelocity(vehicle, tempLinear);
                              physics.getAngularVelocity(vehicle, tempAngular);

                              tempAngular.x *= 0.95;
                              tempAngular.y *= 0.95;
                              tempAngular.z *= 0.95;

                              tempLinear.x *= 0.95;
                              tempLinear.y *= 0.95;
                              tempLinear.z *= 0.95;

                              physics.setAngularVelocity(vehicle, tempAngular, true);
                              physics.setVelocity(vehicle, tempLinear, true);

                              //physics.addForce(vehicle, forward.multiplyScalar(moveSpeed*60));

                        }
                            
                        }

                    if(pointArray[i]) {

                        wheelArray[i].updateMatrix();
                        

                        let localPos = new THREE.Vector3();
                        app.localToWorld(localPos);
                        localPos.y = pointArray[i].point[1] + wheelRadius;
                        vehicle.worldToLocal(localPos);

                    if(pointArray[i].distance < (suspensionLengthArray[i] + (wheelRadius*1.5))) {
                      sceneWheels[i].position.setFromMatrixPosition( wheelArray[i].matrixWorld );
                      sceneWheels[i].position.y = pointArray[i].point[1] + wheelRadius;

                      let wheelRpm = Math.abs(moveSpeed) > 1 ? Math.abs(moveSpeed) / 10 : 0;
                      
                      sceneWheels[i].quaternion.copy(vehicle.quaternion);

                      if(sceneWheels[i] === sceneWheels[2]) {
                        sceneWheels[i].rotateX(wheelRpm);
                      }

                      if(sceneWheels[i] === sceneWheels[3]) {
                        sceneWheels[i].rotateX(wheelRpm);
                      }
              
                      if(sceneWheels[i] === sceneWheels[0]) {
                        var clampedRot = THREE.Math.clamp(newRot, -35, 35);
                        sceneWheels[i].rotateY(THREE.Math.degToRad(clampedRot));
                      }

                      if(sceneWheels[i] === sceneWheels[1]) {
                        var clampedRot = THREE.Math.clamp(newRot, -35, 35);
                        sceneWheels[i].rotateY(THREE.Math.degToRad(clampedRot));
                      }
                    }
                    else {
                      sceneWheels[i].position.setFromMatrixPosition( wheelArray[i].matrixWorld );
                      sceneWheels[i].quaternion.copy(vehicle.quaternion);
                      sceneWheels[i].updateMatrixWorld();
                    }
                      app.position.copy(vehicle.position);
                      app.quaternion.copy(vehicle.quaternion);
                      app.updateMatrixWorld();
                      sceneWheels[i].updateMatrixWorld();
                  }
                }

              //Applying velocities
              let rasa = new THREE.Vector3();
              physics.getLinearVelocity(vehicle, rasa);

              let wheelForward = new THREE.Vector3(0, 0, 1).applyQuaternion(sceneWheels[0].quaternion);
              
              _updateEngine();

              let wheelRpm = Math.abs(rasa.length()) > 1 ? Math.abs(rasa.length()) / 100 : 0;

              
            }
          }
        }
        if(app && vehicle && sceneWheels.length >= 4) {
          //Applying physics transform to app
          
          
          

          for (var i = 0; i < sceneWheels.length; i++) {
            
          }
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
