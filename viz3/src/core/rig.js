// @ts-check
// ===================== rigs of the people: canonical bone names and the compact clip format (shared by game/avatar.js and npc/npc_real.js) =====================
// Canonical names (Mixamo style: Hips, Spine1, LeftArm, LeftHandIndex1, HeadTop_End …) for the rigs in use: Mixamo, Character Creator,
// 3ds Max Biped (Microsoft Rocketbox: the player figures and, since 22.10.2026, the neighbours), UE mannequin (Mesh2Motion, Quaternius).
import * as THREE from 'three';

/** @type {Record<string, string>} */
const CN = {
  // 3ds Max Biped (Rocketbox; GLTFLoader turns the spaces of 'Bip01 L Thigh' into underscores)
  Bip01_Pelvis: 'Hips',
  Bip01_Spine: 'Spine',
  Bip01_Spine1: 'Spine1',
  Bip01_Spine2: 'Spine2',
  Bip01_Neck: 'Neck',
  Bip01_Head: 'Head',
  Bip01_HeadNub: 'HeadTop_End',
  // UE mannequin
  pelvis: 'Hips',
  spine_01: 'Spine',
  spine_02: 'Spine1',
  spine_03: 'Spine2',
  neck_01: 'Neck',
  head: 'Head',
  Head: 'Head',
  // Character Creator
  Hip: 'Hips',
  Waist: 'Spine',
  Spine01: 'Spine1',
  Spine02: 'Spine2',
  NeckTwist01: 'Neck',
  HeadNub: 'HeadTop_End',
};
for (const [b, u, S] of [
  ['L', 'l', 'Left'],
  ['R', 'r', 'Right'],
]) {
  Object.assign(CN, {
    [`Bip01_${b}_Clavicle`]: S + 'Shoulder',
    [`Bip01_${b}_UpperArm`]: S + 'Arm',
    [`Bip01_${b}_Forearm`]: S + 'ForeArm',
    [`Bip01_${b}_Hand`]: S + 'Hand',
    [`Bip01_${b}_Thigh`]: S + 'UpLeg',
    [`Bip01_${b}_Calf`]: S + 'Leg',
    [`Bip01_${b}_Foot`]: S + 'Foot',
    [`Bip01_${b}_Toe0`]: S + 'ToeBase',
    [`clavicle_${u}`]: S + 'Shoulder',
    [`upperarm_${u}`]: S + 'Arm',
    [`lowerarm_${u}`]: S + 'ForeArm',
    [`hand_${u}`]: S + 'Hand',
    [`thigh_${u}`]: S + 'UpLeg',
    [`calf_${u}`]: S + 'Leg',
    [`foot_${u}`]: S + 'Foot',
    [`ball_${u}`]: S + 'ToeBase',
    [`${b}_Clavicle`]: S + 'Shoulder',
    [`${b}_Upperarm`]: S + 'Arm',
    [`${b}_Forearm`]: S + 'ForeArm',
    [`${b}_Hand`]: S + 'Hand',
    [`${b}_Thigh`]: S + 'UpLeg',
    [`${b}_Calf`]: S + 'Leg',
    [`${b}_Foot`]: S + 'Foot',
    [`${b}_ToeBase`]: S + 'ToeBase',
  });
  ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].forEach((f, i) => {
    for (let k = 0; k < 3; k++) {
      CN[`Bip01_${b}_Finger${i}${k ? k : ''}`] = `${S}Hand${f}${k + 1}`;
      CN[`${f.toLowerCase()}_0${k + 1}_${u}`] = `${S}Hand${f}${k + 1}`;
    }
  });
}
/**
 * Canonical name of a bone, or null for bones the figures do not drive by name (twists, nubs of fingers, props).
 * @param {string} n bone name as loaded
 * @returns {string | null}
 */
export function canonBone(n) {
  if (CN[n]) return CN[n];
  const b = n.replace(/_\d+$/, ''); // Mixamo/CC exports number their bones: 'mixamorigLeftArm_011', 'L_Upperarm_037'
  if (b.startsWith('mixamorig')) return b.replace(/^mixamorig:?/, '');
  return CN[b] || null;
}

/**
 * One clip of a compact clip set (tools/player/build_player.mjs): bone names, int16 quaternions per frame, optional hip positions.
 * @typedef {object} PackedClip
 * @property {string} name
 * @property {number} d   duration (s)
 * @property {number} fps
 * @property {number} n   frames
 * @property {string[]} b bone names
 * @property {string} q   base64 Int16Array, n × bones × 4 (x, y, z, w · 32767)
 * @property {string} [p] base64 Float32Array of the hip bone's positions, n × 3
 * @property {string} [hb] the hip (root) bone
 * @property {number} [speed] m/s of an in-place locomotion cycle at the figure's own size
 * @property {boolean} [loop]
 */
/** @param {string} s @param {any} T */
function b64(s, T) {
  const bin = atob(s),
    u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new T(u8.buffer);
}
/**
 * A three.js clip from the compact format; userData.speed (m/s) and userData.loop.
 * @param {PackedClip} c
 * @returns {THREE.AnimationClip}
 */
export function decodeClip(c) {
  const q = b64(c.q, Int16Array),
    p = c.p ? b64(c.p, Float32Array) : null,
    n = c.n,
    nb = c.b.length,
    times = new Float32Array(n),
    tracks = [];
  for (let i = 0; i < n; i++) times[i] = Math.min(c.d, i / c.fps);
  for (let j = 0; j < nb; j++) {
    const v = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) v[i * 4 + k] = q[(i * nb + j) * 4 + k] / 32767;
    tracks.push(new THREE.QuaternionKeyframeTrack(c.b[j] + '.quaternion', times, v));
  }
  if (p && c.hb) tracks.push(new THREE.VectorKeyframeTrack(c.hb + '.position', times, p));
  const clip = new THREE.AnimationClip(c.name, c.d, tracks);
  /** @type {any} */ (clip).userData = { speed: c.speed || 0, loop: c.loop !== false }; // three's types lack userData on clips
  return clip;
}
