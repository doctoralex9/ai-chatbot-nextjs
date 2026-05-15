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
}

const Y_IDLE    = -Math.PI * 0.42;
const Y_SESSION =  0.15;
const BASE_Y    =  0;

const RobotStage = forwardRef<RobotStageHandle, RobotStageProps>(
  ({ keepIdle = false }, ref) => {
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
      const idle = keepIdle;

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

        // ── Scene ──────────────────────────────────────────────────────────
        const scene = new THREE.Scene();

        // ── Camera ─────────────────────────────────────────────────────────
        // FOV 34, positioned at Z=3.4 centered on head mid-point (y=0.12)
        const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
        camera.position.set(0, 0.12, 3.4);
        camera.lookAt(0, 0.12, 0);

        // ── Renderer ───────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(W, H, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping         = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.4;
        teardowns.push(() => renderer.dispose());

        // ── Lights ─────────────────────────────────────────────────────────
        // Dim blue-tinted ambient so the very darkest areas still read as metal
        scene.add(new THREE.AmbientLight(0x06080f, 3));

        // Key: strong white from upper-right-front — primary specular
        const key = new THREE.DirectionalLight(0xffffff, 16);
        key.position.set(4, 6, 5);
        scene.add(key);

        // Rim: intense blue-white from upper-left-back — creates the glowing silhouette
        const rim = new THREE.DirectionalLight(0x5577ff, 28);
        rim.position.set(-5, 3, -4);
        scene.add(rim);

        // Top accent: cold blue from directly above
        const top = new THREE.DirectionalLight(0x8899cc, 6);
        top.position.set(0, 8, 2);
        scene.add(top);

        // Rim accent: blue point light near the back-top of the head
        const rimAccent = new THREE.PointLight(0x2244ff, 10, 3.5);
        rimAccent.position.set(-0.85, 1.0, -0.8);
        scene.add(rimAccent);

        // Eye glow: blue point in front of the visor area
        const eyeGlow = new THREE.PointLight(0x003399, 5, 2.5);
        eyeGlow.position.set(0.1, 0.12, 0.85);
        scene.add(eyeGlow);

        // ── Materials ──────────────────────────────────────────────────────
        // PBR metallic dark: MeshStandardMaterial looks dramatically better
        // than Phong for dark shiny metal surfaces under directional lights.
        const matBody = new THREE.MeshStandardMaterial({
          color:     new THREE.Color(0x040408),
          metalness: 0.78,
          roughness: 0.16,
        });
        const matNeck = new THREE.MeshStandardMaterial({
          color:     new THREE.Color(0x060810),
          metalness: 0.82,
          roughness: 0.20,
        });
        // Visor: deep blue-black with strong emissive → glowing scanner slit
        const matVisor = new THREE.MeshStandardMaterial({
          color:             new THREE.Color(0x000204),
          metalness:         0.5,
          roughness:         0.05,
          emissive:          new THREE.Color(0x001840),
          emissiveIntensity: 2.4,
        });
        const matRidge = new THREE.MeshStandardMaterial({
          color:             new THREE.Color(0x080c18),
          metalness:         0.88,
          roughness:         0.12,
          emissive:          new THREE.Color(0x000c20),
          emissiveIntensity: 0.6,
        });

        teardowns.push(() => {
          matBody.dispose();
          matNeck.dispose();
          matVisor.dispose();
          matRidge.dispose();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mk = (geo: any, mat = matBody) => {
          teardowns.push(() => geo.dispose());
          return new THREE.Mesh(geo, mat);
        };

        // ── Robot bust ─────────────────────────────────────────────────────
        const g = new THREE.Group();

        // ── Head helmet — LatheGeometry (surface of revolution around Y) ──
        // Profile: (radius, height) pairs. x=0 at apex → closed top.
        // Widest at eye level (y≈0.24–0.44), tapers sharply to chin.
        const headPoints = [
          new THREE.Vector2(0.07, -0.82),  // neck opening — matches neck top
          new THREE.Vector2(0.20, -0.68),  // chin bottom
          new THREE.Vector2(0.30, -0.52),  // chin curve
          new THREE.Vector2(0.39, -0.34),  // jaw
          new THREE.Vector2(0.44, -0.14),  // lower face
          new THREE.Vector2(0.47,  0.06),  // cheek
          new THREE.Vector2(0.49,  0.24),  // eye level (widest)
          new THREE.Vector2(0.49,  0.44),  // temple
          new THREE.Vector2(0.47,  0.62),  // upper head
          new THREE.Vector2(0.41,  0.78),  // crown start
          new THREE.Vector2(0.28,  0.92),  // upper crown
          new THREE.Vector2(0.10,  1.02),  // near apex
          new THREE.Vector2(0.00,  1.06),  // apex — closed point
        ];
        const headMesh = mk(new THREE.LatheGeometry(headPoints, 72));
        g.add(headMesh);

        // ── Visor glow bands (open cylinders at eye level) ────────────────
        // Radius is computed at y=0.14: head LatheGeometry radius ≈ 0.479
        // Bands sit 0.010–0.011 units outside head surface to avoid Z-fight.
        const visor1 = mk(new THREE.CylinderGeometry(0.490, 0.490, 0.028, 72, 1, true), matVisor);
        visor1.position.y = 0.14;
        g.add(visor1);

        const visor2 = mk(new THREE.CylinderGeometry(0.478, 0.478, 0.013, 72, 1, true), matVisor);
        visor2.position.y = 0.06;
        g.add(visor2);

        // ── Cranial ridge — thin horizontal bar across top of dome ─────────
        const ridge = mk(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 10), matRidge);
        ridge.rotation.z = Math.PI / 2;
        ridge.position.y = 0.94;
        g.add(ridge);

        // ── Neck ──────────────────────────────────────────────────────────
        // Top radius 0.07 matches head base opening at y=-0.82
        const neck = mk(new THREE.CylinderGeometry(0.07, 0.14, 0.38, 24), matNeck);
        neck.position.y = -1.01;
        g.add(neck);

        // ── Base / shoulder ring ───────────────────────────────────────────
        const base = mk(new THREE.TorusGeometry(0.14, 0.032, 8, 32), matNeck);
        base.rotation.x = Math.PI / 2;
        base.position.y = -1.20;
        g.add(base);

        g.rotation.y = Y_IDLE;
        g.position.set(0, BASE_Y, 0);
        scene.add(g);
        robotRef.current = g;

        // ── Render loop via GSAP ticker ────────────────────────────────────
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

        // ── Entrance → session turn (or idle wobble if keepIdle) ───────────
        gsap.fromTo(
          g.position,
          { y: BASE_Y - 0.8 },
          {
            y:        BASE_Y,
            duration: 1.4,
            ease:     'power3.out',
            delay:    0.2,
            onComplete: () => {
              if (idle) {
                wobbleRef.current = gsap.to(g.rotation, {
                  y:        Y_IDLE + 0.08,
                  duration: 5,
                  yoyo:     true,
                  repeat:   -1,
                  ease:     'sine.inOut',
                });
              } else {
                gsap.to(g.rotation, {
                  y:        Y_SESSION,
                  duration: 1.8,
                  ease:     'power2.inOut',
                  delay:    0.4,
                  onComplete: () => {
                    wobbleRef.current = gsap.to(g.rotation, {
                      y:        Y_SESSION + 0.06,
                      duration: 5.5,
                      yoyo:     true,
                      repeat:   -1,
                      ease:     'sine.inOut',
                    });
                  },
                });
              }
            },
          }
        );
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
        y:        Y_SESSION,
        duration: 1.1,
        ease:     'power2.inOut',
        onComplete: () => {
          wobbleRef.current = gsap.to(g.rotation, {
            y:        Y_SESSION + 0.06,
            duration: 5.5,
            yoyo:     true,
            repeat:   -1,
            ease:     'sine.inOut',
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
        y:        Y_IDLE,
        duration: 1.5,
        ease:     'power2.inOut',
        onComplete: () => {
          wobbleRef.current = gsap.to(g.rotation, {
            y:        Y_IDLE + 0.08,
            duration: 5,
            yoyo:     true,
            repeat:   -1,
            ease:     'sine.inOut',
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
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </section>
    );
  }
);

RobotStage.displayName = 'RobotStage';
export default RobotStage;
