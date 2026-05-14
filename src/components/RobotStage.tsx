'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface RobotStageHandle {
  setActive: () => void;  // turn to face camera (session position)
  setIdle:   () => void;  // return to right profile (logout)
}

// Right profile = TRONIX-5 reference pose (default/idle)
const Y_IDLE    = -Math.PI * 0.44;
// Nearly front-facing = session position (after login, stays until logout)
const Y_SESSION =  0.12;
const BASE_Y    = -0.35;

const RobotStage = forwardRef<RobotStageHandle>((_, ref) => {
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

      // ── Scene ──────────────────────────────────────────────────────────────
      const scene = new THREE.Scene();

      // ── Camera ─────────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
      camera.position.set(0, 0.55, 5.6);
      camera.lookAt(0, 0.35, 0);

      // ── Renderer ───────────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(W, H, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping         = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.6;
      teardowns.push(() => renderer.dispose());

      // ── Lights ─────────────────────────────────────────────────────────────
      // Very dim ambient — establishes minimum visibility for the dark surface
      scene.add(new THREE.AmbientLight(0x111111, 1));

      // Key: strong white from upper-right-front — the main specular highlight
      const key = new THREE.DirectionalLight(0xffffff, 7);
      key.position.set(3, 5, 4);
      scene.add(key);

      // Rim: blue-white from upper-left-back — creates the glowing silhouette
      // This is the most important light for making the dark robot readable
      const rim = new THREE.DirectionalLight(0x88aaff, 6);
      rim.position.set(-4, 2, -3);
      scene.add(rim);

      // Fill: subtle cool-blue from below-front — softens the underside shadows
      const fill = new THREE.DirectionalLight(0x223344, 2);
      fill.position.set(0, -2, 3);
      scene.add(fill);

      // Eye glow: blue point light at visor position — the sci-fi scanner look
      const eyeLight = new THREE.PointLight(0x0055ff, 3, 4);
      eyeLight.position.set(0, 1.32, 1.2);
      scene.add(eyeLight);

      // ── Materials ──────────────────────────────────────────────────────────
      // MeshPhongMaterial (not Standard) — works without an env map so
      // specular highlights are bright and sharp on dark metallic surfaces.
      const matBody = new THREE.MeshPhongMaterial({
        color:     new THREE.Color(0x090909),
        specular:  new THREE.Color(0xffffff),
        shininess: 400,
      });

      // Visor band: glowing blue — the signature cyberpunk element
      const matVisor = new THREE.MeshPhongMaterial({
        color:             new THREE.Color(0x001133),
        specular:          new THREE.Color(0x4499ff),
        shininess:         800,
        emissive:          new THREE.Color(0x001a44),
        emissiveIntensity: 1.2,
      });

      // Detail panels: slightly lighter, cool-tinted specular
      const matPanel = new THREE.MeshPhongMaterial({
        color:     new THREE.Color(0x111111),
        specular:  new THREE.Color(0x4466aa),
        shininess: 200,
      });

      teardowns.push(() => { matBody.dispose(); matVisor.dispose(); matPanel.dispose(); });

      // ── Geometry helper ────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mk = (geo: any, mat = matBody) => {
        teardowns.push(() => geo.dispose());
        return new THREE.Mesh(geo, mat);
      };

      // ── Robot bust ─────────────────────────────────────────────────────────
      const g = new THREE.Group();

      // Chest
      const chest = mk(new THREE.SphereGeometry(0.78, 48, 48));
      chest.scale.set(1.10, 0.96, 0.66);
      chest.position.set(0, 0, 0);
      g.add(chest);

      // Left shoulder
      const lSho = mk(new THREE.SphereGeometry(0.27, 32, 32));
      lSho.scale.set(0.90, 0.82, 0.74);
      lSho.position.set(-0.95, 0.08, 0);
      g.add(lSho);

      // Right shoulder
      const rSho = mk(new THREE.SphereGeometry(0.27, 32, 32));
      rSho.scale.set(0.90, 0.82, 0.74);
      rSho.position.set(0.95, 0.08, 0);
      g.add(rSho);

      // Neck
      const neck = mk(new THREE.CylinderGeometry(0.18, 0.24, 0.30, 16));
      neck.position.set(0, 0.67, 0);
      g.add(neck);

      // Head — elongated helmet shape
      const head = mk(new THREE.SphereGeometry(0.60, 48, 48));
      head.scale.set(1.0, 1.18, 0.86);
      head.position.set(0, 1.30, 0);
      g.add(head);

      // Cranial ridge
      const ridge = mk(new THREE.CylinderGeometry(0.065, 0.065, 0.52, 12), matPanel);
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(0.04, 1.97, 0);
      g.add(ridge);

      // Visor band — glowing blue, the key visual signature
      const visor = mk(new THREE.TorusGeometry(0.58, 0.055, 16, 80), matVisor);
      visor.rotation.x = Math.PI / 2;
      visor.scale.z    = 0.36;
      visor.position.set(0, 1.32, 0);
      g.add(visor);

      // Chest panel detail
      const panel = mk(new THREE.BoxGeometry(0.50, 0.40, 0.04), matPanel);
      panel.position.set(0, 0.04, 0.53);
      g.add(panel);

      g.rotation.y = Y_IDLE;
      g.position.set(0, BASE_Y, 0);
      scene.add(g);
      robotRef.current = g;

      // ── Render loop via GSAP ticker ────────────────────────────────────────
      const tick = () => renderer.render(scene, camera);
      gsap.ticker.add(tick);
      teardowns.push(() => gsap.ticker.remove(tick));

      // ── Resize via ResizeObserver ──────────────────────────────────────────
      // Uses entry.contentRect so dimensions are accurate even on first fire.
      // renderer.setSize(W, H, false) = update buffer only, not CSS dimensions.
      const onResize = (entries: ResizeObserverEntry[]) => {
        const { width, height } = entries[0].contentRect;
        if (width === 0 || height === 0) return;
        W = width;
        H = height;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H, false);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(cont);
      teardowns.push(() => ro.disconnect());

      // ── Entrance → auto session turn ───────────────────────────────────────
      // 1. Robot rises from below (entrance animation)
      // 2. After rising, turns to face the camera (session position)
      //    — this is the ONE-TIME turn that happens on login
      // 3. Subtle micro-wobble starts at session position
      // setIdle() (called on logout) returns to Y_IDLE right profile.
      gsap.fromTo(
        g.position,
        { y: BASE_Y - 0.6 },
        {
          y:        BASE_Y,
          duration: 1.2,
          ease:     'power3.out',
          delay:    0.15,
          onComplete: () => {
            gsap.to(g.rotation, {
              y:        Y_SESSION,
              duration: 1.5,
              ease:     'power2.inOut',
              delay:    0.3,
              onComplete: () => {
                wobbleRef.current = gsap.to(g.rotation, {
                  y:        Y_SESSION + 0.06,
                  duration: 5,
                  yoyo:     true,
                  repeat:   -1,
                  ease:     'sine.inOut',
                });
              },
            });
          },
        }
      );
    })();

    return () => {
      cancelled = true;
      wobbleRef.current?.kill();
      teardowns.forEach(fn => fn());
    };
  }, []);

  // setActive: turn to session/face-camera position (available for external use)
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
          duration: 5,
          yoyo:     true,
          repeat:   -1,
          ease:     'sine.inOut',
        });
      },
    });
  }, []);

  // setIdle: return to right profile — called by page.tsx on logout
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
          duration: 4.5,
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
});

RobotStage.displayName = 'RobotStage';
export default RobotStage;
