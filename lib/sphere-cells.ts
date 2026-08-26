import * as THREE from "three";
import { PLOT_CATALOG } from "./plots-catalog";

export type Point3 = [number, number, number];

export type SphereCell = {
  slug: string;
  positions: Float32Array;
  centroid: Point3;
  borderPoints: Point3[];
};

function nearestSlug(point: THREE.Vector3, anchors: { slug: string; v: THREE.Vector3 }[]) {
  let best = anchors[0];
  let bestDot = point.dot(best.v);
  for (let n = 1; n < anchors.length; n++) {
    const d = point.dot(anchors[n].v);
    if (d > bestDot) {
      bestDot = d;
      best = anchors[n];
    }
  }
  return best.slug;
}

function vertKey(v: THREE.Vector3) {
  return `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;
}

function edgeKeyFromVerts(a: THREE.Vector3, b: THREE.Vector3) {
  const ka = vertKey(a);
  const kb = vertKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

export function lonLatToCartesian(lon: number, lat: number, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}

export function buildSphereCells(detail = 5, radius = 1.008): SphereCell[] {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;

  const anchors = PLOT_CATALOG.map((p) => ({
    slug: p.slug,
    v: lonLatToCartesian(p.lon, p.lat).normalize(),
  }));

  const buckets = new Map<string, number[]>();
  const borders = new Map<string, Point3[]>();
  for (const p of PLOT_CATALOG) {
    buckets.set(p.slug, []);
    borders.set(p.slug, []);
  }

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const edgeFaces = new Map<string, { slug: string; a: THREE.Vector3; b: THREE.Vector3 }[]>();

  const triangleCount = pos.count / 3;
  for (let t = 0; t < triangleCount; t++) {
    const i0 = t * 3;
    a.fromBufferAttribute(pos, i0).normalize();
    b.fromBufferAttribute(pos, i0 + 1).normalize();
    c.fromBufferAttribute(pos, i0 + 2).normalize();
    mid.copy(a).add(b).add(c).normalize();
    const slug = nearestSlug(mid, anchors);
    const arr = buckets.get(slug);
    if (!arr) continue;
    arr.push(
      a.x * radius,
      a.y * radius,
      a.z * radius,
      b.x * radius,
      b.y * radius,
      b.z * radius,
      c.x * radius,
      c.y * radius,
      c.z * radius
    );
    const pairs: [THREE.Vector3, THREE.Vector3][] = [
      [a, b],
      [b, c],
      [c, a],
    ];
    for (const [va, vb] of pairs) {
      const key = edgeKeyFromVerts(va, vb);
      const list = edgeFaces.get(key) ?? [];
      list.push({ slug, a: va.clone(), b: vb.clone() });
      edgeFaces.set(key, list);
    }
  }

  for (const records of edgeFaces.values()) {
    const slugs = new Set(records.map((r) => r.slug));
    if (slugs.size < 2) continue;
    const rec = records[0];
    const p1: Point3 = [rec.a.x * radius, rec.a.y * radius, rec.a.z * radius];
    const p2: Point3 = [rec.b.x * radius, rec.b.y * radius, rec.b.z * radius];
    for (const slug of slugs) {
      borders.get(slug)?.push(p1, p2);
    }
  }

  geo.dispose();

  return PLOT_CATALOG.map((p) => {
    const verts = buckets.get(p.slug) ?? [];
    const centroid = lonLatToCartesian(p.lon, p.lat, radius + 0.05);
    return {
      slug: p.slug,
      positions: new Float32Array(verts),
      centroid: [centroid.x, centroid.y, centroid.z],
      borderPoints: borders.get(p.slug) ?? [],
    };
  });
}
