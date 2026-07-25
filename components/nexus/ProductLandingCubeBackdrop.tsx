"use client";

import { useEffect, useRef } from "react";

export function ProductLandingCubeBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    let cancelled = false;
    let teardown = () => {};

    async function mountScene(targetCanvas: HTMLCanvasElement) {
      const THREE = await import("three");
      const [{ RoundedBoxGeometry }, { RoomEnvironment }] = await Promise.all([
        import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);

      const container = targetCanvas.parentElement;
      if (cancelled || !container) return;

      const renderer = new THREE.WebGLRenderer({
        canvas: targetCanvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 40);
      const core = new THREE.Group();
      core.rotation.set(0.32, -0.48, 0.16);
      scene.add(core);

      const shellGeometry = new RoundedBoxGeometry(2.85, 2.85, 2.85, 12, 0.13);
      const shellMaterial = new THREE.MeshPhysicalMaterial({
        color: "#0a0f14",
        metalness: 0.93,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 2.6,
        emissive: "#10263a",
        emissiveIntensity: 0.085,
      });
      const shell = new THREE.Mesh(shellGeometry, shellMaterial);
      core.add(shell);

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: "#9ec8ef",
        transparent: true,
        opacity: 0.55,
      });
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(shellGeometry, 16),
        edgeMaterial,
      );
      core.add(edges);

      const innerGeometry = new RoundedBoxGeometry(2.58, 2.58, 2.58, 9, 0.08);
      const innerMaterial = new THREE.MeshPhysicalMaterial({
        color: "#89c9ff",
        transparent: true,
        opacity: 0.035,
        roughness: 0.18,
        transmission: 0.2,
        depthWrite: false,
      });
      core.add(new THREE.Mesh(innerGeometry, innerMaterial));

      const lightCoreGeometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
      const lightCoreMaterial = new THREE.MeshBasicMaterial({
        color: "#74b8f4",
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      core.add(new THREE.Mesh(lightCoreGeometry, lightCoreMaterial));

      const ringGeometry = new THREE.TorusGeometry(1.12, 0.012, 8, 96);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: "#c7e4ff",
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      core.add(ring);

      scene.add(new THREE.AmbientLight("#a9c4db", 0.22));

      const keyLight = new THREE.DirectionalLight("#c7d6e5", 2.8);
      keyLight.position.set(-5, 4, 5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight("#477aa4", 2);
      rimLight.position.set(4, -2, -4);
      scene.add(rimLight);

      const orbitLight = new THREE.PointLight("#dbeeff", 72, 10, 2);
      scene.add(orbitLight);

      const environmentGenerator = new THREE.PMREMGenerator(renderer);
      const environment = environmentGenerator.fromScene(
        new RoomEnvironment(),
        0.04,
      ).texture;
      scene.environment = environment;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let animationFrame = 0;
      let width = 0;
      let height = 0;

      const resize = () => {
        const bounds = container.getBoundingClientRect();
        if (bounds.width === width && bounds.height === height) return;

        width = Math.max(1, bounds.width);
        height = Math.max(1, bounds.height);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.set(0.1, 0.25, width < 780 ? 8.7 : 8.15);
        camera.lookAt(width < 780 ? 0.2 : 0.85, width < 780 ? 0.72 : 0.05, 0);
        camera.updateProjectionMatrix();
        core.position.set(width < 780 ? 0.2 : 1.45, width < 780 ? 0.72 : 0.05, 0);
        core.scale.setScalar(width < 780 ? 0.82 : 1);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      const render = (time: number) => {
        const seconds = time / 1000;
        const scenarioReduced = Boolean(
          targetCanvas
            .closest(".product-shell")
            ?.querySelector(".today-page.is-reduced"),
        );
        const reduced = reducedMotion.matches || scenarioReduced;

        if (!reduced) {
          core.rotation.set(
            0.32 + seconds * 0.0527,
            -0.48 + seconds * 0.085,
            0.16 + seconds * 0.0289,
          );
          core.position.y =
            (width < 780 ? 0.72 : 0.05) + Math.sin(seconds * 0.55) * 0.055;
        }

        const orbit = reduced ? 0.8 : seconds * 0.22;
        orbitLight.position.set(
          core.position.x + Math.cos(orbit) * 3,
          2.7 + Math.sin(orbit * 0.7) * 0.22,
          Math.sin(orbit) * 2,
        );

        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
      };

      animationFrame = window.requestAnimationFrame(render);

      teardown = () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        environment.dispose();
        environmentGenerator.dispose();
        shellGeometry.dispose();
        innerGeometry.dispose();
        lightCoreGeometry.dispose();
        ringGeometry.dispose();
        edges.geometry.dispose();
        shellMaterial.dispose();
        innerMaterial.dispose();
        lightCoreMaterial.dispose();
        ringMaterial.dispose();
        edgeMaterial.dispose();
        renderer.dispose();
      };
    }

    void mountScene(canvasElement).catch(() => {
      if (!cancelled) canvasElement.hidden = true;
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="product-landing-cube-canvas"
      aria-hidden="true"
    />
  );
}
