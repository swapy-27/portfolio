import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = () => {
    return new Promise<GLTF | null>(async (resolve, reject) => {
      try {
        const encryptedBlob = await decryptFile(
          "/models/character.enc?v=2",
          "MyCharacter12"
        );
        const blobUrl = URL.createObjectURL(new Blob([encryptedBlob]));

        let character: THREE.Object3D;
        loader.load(
          blobUrl,
          async (gltf) => {
            character = gltf.scene;
            await renderer.compileAsync(character, camera, scene);
            character.traverse((child: any) => {
              if (child.isMesh) {
                const mesh = child as THREE.Mesh;

                // Dark neutral clothing and warm accents to fit the charcoal and copper palette
                if (mesh.material) {
                  if (mesh.parent?.name === "BODYSHIRT") { // The shirt group
                    const newMat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
                    newMat.color = new THREE.Color("#252a31");
                    mesh.material = newMat;
                  } else if (mesh.name === "Pant") {
                    const newMat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
                    newMat.color = new THREE.Color("#0d0d0f");
                    mesh.material = newMat;
                  } else if (mesh.name === "CAP001" || mesh.name === "CAP002") {
                    const newMat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
                    newMat.color = new THREE.Color("#24211f");
                    mesh.material = newMat;
                  } else if (mesh.name === "screenlight") {
                    const newMat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
                    newMat.color = new THREE.Color("#6b4a36");
                    newMat.emissive = new THREE.Color("#c98f5e");
                    newMat.emissiveIntensity = 1.2;
                    mesh.material = newMat;
                  }
                }

                child.castShadow = true;
                child.receiveShadow = true;
                mesh.frustumCulled = true;
              }
            });

            // Subtle proportion tweak: slightly larger head, flatter cap crown
            const headBone = character.getObjectByName("spine006");
            if (headBone) headBone.scale.set(1.05, 1.03, 1.05);

            const capCrown = character.getObjectByName("CAP001") as THREE.Mesh | null;
            if (capCrown && capCrown.geometry) {
              const capGeometry = capCrown.geometry.clone();
              capGeometry.computeBoundingBox();
              const capCenter = new THREE.Vector3();
              capGeometry.boundingBox?.getCenter(capCenter);
              capGeometry.translate(-capCenter.x, -capCenter.y, -capCenter.z);
              capGeometry.scale(1.04, 0.82, 1.04);
              capGeometry.translate(capCenter.x, capCenter.y, capCenter.z);
              capCrown.geometry = capGeometry;
            }

            resolve(gltf);
            setCharTimeline(character, camera);
            setAllTimeline();
            character!.getObjectByName("footR")!.position.y = 3.36;
            character!.getObjectByName("footL")!.position.y = 3.36;

            // Monitor scale is handled by GsapScroll.ts animations

            dracoLoader.dispose();
          },
          undefined,
          (error) => {
            console.error("Error loading GLTF model:", error);
            reject(error);
          }
        );
      } catch (err) {
        reject(err);
        console.error(err);
      }
    });
  };

  return { loadCharacter };
};

export default setCharacter;
