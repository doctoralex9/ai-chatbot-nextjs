'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface RobotStageHandle {
  setActive: () => void;
  setIdle:   () => void;
}

interface RobotStageProps {
  keepIdle?: boolean;
  entrance?: 'slide' | 'zoom';
}

// +54° at idle — left side of model faces camera, matching old ear-visible pose.
// Near-zero at session — model turns to face the user when chatting.
const Y_IDLE    = +Math.PI * 0.30;
const Y_SESSION =  0.15;
const BASE_Y    =  0;

const RobotStage = forwardRef<RobotStageHandle, RobotStageProps>(
  ({ keepIdle = false, entrance = 'slide' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const robotRef  = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gsapRef   = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wobbleRef = useRef<any>(null);

    useEffect(() => {
      let cancelled = false;
      const teardowns: (() => void)[] = [];
      const idle       = keepIdle;
      const entranceMode = entrance;

      (async () => {
        const [THREE, { gsap }] = await Promise.all([
          import('three'),
          import('gsap'),
        ]);
        if (cancelled || !canvasRef.current || !containerRef.current) return;
        gsapRef.current = gsap;

        const canvas = canvasRef.current;
        const cont   = containerRef.current;
        let W = cont.clientWidth  || 440;
        let H = cont.clientHeight || 620;

        const scene  = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
        camera.position.set(0, -0.1, 3.4);
        camera.lookAt(0, 0.16, 0);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(W, H, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping         = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        teardowns.push(() => renderer.dispose());

        // ── Environment map ───────────────────────────────────────────────
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let RoomEnv: any = null;
          try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const m = await import('three/addons/environments/RoomEnvironment.js');
            RoomEnv = m.RoomEnvironment;
          } catch {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const m = await import('three/examples/jsm/environments/RoomEnvironment.js');
            RoomEnv = m.RoomEnvironment;
          }
          if (RoomEnv) {
            const pmrem  = new THREE.PMREMGenerator(renderer);
            const envTex = pmrem.fromScene(new RoomEnv(), 0.04).texture;
            scene.environment = envTex;
            pmrem.dispose();
            teardowns.push(() => envTex.dispose());
          }
        } catch { /* no env map — graceful degradation */ }

        // ── Lights ────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0x06080f, 2));

        const key = new THREE.DirectionalLight(0xffffff, 6);
        key.position.set(4, 6, 5);
        scene.add(key);

        const rim = new THREE.DirectionalLight(0xddd8d0, 10);
        rim.position.set(-5, 3, -4);
        scene.add(rim);

        const rimAccent = new THREE.PointLight(0x8899aa, 3, 3.5);
        rimAccent.position.set(-0.85, 1.0, -0.8);
        scene.add(rimAccent);

        // ── Load GLB model ────────────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let GLTFLoader: any = null;
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const m = await import('three/addons/loaders/GLTFLoader.js');
          GLTFLoader = m.GLTFLoader;
        } catch {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const m = await import('three/examples/jsm/loaders/GLTFLoader.js');
          GLTFLoader = m.GLTFLoader;
        }

        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gltf = await new Promise<any>((resolve, reject) => {
          new GLTFLoader().load('/soulless.glb', resolve, undefined, reject);
        });

        if (cancelled) return;

        const model = gltf.scene;

        // Auto-scale: fit the model inside ~1.8 scene units (head fills the frame)
        const box    = new THREE.Box3().setFromObject(model);
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 1.8 / maxDim;
        model.scale.setScalar(scale);

        // Center the model on its bounding-box midpoint after scaling
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // Dispose model geometry/materials on teardown
        teardowns.push(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          model.traverse((obj: any) => {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
            else obj.material?.dispose();
          });
        });

        // Wrap in a group so all GSAP tweens target one stable ref
        const g = new THREE.Group();
        g.add(model);
        g.rotation.y = Y_IDLE;
        g.position.set(0, BASE_Y, 0);
        scene.add(g);
        robotRef.current = g;

        // ── Render loop ───────────────────────────────────────────────────
        const tick = () => renderer.render(scene, camera);
        gsap.ticker.add(tick);
        teardowns.push(() => gsap.ticker.remove(tick));

        // ── Resize ────────────────────────────────────────────────────────
        const onResize = (entries: ResizeObserverEntry[]) => {
          const { width, height } = entries[0].contentRect;
          if (width === 0 || height === 0) return;
          W = width; H = height;
          camera.aspect = W / H;
          camera.updateProjectionMatrix();
          renderer.setSize(W, H, false);
        };
        const ro = new ResizeObserver(onResize);
        ro.observe(cont);
        teardowns.push(() => ro.disconnect());

        // ── Entrance → idle or session ────────────────────────────────────
        if (entranceMode === 'zoom') {
          // Pop-scale in from nothing + spin on Y into idle pose
          g.scale.setScalar(0.01);
          g.rotation.y = Y_IDLE + 1.8;

          gsap.to(g.scale, {
            x: 1, y: 1, z: 1,
            duration: 1.25, ease: 'back.out(1.4)', delay: 0.3,
          });
          gsap.to(g.rotation, {
            y: Y_IDLE,
            duration: 1.25, ease: 'power3.out', delay: 0.3,
            onComplete: () => {
              wobbleRef.current = gsap.to(g.rotation, {
                y: Y_IDLE + 0.08, duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut',
              });
            },
          });
        } else {
          // Default: slide up from below
          gsap.fromTo(
            g.position,
            { y: BASE_Y - 0.8 },
            {
              y: BASE_Y, duration: 1.4, ease: 'power3.out', delay: 0.2,
              onComplete: () => {
                if (idle) {
                  wobbleRef.current = gsap.to(g.rotation, {
                    y: Y_IDLE + 0.08, duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut',
                  });
                } else {
                  gsap.to(g.rotation, {
                    y: Y_SESSION, duration: 1.8, ease: 'power2.inOut', delay: 0.4,
                    onComplete: () => {
                      wobbleRef.current = gsap.to(g.rotation, {
                        y: Y_SESSION + 0.06, duration: 5.5, yoyo: true, repeat: -1, ease: 'sine.inOut',
                      });
                    },
                  });
                }
              },
            }
          );
        }
      })();

      return () => {
        cancelled = true;
        wobbleRef.current?.kill();
        teardowns.forEach(fn => fn());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setActive = useCallback(() => {
      const gsap = gsapRef.current;
      const g    = robotRef.current;
      if (!gsap || !g) return;
      wobbleRef.current?.kill();
      gsap.to(g.rotation, {
        y: Y_SESSION, duration: 1.1, ease: 'power2.inOut',
        onComplete: () => {
          wobbleRef.current = gsap.to(g.rotation, {
            y: Y_SESSION + 0.06, duration: 5.5, yoyo: true, repeat: -1, ease: 'sine.inOut',
          });
        },
      });
    }, []);

    const setIdle = useCallback(() => {
      const gsap = gsapRef.current;
      const g    = robotRef.current;
      if (!gsap || !g) return;
      wobbleRef.current?.kill();
      gsap.to(g.rotation, {
        y: Y_IDLE, duration: 1.5, ease: 'power2.inOut',
        onComplete: () => {
          wobbleRef.current = gsap.to(g.rotation, {
            y: Y_IDLE + 0.08, duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut',
          });
        },
      });
    }, []);

    useImperativeHandle(ref, () => ({ setActive, setIdle }), [setActive, setIdle]);

    return (
      <section
        data-slot="robot"
        ref={containerRef}
        aria-label="RiskRadar AI assistant"
        className="relative w-full h-full"
      >
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-arc"  aria-hidden="true" />
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </section>
    );
  }
);

RobotStage.displayName = 'RobotStage';
export default RobotStage;
