/**
 * OfflinePay — Trinity Sci-Pitch 2026 Presentation Engine
 * Slide-by-Slide Tailored 3D Storytelling & High-Chroma Visuals
 * 1. Vault Database (Layers, Glowing Core, Ingress Packets, Shield Lock)
 * 2. Network Grid (Central Hub, Glowing Nodes, Visibly Severed Red Links)
 * 3. Two Phones (Crisp QR, Readable Screens, Cyan Wave, Signal Break -> Stored Offline)
 * 4. Sync Radar (Rotating Rings, Identifiable Devices, Packets, Interrupted Node)
 * 5. Floating Transaction Cards (Recognizable Cards, Visible Symbols, Deliberate Fan-Out)
 */

// Sound Synthesizer via Web Audio API
class SoundFx {
  constructor() {
    this.muted = false;
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.08) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  slideChange() {
    this.playTone(340, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(520, 'sine', 0.16, 0.06), 60);
  }
  verifySuccess() {
    this.playTone(523.25, 'triangle', 0.1, 0.08);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.09), 80);
    setTimeout(() => this.playTone(783.99, 'sine', 0.25, 0.1), 160);
  }
  dangerAlert() {
    this.playTone(220, 'sawtooth', 0.22, 0.09);
    setTimeout(() => this.playTone(185, 'sawtooth', 0.32, 0.1), 160);
  }
  beamLaser() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(850, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }
  click() {
    this.playTone(800, 'sine', 0.05, 0.08);
  }
}

const sfx = new SoundFx();

// Procedural Equirectangular Studio Environment Map for High-Gloss Color Reflections
function createStudioEnvMap(renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep Midnight Studio Horizon
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0.0, '#060911');
  bgGrad.addColorStop(0.5, '#0d1527');
  bgGrad.addColorStop(1.0, '#04070e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Softbox 1: Electric Cyan Overhead Studio Light
  const cyanGrad = ctx.createRadialGradient(250, 160, 10, 250, 160, 220);
  cyanGrad.addColorStop(0, 'rgba(0, 240, 255, 0.95)');
  cyanGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.4)');
  cyanGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = cyanGrad;
  ctx.fillRect(0, 0, 500, 320);

  // Softbox 2: Cyber Emerald Key Softbox
  const emGrad = ctx.createRadialGradient(780, 200, 10, 780, 200, 240);
  emGrad.addColorStop(0, 'rgba(16, 185, 129, 0.95)');
  emGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.4)');
  emGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = emGrad;
  ctx.fillRect(520, 0, 504, 400);

  // Softbox 3: 24K Gold Rim Strip (for warm specular sheen on coins and keys)
  const goldGrad = ctx.createLinearGradient(0, 380, 1024, 380);
  goldGrad.addColorStop(0.2, 'rgba(251, 191, 36, 0)');
  goldGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.85)');
  goldGrad.addColorStop(0.8, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 340, 1024, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  pmremGenerator.dispose();
  return envMap;
}

// ─────────────────────────────────────────────────────────────
// Texture Helper: Phone Screens (Slide 3)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// High-Context 2D Texture Generators for 3D Shaders
// ─────────────────────────────────────────────────────────────

// Slide 1: Hero Offline Digital Wallet Screen
function createHeroWalletTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Background Fintech Navy/Emerald Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 2048);
  bg.addColorStop(0, '#04271c');
  bg.addColorStop(0.5, '#071624');
  bg.addColorStop(1, '#020b14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 2048);

  // Status Bar
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('09:41', 80, 80);
  ctx.fillText('⚡ OFFLINE MODE (P-256)', 500, 80);

  // Header Brand Bar
  const hGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  hGrad.addColorStop(0, '#059669');
  hGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 110, 1024, 180);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('OfflinePay Wallet', 80, 225);

  // Status Badge Pill
  ctx.fillStyle = '#022c1d';
  ctx.beginPath();
  ctx.roundRect(80, 320, 520, 72, 20);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('⚡ 100% OFFLINE VAULT', 110, 370);

  // Main Balance Card
  ctx.fillStyle = '#0c2e22';
  ctx.beginPath();
  ctx.roundRect(70, 420, 884, 380, 40);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '42px sans-serif';
  ctx.fillText('Available Offline Balance', 120, 510);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 125px sans-serif';
  ctx.fillText('Rs 2,500.00', 120, 670);

  ctx.fillStyle = '#34d399';
  ctx.font = '34px monospace';
  ctx.fillText('eSewa • Khalti Batch Encrypted', 120, 740);

  // High-Contrast Bright QR Container
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(142, 840, 740, 740, 48);
  ctx.fill();
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 14;
  ctx.stroke();

  // QR Code Matrix
  ctx.fillStyle = '#021810';
  const cellSize = 60;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 === 0 || (r < 3 && c < 3) || (r < 3 && c > 6) || (r > 6 && c < 3)) {
        ctx.fillRect(212 + c * cellSize, 910 + r * cellSize, cellSize - 8, cellSize - 8);
      }
    }
  }

  // Laser Scanner Beam across QR
  ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.fillRect(160, 1190, 704, 32);
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(160, 1202, 704, 8);

  // Bottom Cryptographic Seal Button
  const btnGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  btnGrad.addColorStop(0, '#059669');
  btnGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(100, 1640, 824, 180, 50);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('P-256 SIGNED • READY TO PAY', 512, 1750);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// 3D Embossed Golden Rupee Coin Face
function createRupeeCoinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Radial Gold Background
  const radial = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
  radial.addColorStop(0, '#fef08a');
  radial.addColorStop(0.5, '#f59e0b');
  radial.addColorStop(1, '#92400e');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 512, 512);

  // Outer Serrated Coin Edge
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 235, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 256, 215, 0, Math.PI * 2);
  ctx.stroke();

  // Embossed 'Rs' Currency Symbol
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 220px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Rs', 256, 260);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Rs', 252, 256);

  // Edge Text
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('• OFFLINEPAY • 2026 •', 256, 430);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 2: Floating "NO CELL SIGNAL ❌" Warning Sign
function createWarningSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark High-Contrast Cyber-Obsidian Card Background
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, 0, 1024, 512);

  // Deep Crimson Header Banner
  const headGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  headGrad.addColorStop(0, '#7f1d1d');
  headGrad.addColorStop(0.5, '#991b1b');
  headGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = headGrad;
  ctx.fillRect(0, 0, 1024, 90);

  // Red Hazard Status Pill
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.roundRect(40, 24, 340, 44, 22);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('● CONNECTION FAILED', 65, 54);

  // Inner Card Container
  ctx.fillStyle = '#0b1322';
  ctx.beginPath();
  ctx.roundRect(30, 115, 964, 365, 24);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Strikethrough Signal Bars Icon (Clean & High Contrast)
  const barX = 75;
  const barY = 320;
  // Bar 1 (dead)
  ctx.fillStyle = '#334155';
  ctx.fillRect(barX, barY - 40, 22, 40);
  // Bar 2 (dead)
  ctx.fillRect(barX + 32, barY - 70, 22, 70);
  // Bar 3 (dead)
  ctx.fillRect(barX + 64, barY - 105, 22, 105);
  // Bar 4 (dead)
  ctx.fillRect(barX + 96, barY - 145, 22, 145);

  // Bright Red Diagonal Slash
  ctx.strokeStyle = '#ff0055';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(barX - 10, barY + 10);
  ctx.lineTo(barX + 130, barY - 160);
  ctx.stroke();

  // Bold Warning Text (Crisp Pure White)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('NO CELL SIGNAL', 245, 205);

  // Error Code Badge
  ctx.fillStyle = '#fee2e2';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('⚠️ SERVER UNREACHABLE (TIMEOUT)', 245, 275);

  // Explanation line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '32px sans-serif';
  ctx.fillText('Standard digital wallets spin & abort', 245, 345);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('⚡ OfflinePay Vault solves this air-gap', 245, 410);

  // Card Outer Neon Border
  ctx.strokeStyle = '#ff0055';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 1012, 500);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 4: Countertop QR Standee for Bazaar Shop Stall
function createQRStandeeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  // White Acrylic Standee
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 768);

  // Emerald Top Brand Header
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, 512, 160);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OfflinePay', 256, 75);

  ctx.font = 'bold 24px monospace';
  ctx.fillText('OFFLINE MERCHANT STAND', 256, 125);

  // Subheader
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('SCAN TO PAY OFFLINE', 256, 215);

  // QR Code
  ctx.fillStyle = '#022c1d';
  const cSize = 34;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0 || (r < 2 && c < 2) || (r < 2 && c > 5) || (r > 5 && c < 2)) {
        ctx.fillRect(120 + c * cSize, 260 + r * cSize, cSize - 4, cSize - 4);
      }
    }
  }

  // Merchant Name & Wallets Accepted
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Himalayan Tea Stall #04', 256, 610);

  ctx.fillStyle = '#64748b';
  ctx.font = '22px sans-serif';
  ctx.fillText('Accepts eSewa • Khalti • Zero Internet', 256, 660);

  ctx.textAlign = 'start';
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 8: Verified Prototype Checkmark Screen for Finale
function createCheckmarkScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Deep Emerald/Cyan Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 2048);
  bg.addColorStop(0, '#04271c');
  bg.addColorStop(0.5, '#032030');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 2048);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TRINITY INTERNATIONAL COLLEGE', 512, 160);
  ctx.fillText('SCI-PITCH 2026 • +2 SCIENCE', 512, 230);

  // Giant Glowing Emerald Circle with Checkmark
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(512, 680, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 20;
  ctx.stroke();

  // White Bold Checkmark (✔)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 42;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(380, 680);
  ctx.lineTo(470, 780);
  ctx.lineTo(650, 560);
  ctx.stroke();

  // Title Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('PROTOTYPE VERIFIED', 512, 1100);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('LIVE DEMO IN HAND', 512, 1200);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '38px monospace';
  ctx.fillText('• Standalone Android APK', 512, 1340);
  ctx.fillText('• iOS WebCrypto PWA', 512, 1420);
  ctx.fillText('• Embedded Wallet SDK Ready', 512, 1500);

  // Launch Button
  const btnGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  btnGrad.addColorStop(0, '#10b981');
  btnGrad.addColorStop(1, '#00f0ff');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(112, 1660, 800, 180, 50);
  ctx.fill();

  ctx.fillStyle = '#03140e';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('READY FOR PILOT 🚀', 512, 1775);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// 3D Map Pin Helper
function create3DMapPin(colorHex) {
  const pinGroup = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 20),
    new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.2 })
  );
  head.position.y = 0.42;
  pinGroup.add(head);
  addNeonEdges(head, 0xffffff, 2);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.45, 16),
    new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.2 })
  );
  cone.rotation.x = Math.PI;
  cone.position.y = 0.2;
  pinGroup.add(cone);
  addNeonEdges(cone, 0xffffff, 2);

  return pinGroup;
}

// Slide 4: Bus Amber LED Route Marquee Texture
function createBusMarqueeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BUS 104 • RATNAPARK ➔ LAGANKHEL', 256, 52);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('⚡ TAP TO PAY OFFLINE • ZERO NET', 256, 96);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 4: Bazaar Stall Neon Overhead Signboard
function createBazaarBannerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 512, 0);
  bg.addColorStop(0, '#042f2e');
  bg.addColorStop(1, '#064e3b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☕ HIMALAYAN TEA KIOSK', 256, 52);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('OFFLINEPAY ACCEPTED HERE', 256, 94);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 4: Floating Air-Gap Commerce Grid HUD
function createEcosystemHUDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 20);
  ctx.fill();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('📍 AIR-GAP COMMERCE GRID', 256, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('P2P Optical Mesh Active', 256, 92);

  ctx.fillStyle = '#10b981';
  ctx.font = '22px monospace';
  ctx.fillText('● 100% Signal-Independent', 256, 130);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 5: Cryptography Security Dashboard Hologram
function createCryptoHologramTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1024, 512);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(0.6, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 480, 36);
  ctx.fill();

  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = '#c084fc';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('🔐 HARDWARE SECURE ENCLAVE (TEE)', 60, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('NIST P-256 Non-Extractable Key', 60, 160);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '36px monospace';
  ctx.fillText('• SHA-256 Sequential Hash Chain: Block #0084 ➔ #0085', 60, 235);
  ctx.fillText('• Double-Spend Prevention: Zero Counter Replay Allowed', 60, 300);
  ctx.fillText('• Optical QR Air-Gap Handshake: Sub-20ms Signature', 60, 365);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('✔ HARDWARE INTEGRITY VERIFIED • ZERO SERVER DEPENDENCY', 60, 440);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 6: Financial Metric Pillar Badges
function createEconBadgeTexture(year, title, stat, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 236, 24);
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(year, 256, 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(stat, 256, 130);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(title, 256, 185);

  ctx.fillStyle = colorHex;
  ctx.font = '22px monospace';
  ctx.fillText('● Zero Hardware Capex', 256, 220);
  ctx.textAlign = 'start';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Slide 7: Disaster Emergency HUD Texture
function createDisasterHUDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1024, 512);
  bg.addColorStop(0, '#022c22');
  bg.addColorStop(0.5, '#071f30');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 480, 36);
  ctx.fill();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('🚨 DISASTER PROTOCOL: ACTIVE (EARTHQUAKE / FLOOD)', 60, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('Aegis Financial Resilience Grid', 60, 160);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '36px sans-serif';
  ctx.fillText('• Telecom Grid: DOWN ❌ • Cellular Data: 0 Bars', 60, 235);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('• OfflinePay: 100% OPERATIONAL ✔ (Zero Interruption)', 60, 300);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '34px sans-serif';
  ctx.fillText('• Essential rations, emergency clinics & supplies continue', 60, 365);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('🛡️ PROTECTING 30M+ CITIZENS IN CRITICAL DEAD ZONES', 60, 440);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Backup of original Title Slide & Cell Tower Slide so they can be seamlessly restored
const RESERVED_SLIDES = [
  {
    id: 'idea',
    kicker: 'Trinity Sci-Pitch 2026 • +2 Science',
    kickerType: 'normal',
    title: 'Offline<span class="highlight-green">Pay</span>',
    subtitle: 'Cryptographic offline payment protocol for mobile digital wallets',
    bullets: [
      { icon: '🏷️', text: 'Embeddable offline payment protocol for mobile digital wallets (eSewa / Khalti)', glow: 'glow-green' },
      { icon: '👥', text: 'Built by Trinity +2 Science student innovators for network-resilient fintech', glow: 'glow-cyan' },
      { icon: '💡', text: 'Sub-20ms peer-to-peer optical cryptographic handshake executing with zero internet', glow: 'glow-green' }
    ],
    prompter: {
      script: `"Good morning respected judges and audience. We are presenting OfflinePay: a cryptographic protocol that brings offline sovereignty to digital wallets.\n\nToday, digital payments are broken whenever the internet fails. OfflinePay enables instant, tamper-proof payments with absolutely zero connectivity."`,
      takeaway: 'Establish product identity and the core value proposition in the first 20 seconds.',
      cue: 'Hit Space to inspect the multi-tier cryptographic database vault on the right.',
      qa: [
        { q: 'Is this an entirely new wallet?', a: 'No, it is an infrastructure protocol & SDK that existing wallets embed without changing their balance custody.' }
      ]
    }
  },
  {
    id: 'problem',
    kicker: 'Slide 2 • The Problem',
    kickerType: 'danger',
    title: 'The <span class="highlight-danger">Network Blackout</span> Barrier.',
    subtitle: 'Why digital wallets fail when internet drops',
    bullets: [
      { icon: '📡', text: 'Frequent dead zones across mountain routes, rural highways, basements & bazaars', glow: 'glow-danger' },
      { icon: '⏳', text: '100% of standard digital wallets spin and fail instantly without a live server connection', glow: 'glow-danger' },
      { icon: '📊', text: 'Over 35% of attempted digital transactions in weak-signal areas abort, forcing cash fallback', glow: 'glow-danger' }
    ],
    prompter: {
      script: `"Whenever you step into a basement store, travel on a highway bus, or experience a power cut, digital wallets spin out and fail. Merchants lose sales and customers are left stranded.\n\nWhy hasn't this been solved? Because digital money can easily be duplicated without a central server—the classic double-spend problem."`,
      takeaway: 'Highlight the human and economic cost of failed transactions in Nepal and emerging markets.',
      cue: 'Trigger the network blackout to see central server links sever with red sparks.',
      qa: [
        { q: 'Why not use SMS banking?', a: 'SMS is slow (often 1-2 min delay), unencrypted across telecoms, costs money per text, and also fails without cellular signal.' }
      ]
    }
  }
];

// Active Pitch Deck Slides (Starting with Live Problem Statement Video)
const SLIDES = [
  {
    id: 'live-problem',
    kicker: 'Slide 1 • Live Ground Reality',
    kickerType: 'danger',
    title: 'The <span class="highlight-danger">Network Blackout</span> Reality.',
    subtitle: 'Live interview: Why digital wallets fail in Nepal\'s local shops & stalls',
    videoSrc: 'problem-live.mp4',
    bullets: [
      { icon: '🏪', text: 'Chronic dead zones across local meat shops, basements, bazaar stalls & public transit', glow: 'glow-danger' },
      { icon: '⏳', text: '100% of standard digital wallets spin and fail instantly when cellular signals drop', glow: 'glow-danger' },
      { icon: '🛑', text: 'Over 35% of attempted digital checkouts abort in dead zones, forcing cash fallback', glow: 'glow-danger' }
    ],
    prompter: {
      script: `"Good morning respected judges and audience. Before we discuss cryptography, look at this 25-second ground recording from a local shop right here in Nepal.\n\nWhen cellular signal drops, QR payments hang and fail completely. Customers are stranded, merchants lose sales, and digital inclusion halts. This real-world pain is why we built OfflinePay."`,
      takeaway: 'Hook judges instantly with undeniable authentic proof: a real local shopkeeper testifying to payment failures.',
      cue: 'Let the merchant interview play with sound. When done, press [Space] to reveal the Optical Air-Gap protocol.',
      qa: [
        { q: 'Where was this video recorded?', a: 'Recorded live at a local meat & provisions shop in Kathmandu, demonstrating real daily payment timeouts.' },
        { q: 'Is this just a carrier issue?', a: 'No, cellular physics dictates that basements, concrete bazaars, and transit corridors will always experience dead zones.' }
      ]
    }
  },
  {
    id: 'solution',
    kicker: 'Slide 2 • Our Solution',
    kickerType: 'normal',
    title: 'The <span class="highlight-green">Optical Air-Gap</span> Protocol.',
    subtitle: 'Instant peer-to-peer handshake via dynamic QR',
    bullets: [
      { icon: '🔄', text: 'Dynamic optical QR handshake with single-use unforgeable challenge nonces', glow: 'glow-green' },
      { icon: '⚡', text: '18ms on-device cryptographic verification with zero Wi-Fi, Bluetooth, or cellular', glow: 'glow-cyan' },
      { icon: '📱', text: 'Working prototype live today: standalone Android APK, iOS web PWA & SDK suite', glow: 'glow-green' }
    ],
    prompter: {
      script: `"Here is how OfflinePay works: The merchant inputs Rs 200 and shows an unforgeable QR code with a unique challenge nonce. The customer scans it, their phone signs a cryptographic payment token, and displays a return QR.\n\nThe 10-second 3D visualization playing on the right illustrates this complete architecture: local optical verification, cryptographic sync, and automated batch reconciliation with eSewa and Khalti wallets."`,
      takeaway: 'Walk through the 10-second visual representation. Emphasize that optical QR works on 100% of smartphones.',
      cue: 'Click the voiceover toggle on the video to hear the narration.',
      qa: [
        { q: 'Why QR instead of NFC or Bluetooth?', a: 'Universal smartphone compatibility. Many budget Android phones lack NFC, and Bluetooth pairing is notoriously unreliable in crowded areas.' }
      ]
    }
  },
  {
    id: 'target-users',
    kicker: 'Slide 3 • Target Users',
    kickerType: 'cyan',
    title: 'Who <span class="highlight-cyan">Needs</span> OfflinePay?',
    subtitle: 'Bridging the connectivity gap across essential sectors',
    bullets: [
      { icon: '🏪', text: 'Micro-merchants, tea stalls, campus cafeterias & local bazaars in weak-signal zones', glow: 'glow-cyan' },
      { icon: '🚌', text: 'Public transit buses, microbuses & highway routes operating through dead zones', glow: 'glow-cyan' },
      { icon: '💼', text: 'Major digital wallet companies (eSewa, Khalti) aiming for 99.99% transaction capture', glow: 'glow-green' }
    ],
    prompter: {
      script: `"Who benefits from this? First, micro-merchants: street vendors and tea stalls where network lag creates long queues. Second, public transportation: buses moving through dead zones. Third, wallet providers who immediately capture transactions that would otherwise be lost."`,
      takeaway: 'Show diverse user segments ranging from grassroots merchants to enterprise wallet operators.',
      cue: 'Rotate the 3D target radar showing the user segment pins and interrupted node.',
      qa: [
        { q: 'How large is this market?', a: 'In Nepal alone, over 15 million registered digital wallet users face daily connectivity drops.' }
      ]
    }
  },
  {
    id: 'science',
    kicker: 'Slide 4 • Science & Innovation',
    kickerType: 'purple',
    title: 'Applied <span class="highlight-cyan">Cryptography</span>.',
    subtitle: 'Mathematical principles preventing tampering and forgery',
    bullets: [
      { icon: '🔐', text: 'Asymmetric NIST ECDSA P-256 keys hardware-isolated on device—never exposed', glow: 'glow-cyan' },
      { icon: '🔗', text: 'Monotonic cryptographic hash chain binding prevHash, sequence & timestamp', glow: 'glow-purple' },
      { icon: '🎲', text: 'Anti-replay challenge nonces blocking token duplication and double-spend fraud', glow: 'glow-cyan' }
    ],
    prompter: {
      script: `"The science behind OfflinePay is applied mathematics. We use NIST P-256 elliptic curve cryptography. Every transaction is tied into an incremental cryptographic hash chain.\n\nEven if someone roots their phone or alters a single rupee in the amount, the cryptographic signature shatters instantly."`,
      takeaway: 'Highlight the scientific rigor: ECDSA, WebCrypto standard, and hash chaining.',
      cue: 'Click "Verify Cryptographic Cards" to illuminate each digital token in 3D.',
      qa: [
        { q: 'How is double-spending caught?', a: 'Offline risk is bounded by pre-loaded balance limits; any duplicate counter is caught during deferred sync and immediately freezes the device.' }
      ]
    }
  },
  {
    id: 'business',
    kicker: 'Slide 5 • Business Model',
    kickerType: 'normal',
    title: 'Non-Custodial <span class="highlight-green">B2B Economics</span>.',
    subtitle: 'Sustainable revenue with zero banking liability',
    bullets: [
      { icon: '🏦', text: 'Pure non-custodial software: zero banking liability, wallets hold all customer funds', glow: 'glow-green' },
      { icon: '💵', text: 'Zero merchant hardware cost: functions entirely on existing smartphone cameras & screens', glow: 'glow-cyan' },
      { icon: '📈', text: 'B2B annual SDK license + 0.05% micro-settlement fee on batch-reconciled volume', glow: 'glow-green' }
    ],
    prompter: {
      script: `"From a business perspective, OfflinePay is pure B2B software infrastructure. Because we never hold money, we do not require banking licenses.\n\nWallets pay a modest license fee plus a tiny fractional fee on batch reconciliations. For merchants and users, it is completely free to use."`,
      takeaway: 'Assure judges that regulatory compliance is clean because the solution is non-custodial software.',
      cue: 'Trigger the 3D economic token stack animation.',
      qa: [
        { q: 'Why would eSewa or Khalti buy this?', a: 'It gives them a decisive competitive advantage: payments that work everywhere, unlocking rural and transit revenue.' }
      ]
    }
  },
  {
    id: 'benefits',
    kicker: 'Slide 6 • Potential Benefits',
    kickerType: 'cyan',
    title: 'Social & <span class="highlight-green">Economic Impact</span>.',
    subtitle: 'Unconditional reliability for digital commerce',
    bullets: [
      { icon: '🌍', text: 'Expands cashless digital economy to remote Himalayan villages and agricultural hubs', glow: 'glow-cyan' },
      { icon: '🚨', text: 'Disaster resilience: transactions continue during earthquakes, power cuts & cell outages', glow: 'glow-green' },
      { icon: '⚡', text: 'Instant checkouts eliminating network timeout spinners and awkward counter queues', glow: 'glow-cyan' }
    ],
    prompter: {
      script: `"The benefits are transformative. First, true financial inclusion: remote mountain areas can participate in the cashless economy. Second, emergency resilience: when natural disasters strike and cell towers drop, local trade continues uninterrupted."`,
      takeaway: 'Focus on social good, inclusion, and national resilience during emergencies.',
      cue: 'Activate the 3D shield barrier demonstrating protected commerce.',
      qa: [
        { q: 'What happens if a device is lost or stolen?', a: 'Offline vaults require biometrics or PIN, and the account can be frozen online from any browser.' }
      ]
    }
  },
  {
    id: 'conclusion',
    kicker: 'Slide 7 • Conclusion & Pitch',
    kickerType: 'normal',
    title: 'The Future of <span class="highlight-green">Offline Commerce</span>.',
    subtitle: 'Making digital money as unconditional as physical cash',
    bullets: [
      { icon: '🎯', text: 'Working prototype v2.0 live today: Android APK, iOS web PWA and end-to-end test suite', glow: 'glow-green' },
      { icon: '🛠️', text: 'Next milestone: campus cafeteria pilot deployment & hardware Secure Enclave integration', glow: 'glow-cyan' },
      { icon: '🌟', text: '“Money should work wherever humans do—with or without an internet connection.”', glow: 'glow-green' }
    ],
    prompter: {
      script: `"In conclusion, paper cash works everywhere—in storms, in mountains, and in disasters. OfflinePay brings that exact reliability to digital money.\n\nWe have a working prototype ready for testing. Thank you respected judges, and we look forward to your valuable questions!"`,
      takeaway: 'End confidently on time (under 3 minutes) with a punchy memorable closing statement.',
      cue: 'Click the action button for the golden/emerald particle warp climax.',
      qa: [
        { q: 'Can judges test this right now?', a: 'Yes! They can scan our GitHub Pages PWA or test our Android APK on two phones in airplane mode.' }
      ]
    }
  }
];

// Helper to add razor-sharp, radiant neon edge outlines on solid 3D geometries
function addNeonEdges(mesh, colorHex, linewidth = 2) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: colorHex, linewidth }));
  mesh.add(line);
  return line;
}

class PresentationApp {
  constructor() {
    this.currentSlideIndex = 0;
    this.totalSlides = SLIDES.length;
    this.container = document.getElementById('canvas-container');
    this.startTime = Date.now();
    this.isPrompterOpen = false;

    // Real-Time Clap Navigation System
    this.isClapNavActive = false;
    this.clapAudioCtx = null;
    this.clapStream = null;
    this.clapProcessor = null;
    this.clapRafId = null;
    this.lastClapTimestamp = 0;

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Camera settings
    this.targetCamera = { x: 0, y: 0.3, z: 6.2 };
    this.targetLookAt = { x: 0.9, y: 0, z: 0 };
    this.currentLookAt = { x: 0.9, y: 0, z: 0 };

    // 3D Objects
    this.stars = null;
    this.slideObjects = [];

    // Mouse / Touch Orbit
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.orbitYaw = 0;
    this.orbitPitch = 0;

    this.initThree();
    this.createStarfield();
    this.buildSlideScenes();
    this.bindEvents();
    this.updateResponsiveLayout();
    this.renderSlideUI(0);
    this.startTimer();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0.3, 6.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    if (THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    this.container.appendChild(this.renderer.domElement);

    // Apply Studio Environment Map for High-Gloss Color Reflections
    const envMap = createStudioEnvMap(this.renderer);
    this.scene.environment = envMap;

    // ─────────────────────────────────────────────────────────────
    // High-Contrast Studio Lighting Rig
    // ─────────────────────────────────────────────────────────────
    // Crisp White Key Light for authentic material colors & bright specular gloss
    const whiteKey = new THREE.DirectionalLight(0xffffff, 2.8);
    whiteKey.position.set(4, 5, 5);
    this.scene.add(whiteKey);

    // Neon Cyan Rim Light
    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 3.4);
    cyanRim.position.set(-4, 3, 3);
    this.scene.add(cyanRim);

    // Neon Emerald Fill Light
    const emeraldFill = new THREE.DirectionalLight(0x00ff88, 3.2);
    emeraldFill.position.set(2, -4, 4);
    this.scene.add(emeraldFill);

    // Neon Magenta / Violet Back Rim Light
    const magentaRim = new THREE.DirectionalLight(0xe879f9, 3.6);
    magentaRim.position.set(-2, 3, -4);
    this.scene.add(magentaRim);

    // 24K Golden Stage Accent Spotlight (Focused directly on 3D Model Center at X = 1.85)
    const amberPoint = new THREE.PointLight(0xfbbf24, 2.8, 25);
    amberPoint.position.set(1.85, 0.2, 3.5);
    this.scene.add(amberPoint);

    // Crisp Ambient Baseline for Deep Shadow Contrast
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    this.scene.add(ambientLight);
  }

  createStarfield() {
    const starCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 45;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 45;

      const r = Math.random();
      if (r > 0.75) {
        colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0;
      } else if (r > 0.5) {
        colors[i * 3] = 0.2; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.4;
      } else if (r > 0.25) {
        colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.4; colors[i * 3 + 2] = 0.95;
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.2;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.45
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  buildSlideScenes() {
    const OBJ_X = 1.95; // Perfectly centered in the right 50% stage area

    this.allSceneGroups = {};

    const createGroup = (id) => {
      const grp = new THREE.Group();
      grp.position.set(OBJ_X, 0, 0);
      grp.visible = false;
      this.scene.add(grp);
      this.allSceneGroups[id] = grp;
      return grp;
    };

    const gIdea = createGroup('idea');
    const gProblem = createGroup('problem');
    const gLiveProblem = createGroup('live-problem');
    const gSolution = createGroup('solution');
    const gTargetUsers = createGroup('target-users');
    const gScience = createGroup('science');
    const gBusiness = createGroup('business');
    const gBenefits = createGroup('benefits');
    const gConclusion = createGroup('conclusion');

    this.slideObjects = SLIDES.map(s => this.allSceneGroups[s.id] || createGroup(s.id));

    // ─────────────────────────────────────────────────────────────
    // Slide: Hero Offline Digital Wallet Smartphone & 3D Gold Coin (Centered, Magnified & Radiant)
    // ─────────────────────────────────────────────────────────────
    const g0 = gIdea;
    const heroPhoneGroup = new THREE.Group();
    g0.add(heroPhoneGroup);

    // Sleek Obsidian Smartphone Chassis
    const phoneBodyGeom = new THREE.BoxGeometry(1.60, 3.20, 0.16);
    const phoneBodyMat = new THREE.MeshStandardMaterial({
      color: 0x09141f,
      metalness: 0.90,
      roughness: 0.15,
      emissive: 0x004d40,
      emissiveIntensity: 0.35
    });
    const phoneBody = new THREE.Mesh(phoneBodyGeom, phoneBodyMat);
    heroPhoneGroup.add(phoneBody);
    addNeonEdges(phoneBody, 0x00f0ff, 3); // Radiant Cyan Bezel
    addNeonEdges(phoneBody, 0x10b981, 2); // Emerald Inner Chamfer

    // Screen with Authentic Digital Wallet UI (Front & Back for continuous 360° visibility)
    const screenGeom = new THREE.PlaneGeometry(1.50, 3.06);
    const screenMat = new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() });
    
    // Front Screen
    const screen = new THREE.Mesh(screenGeom, screenMat);
    screen.position.z = 0.082;
    phoneBody.add(screen);

    // Back Screen (Facing outwards)
    const screenBack = new THREE.Mesh(screenGeom, screenMat);
    screenBack.position.z = -0.082;
    screenBack.rotation.y = Math.PI;
    phoneBody.add(screenBack);

    // Thick 3D Golden Rupee Coin Floating & Spinning Beside Phone
    const coinGeom = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 48);
    const coinTex = createRupeeCoinTexture();
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
      metalness: 0.95,
      roughness: 0.15,
      map: coinTex
    });
    const heroCoin = new THREE.Mesh(coinGeom, coinMat);
    heroCoin.rotation.x = Math.PI / 2;
    heroCoin.position.set(-0.85, 0.15, 0.35);
    heroPhoneGroup.add(heroCoin);
    addNeonEdges(heroCoin, 0xfde047, 2);

    // 3D Security Padlock Floating at Top-Right
    const lockGroup = new THREE.Group();
    const lockBodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.34, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.0, metalness: 0.8, roughness: 0.15 })
    );
    lockGroup.add(lockBodyMesh);
    addNeonEdges(lockBodyMesh, 0xffffff, 2);

    const shackle = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.045, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
    );
    shackle.position.y = 0.17;
    lockGroup.add(shackle);

    lockGroup.position.set(0.85, 1.35, 0.25);
    heroPhoneGroup.add(lockGroup);

    // Radiant Glowing Orbital Energy Rings
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.5,
      roughness: 0.1
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.038, 16, 80), ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    heroPhoneGroup.add(ring1);

    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 3.2,
      roughness: 0.1
    });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.032, 16, 80), ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    heroPhoneGroup.add(ring2);

    // Local Glow Lighting for Magnified Presence & Specular Sheen
    const phoneKeyLight = new THREE.PointLight(0x00f0ff, 3.5, 6.0);
    phoneKeyLight.position.set(1.2, 0.5, 1.4);
    heroPhoneGroup.add(phoneKeyLight);

    const coinGoldLight = new THREE.PointLight(0xf59e0b, 4.0, 5.0);
    coinGoldLight.position.set(-1.2, 0.8, 1.4);
    heroPhoneGroup.add(coinGoldLight);

    g0.userData = { heroPhoneGroup, heroCoin, lockGroup, ring1, ring2 };

    // ─────────────────────────────────────────────────────────────
    // Slide: The Telecom Cell Tower in Blackout & Severed Signal Waves
    // ─────────────────────────────────────────────────────────────
    const g1 = gProblem;

    // Main rotating tower assembly
    const towerGroup = new THREE.Group();
    towerGroup.position.set(0.65, -0.15, 0);
    towerGroup.scale.set(0.64, 0.64, 0.64);
    g1.add(towerGroup);

    // 1. Cyber-Concrete Station Foundation Pedestal Base
    const baseSlabGeom = new THREE.CylinderGeometry(1.65, 1.8, 0.22, 6);
    const baseSlabMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x020617
    });
    const baseSlab = new THREE.Mesh(baseSlabGeom, baseSlabMat);
    baseSlab.position.y = -1.55;
    towerGroup.add(baseSlab);
    addNeonEdges(baseSlab, 0xff0044, 2); // Glowing crimson hazard edge

    // 4 Heavy Steel Anchor Footings
    const footMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.15 });
    const footGeom = new THREE.BoxGeometry(0.32, 0.14, 0.32);

    // 2. Structural Steel Mast (4 Tapered Heavy Columns)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.15,
      emissive: 0x0f172a
    });
    const legGeom = new THREE.CylinderGeometry(0.065, 0.085, 3.1, 16);
    const legRadiusBottom = 0.82;
    const legRadiusTop = 0.26;

    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(ang => {
      // Anchor foot
      const foot = new THREE.Mesh(footGeom, footMat);
      foot.position.set(Math.cos(ang) * legRadiusBottom, -1.45, Math.sin(ang) * legRadiusBottom);
      towerGroup.add(foot);
      addNeonEdges(foot, 0x64748b, 1);

      // Tapered column
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(
        Math.cos(ang) * (legRadiusBottom + legRadiusTop) * 0.5,
        0,
        Math.sin(ang) * (legRadiusBottom + legRadiusTop) * 0.5
      );
      leg.rotation.z = Math.sin(ang) * 0.18;
      leg.rotation.x = Math.cos(ang) * -0.18;
      towerGroup.add(leg);
      addNeonEdges(leg, 0x38bdf8, 1);
    });

    // Cross-Girder Rings along mast height
    [-1.0, -0.35, 0.35, 1.0].forEach((y) => {
      const w = 1.35 * (1 - y * 0.18);
      const braceGeom = new THREE.BoxGeometry(w, 0.06, w);
      const brace = new THREE.Mesh(
        braceGeom,
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 })
      );
      brace.position.y = y;
      towerGroup.add(brace);
      addNeonEdges(brace, 0x00f0ff, 2);
    });

    // Lower Telemetry Equipment Deck Platform
    const lowerDeckGeom = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 6);
    const lowerDeckMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const lowerDeck = new THREE.Mesh(lowerDeckGeom, lowerDeckMat);
    lowerDeck.position.y = 1.05;
    towerGroup.add(lowerDeck);
    addNeonEdges(lowerDeck, 0x00f0ff, 2);

    // Backup Battery / Power Module on Base Slab
    const powerRackGeom = new THREE.BoxGeometry(0.7, 0.55, 0.5);
    const powerRackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const powerRack = new THREE.Mesh(powerRackGeom, powerRackMat);
    powerRack.position.set(0, -1.2, 0);
    towerGroup.add(powerRack);
    addNeonEdges(powerRack, 0xff0044, 2);

    // Upper Microwave Transceiver Platform & 4 Dishes
    const upperDeckGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 6);
    const upperDeck = new THREE.Mesh(upperDeckGeom, lowerDeckMat);
    upperDeck.position.y = 1.55;
    towerGroup.add(upperDeck);
    addNeonEdges(upperDeck, 0x00f0ff, 2);

    const dishGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.4,
      roughness: 0.2
    });
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(ang => {
      const dish = new THREE.Mesh(dishGeom, dishMat);
      dish.position.set(Math.cos(ang) * 0.45, 1.72, Math.sin(ang) * 0.45);
      dish.rotation.y = ang + Math.PI / 2;
      dish.rotation.x = 0.15;
      towerGroup.add(dish);
      addNeonEdges(dish, 0xff0044, 2);
    });

    // Tall Antenna Spire with Aircraft Obstruction Warning Beacon
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.045, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95 })
    );
    spire.position.y = 2.15;
    towerGroup.add(spire);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0044 })
    );
    beacon.position.y = 2.68;
    towerGroup.add(beacon);

    // Severed Glitching Sonar Shockwaves
    const waveGroup = new THREE.Group();
    waveGroup.position.y = 2.68;
    towerGroup.add(waveGroup);

    const brokenWaves = [];
    [0.75, 1.25, 1.75].forEach((r, i) => {
      const arcGeom = new THREE.TorusGeometry(r, 0.045, 16, 48);
      const arcMat = new THREE.MeshBasicMaterial({
        color: i === 2 ? 0xff0044 : 0xff3366,
        transparent: true,
        opacity: 0.85
      });
      const arc = new THREE.Mesh(arcGeom, arcMat);
      arc.rotation.x = Math.PI / 2;
      arc.userData = { baseRadius: r, phase: i * 0.33 };
      waveGroup.add(arc);
      brokenWaves.push(arc);
    });

    // 3. Eye-Catching 3D Warning Hologram Signboard (Mounted directly on slide root facing audience with ZERO specular glare)
    const signGeom = new THREE.BoxGeometry(1.80, 0.95, 0.08);
    const signMat = new THREE.MeshBasicMaterial({
      map: createWarningSignTexture()
    });
    const warningSign = new THREE.Mesh(signGeom, signMat);
    warningSign.position.set(-1.45, 0.25, 0.4);
    warningSign.rotation.y = 0.12; // Slightly angled towards center camera
    g1.add(warningSign);
    addNeonEdges(warningSign, 0xff0044, 2);

    g1.userData = { towerGroup, beacon, brokenWaves, warningSign };

    // ─────────────────────────────────────────────────────────────
    // Slide 2: Two Smartphones & Optical Wave
    // ─────────────────────────────────────────────────────────────
    const g2 = gSolution;
    const phoneGeom = new THREE.BoxGeometry(1.28, 2.45, 0.16);

    const phoneAFrame = new THREE.Mesh(phoneGeom, new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0x022c22, roughness: 0.2 }));
    phoneAFrame.position.set(-1.45, 0, 0);
    phoneAFrame.rotation.y = 0.32;
    g2.add(phoneAFrame);
    addNeonEdges(phoneAFrame, 0x00ff88, 3);

    const screenA = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenA.position.z = 0.082;
    phoneAFrame.add(screenA);

    const screenABack = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenABack.position.z = -0.082;
    screenABack.rotation.y = Math.PI;
    phoneAFrame.add(screenABack);

    const phoneBFrame = new THREE.Mesh(phoneGeom, new THREE.MeshStandardMaterial({ color: 0x082f49, emissive: 0x032d42, roughness: 0.2 }));
    phoneBFrame.position.set(1.45, 0, 0);
    phoneBFrame.rotation.y = -0.32;
    g2.add(phoneBFrame);
    addNeonEdges(phoneBFrame, 0x00f0ff, 3);

    const screenB = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenB.position.z = 0.082;
    phoneBFrame.add(screenB);

    const screenBBack = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 2.34), new THREE.MeshBasicMaterial({ map: createHeroWalletTexture() }));
    screenBBack.position.z = -0.082;
    screenBBack.rotation.y = Math.PI;
    phoneBFrame.add(screenBBack);

    const waveCoreGeom = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 16);
    const waveCoreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const waveCore = new THREE.Mesh(waveCoreGeom, waveCoreMat);
    waveCore.rotation.z = Math.PI / 2;
    g2.add(waveCore);

    g2.userData = { phoneAFrame, phoneBFrame, waveCore };

    // ─────────────────────────────────────────────────────────────
    // Slide 3: Real Target Ecosystem (Bazaar Shop + City Bus + QR Standee)
    // ─────────────────────────────────────────────────────────────
    const g3 = gTargetUsers;
    const ecoGroup = new THREE.Group();
    ecoGroup.position.set(0, -0.22, 0);
    g3.add(ecoGroup);

    // Floating City Slab / Terrain Base
    const slabGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.24, 48);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.6 });
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.y = -1.1;
    ecoGroup.add(slab);
    addNeonEdges(slab, 0x00f0ff, 2);

    // Concentric Glowing Neon Ground Rings
    const floorRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    floorRing1.rotation.x = Math.PI / 2;
    floorRing1.position.y = -0.96;
    ecoGroup.add(floorRing1);

    const floorRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    floorRing2.rotation.x = Math.PI / 2;
    floorRing2.position.y = -0.96;
    ecoGroup.add(floorRing2);

    // Dark Road Strip with Center Line
    const roadGeom = new THREE.BoxGeometry(4.6, 0.04, 1.25);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.position.set(0, -0.96, 0.6);
    ecoGroup.add(road);
    addNeonEdges(road, 0x38bdf8, 1);

    // 1. Merchant Shop Stall / Tea Kiosk
    const shopGroup = new THREE.Group();
    shopGroup.position.set(-1.15, -0.96, -0.5);
    ecoGroup.add(shopGroup);

    // Stall Counter Underglow
    const shopUnderglow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.6), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    shopUnderglow.position.y = 0.02;
    shopGroup.add(shopUnderglow);

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.72, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0x064e3b, emissiveIntensity: 0.45, roughness: 0.3 })
    );
    counter.position.y = 0.36;
    shopGroup.add(counter);
    addNeonEdges(counter, 0x10b981, 2);

    // Striped Awning Canopy
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.65, roughness: 0.2 })
    );
    awning.position.set(0, 1.08, 0.1);
    awning.rotation.x = 0.2;
    shopGroup.add(awning);
    addNeonEdges(awning, 0xffffff, 2);

    // Neon Bazaar Signboard
    const shopBanner = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.28, 0.06),
      new THREE.MeshBasicMaterial({ map: createBazaarBannerTexture() })
    );
    shopBanner.position.set(0, 1.35, 0.15);
    shopGroup.add(shopBanner);
    addNeonEdges(shopBanner, 0x10b981, 2);

    // Countertop QR Standee
    const standee = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.4, 0.04),
      new THREE.MeshBasicMaterial({ map: createQRStandeeTexture() })
    );
    standee.position.set(0.3, 0.92, 0.08);
    standee.rotation.y = -0.2;
    shopGroup.add(standee);
    addNeonEdges(standee, 0x10b981, 2);

    // Customer Smartphone scanning QR
    const buyerPhone = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.48, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.7 })
    );
    buyerPhone.position.set(0.28, 1.45, 0.32);
    buyerPhone.rotation.x = 0.45;
    shopGroup.add(buyerPhone);
    addNeonEdges(buyerPhone, 0x00f0ff, 2);

    // Scanning Laser Pyramid Beam from Customer Phone to QR Standee
    const scanBeamGeom = new THREE.ConeGeometry(0.32, 0.55, 4, 1, true);
    const scanBeamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.75 });
    const scanPyramid = new THREE.Mesh(scanBeamGeom, scanBeamMat);
    scanPyramid.position.set(0.29, 1.18, 0.2);
    scanPyramid.rotation.x = 0.45;
    shopGroup.add(scanPyramid);

    // Emerald Map Pin over Merchant Shop
    const shopPin = create3DMapPin(0x10b981);
    shopPin.position.set(0, 2.05, 0);
    shopGroup.add(shopPin);

    // 2. Public Transit City Bus
    const busGroup = new THREE.Group();
    busGroup.position.set(1.05, -0.96, 0.6);
    ecoGroup.add(busGroup);

    // Bus Underglow Light
    const busUnderglow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.6), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    busUnderglow.position.y = 0.02;
    busGroup.add(busUnderglow);

    // Bus Body Chassis (Vibrant Cyan)
    const busBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.65, metalness: 0.4, roughness: 0.2 })
    );
    busBody.position.y = 0.52;
    busGroup.add(busBody);
    addNeonEdges(busBody, 0x00f0ff, 2);

    // Amber LED Destination Marquee Board on Bus Front
    const busMarquee = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.64),
      new THREE.MeshBasicMaterial({ map: createBusMarqueeTexture() })
    );
    busMarquee.position.set(0.81, 0.72, 0);
    busMarquee.rotation.y = Math.PI / 2;
    busGroup.add(busMarquee);
    addNeonEdges(busMarquee, 0xf59e0b, 2);

    // Dark Window Ribbon Strip
    const winStrip = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.26, 0.74),
      new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.1, metalness: 0.9 })
    );
    winStrip.position.y = 0.62;
    busGroup.add(winStrip);

    // 4 Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const busWheels = [];
    [-0.52, 0.52].forEach(x => {
      [-0.38, 0.38].forEach(z => {
        const w = new THREE.Mesh(wheelGeom, wheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.15, z);
        busGroup.add(w);
        busWheels.push(w);
      });
    });

    // Glowing Headlights
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.55), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    headlight.position.set(0.81, 0.38, 0);
    busGroup.add(headlight);

    // Cyan Map Pin over City Bus
    const busPin = create3DMapPin(0x00f0ff);
    busPin.position.set(0, 1.55, 0);
    busGroup.add(busPin);

    // Floating Air-Gap Commerce Grid HUD Billboard
    const ecoHUD = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 0.06),
      new THREE.MeshBasicMaterial({ map: createEcosystemHUDTexture() })
    );
    ecoHUD.position.set(0, 1.45, -0.6);
    ecoGroup.add(ecoHUD);
    addNeonEdges(ecoHUD, 0x00f0ff, 2);

    // 6 Parabolic Jumping Payment Coins
    const tokenArcCoins = [];
    for (let c = 0; c < 6; c++) {
      const tc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.05, 20),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.95 })
      );
      tc.rotation.x = Math.PI / 2;
      tc.userData = { phase: c * (1 / 6) };
      ecoGroup.add(tc);
      tokenArcCoins.push(tc);
    }

    g3.userData = { ecoGroup, shopPin, busPin, busWheels, tokenArcCoins, scanPyramid, floorRing1, floorRing2, ecoHUD };

    // ─────────────────────────────────────────────────────────────
    // Slide 4: Applied Cryptography (3D Master Key & Interlocking Hash Chain)
    // ─────────────────────────────────────────────────────────────
    const g4 = gScience;
    const cryptoGroup = new THREE.Group();
    cryptoGroup.position.set(0, -0.22, 0);
    g4.add(cryptoGroup);

    // Cyber-Pedestal Base Platform with Hexagonal Chamfer
    const cyberPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.5, 0.24, 6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x1e1b4b, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 })
    );
    cyberPlinth.position.y = -1.15;
    cryptoGroup.add(cyberPlinth);
    addNeonEdges(cyberPlinth, 0xc084fc, 2);

    // Concentric Cryptographic Ring on Plinth
    const plinthRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = -1.02;
    cryptoGroup.add(plinthRing);

    // 1. Heavy 3D Titanium Vault Padlock
    const padlockBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.1, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x1e1b4b, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.15 })
    );
    padlockBody.position.set(-0.85, -0.25, 0);
    cryptoGroup.add(padlockBody);
    addNeonEdges(padlockBody, 0xc084fc, 3); // Neon Purple Perimeter

    // Padlock U-Shackle
    const lockShackle = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.095, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 })
    );
    lockShackle.position.set(-0.85, 0.3, 0);
    cryptoGroup.add(lockShackle);

    // Illuminated Cyan Keyhole
    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(-0.85, -0.25, 0);
    cryptoGroup.add(keyhole);

    // 2. Interlocking Physical 3D Chain Links (The Cryptographic Hash Chain)
    const chainLinks = [];
    const chainBlocks = [];
    const chainLinkCount = 4;
    const linkGeom = new THREE.TorusGeometry(0.44, 0.085, 16, 32);
    const linkMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      metalness: 0.8,
      roughness: 0.2
    });

    for (let l = 0; l < chainLinkCount; l++) {
      const link = new THREE.Mesh(linkGeom, linkMat);
      link.position.set(-0.35 + l * 0.62, 0.12 + (l % 2 === 0 ? 0.06 : -0.06), 0);
      if (l % 2 === 1) link.rotation.x = Math.PI / 2;
      link.scale.set(1.15, 0.68, 1.0);
      cryptoGroup.add(link);
      addNeonEdges(link, 0x00f0ff, 2);
      chainLinks.push(link);

      // Embedded Block Data Cube inside each chain link
      const blockCube = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.8, roughness: 0.2 })
      );
      blockCube.position.set(-0.35 + l * 0.62, 0.12, 0);
      cryptoGroup.add(blockCube);
      addNeonEdges(blockCube, 0xffffff, 2);
      chainBlocks.push(blockCube);
    }

    // 3. 3D Master Cryptographic Key (NIST P-256)
    const masterKey = new THREE.Group();
    const keyBow = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.085, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.85, metalness: 0.85, roughness: 0.15 })
    );
    masterKey.add(keyBow);
    addNeonEdges(keyBow, 0xffffff, 2);

    const keyCore = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 24), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    keyCore.rotation.x = Math.PI / 2;
    masterKey.add(keyCore);

    const keyShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.65, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.15 })
    );
    keyShaft.rotation.z = Math.PI / 2;
    keyShaft.position.x = 1.0;
    masterKey.add(keyShaft);

    const keyTooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.09), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    keyTooth1.position.set(1.45, -0.16, 0);
    masterKey.add(keyTooth1);
    addNeonEdges(keyTooth1, 0x00f0ff, 2);

    const keyTooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.09), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
    keyTooth2.position.set(1.72, -0.13, 0);
    masterKey.add(keyTooth2);
    addNeonEdges(keyTooth2, 0x00f0ff, 2);

    masterKey.position.set(0.65, 0.75, 0.3);
    masterKey.rotation.z = -0.35;
    cryptoGroup.add(masterKey);

    // Radiant Cryptographic Laser Beam connecting Key to Keyhole
    const laserBeamGeom = new THREE.CylinderGeometry(0.035, 0.035, 1.5, 16);
    const laserBeamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const cryptoLaser = new THREE.Mesh(laserBeamGeom, laserBeamMat);
    cryptoLaser.rotation.z = Math.PI / 2.7;
    cryptoLaser.position.set(-0.1, 0.22, 0.15);
    cryptoGroup.add(cryptoLaser);

    // Floating Cryptographic Security Hologram Billboard
    const cryptoHUD = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.95, 0.06),
      new THREE.MeshBasicMaterial({ map: createCryptoHologramTexture() })
    );
    cryptoHUD.position.set(0, 1.45, -0.4);
    cryptoGroup.add(cryptoHUD);
    addNeonEdges(cryptoHUD, 0xc084fc, 2);

    g4.userData = { cryptoGroup, masterKey, chainLinks, chainBlocks, padlockBody, keyhole, cryptoLaser, plinthRing, cryptoHUD };

    // ─────────────────────────────────────────────────────────────
    // Slide 5: Non-Custodial B2B Economics (Ascending Chart + Coin Stacks + Growth Arrow)
    // ─────────────────────────────────────────────────────────────
    const g5 = gBusiness;
    const econGroup = new THREE.Group();
    econGroup.position.set(0, -0.32, 0);
    g5.add(econGroup);

    // Cyberpunk Financial Matrix Floor Slab
    const econFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.2, 36),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 })
    );
    econFloor.position.y = -1.2;
    econGroup.add(econFloor);
    addNeonEdges(econFloor, 0x10b981, 2);

    // 3 Ascending Bar Chart Pillars (Proportionately scaled to fit viewing frustum)
    const pillarData = [
      { h: 0.82, x: -1.2, col: 0x0284c7, em: 0x00f0ff, year: '2026', stat: 'Rs 0 CAPEX', title: '1,000 POS Nodes' },
      { h: 1.35, x: 0,    col: 0x10b981, em: 0x059669, year: '2027', stat: '50k MERCHANTS', title: 'eSewa & Khalti Partner' },
      { h: 1.95, x: 1.2,  col: 0xfbbf24, em: 0xf59e0b, year: '2028', stat: 'Rs 100Cr+ GMV', title: 'National Air-Gap Grid' }
    ];

    const chartPillars = [];
    const pillarBadges = [];
    const lightColumns = [];

    pillarData.forEach(pd => {
      // Bar Pillar
      const pGeom = new THREE.BoxGeometry(0.82, pd.h, 0.82);
      const pMat = new THREE.MeshStandardMaterial({
        color: pd.col,
        emissive: pd.em,
        emissiveIntensity: 0.7,
        metalness: 0.6,
        roughness: 0.2
      });
      const pillar = new THREE.Mesh(pGeom, pMat);
      pillar.position.set(pd.x, -1.05 + pd.h / 2, 0);
      econGroup.add(pillar);
      addNeonEdges(pillar, 0xffffff, 2);
      chartPillars.push(pillar);

      // Skyward Laser Light Column shooting from top of pillar (compact & non-clipping)
      const colGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.65, 12);
      const colMat = new THREE.MeshBasicMaterial({ color: pd.em, transparent: true, opacity: 0.85 });
      const lightCol = new THREE.Mesh(colGeom, colMat);
      lightCol.position.set(pd.x, -1.05 + pd.h + 0.32, 0);
      econGroup.add(lightCol);
      lightColumns.push(lightCol);

      // Floating 3D Metric Badge above each pillar
      const badgeTex = createEconBadgeTexture(pd.year, pd.title, pd.stat, '#' + pd.em.toString(16).padStart(6, '0'));
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.42, 0.05),
        new THREE.MeshBasicMaterial({ map: badgeTex })
      );
      badge.position.set(pd.x, -1.05 + pd.h + 0.32, 0.45);
      econGroup.add(badge);
      addNeonEdges(badge, pd.em, 2);
      pillarBadges.push(badge);
    });

    // Stacks of 3D Gold Rupee Coins at the Base
    const goldCoins = [];
    const coinGeomS6 = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24);
    const coinMatS6 = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
      metalness: 0.85,
      roughness: 0.18
    });

    [-1.2, 0, 1.2].forEach((px, stackIdx) => {
      const numCoins = (stackIdx + 1) * 3;
      for (let c = 0; c < numCoins; c++) {
        const coin = new THREE.Mesh(coinGeomS6, coinMatS6);
        coin.position.set(px + 0.35, -1.01 + c * 0.09, 0.5);
        econGroup.add(coin);
        addNeonEdges(coin, 0xffffff, 1);
        goldCoins.push(coin);
      }
    });

    // Soaring 3D Volumetric Growth / Profit Arrow
    const arrowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.7, -0.8, 0.45),
      new THREE.Vector3(-0.5, -0.2, 0.45),
      new THREE.Vector3(0.5, 0.6, 0.45),
      new THREE.Vector3(1.5, 1.25, 0.45)
    ]);
    const arrowTube = new THREE.Mesh(
      new THREE.TubeGeometry(arrowCurve, 32, 0.08, 12, false),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    econGroup.add(arrowTube);

    const arrowHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.48, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    arrowHead.position.set(1.5, 1.25, 0.45);
    arrowHead.rotation.z = -Math.PI / 4;
    econGroup.add(arrowHead);

    // Giant Glowing 3D Golden Rupee Emblem Floating at Arrow Apex (Framed Comfortably Inside Viewport)
    const apexCoin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.1, 32),
      new THREE.MeshStandardMaterial({ map: createRupeeCoinTexture(), metalness: 0.85, roughness: 0.2, emissive: 0xf59e0b, emissiveIntensity: 0.6 })
    );
    apexCoin.rotation.x = Math.PI / 2;
    apexCoin.position.set(1.5, 1.62, 0.45);
    econGroup.add(apexCoin);
    addNeonEdges(apexCoin, 0xffffff, 2);

    const apexHalo = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    apexHalo.position.set(1.5, 1.62, 0.45);
    econGroup.add(apexHalo);

    g5.userData = { econGroup, chartPillars, goldCoins, arrowHead, arrowTube, apexCoin, apexHalo, lightColumns, pillarBadges };

    // ─────────────────────────────────────────────────────────────
    // Slide 6: Social & Disaster Resilience (3D Aegis Shield & Heartbeat Lifeline)
    // ─────────────────────────────────────────────────────────────
    const g6 = gBenefits;
    const impactGroup = new THREE.Group();
    impactGroup.position.set(0, -0.15, 0);
    g6.add(impactGroup);

    // Luminous Geodesic Wireframe Forcefield Dome protecting the community
    const domeGeom = new THREE.SphereGeometry(2.4, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.35 });
    const forceDome = new THREE.Mesh(domeGeom, domeMat);
    forceDome.position.y = -1.2;
    impactGroup.add(forceDome);

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1.3);
    shieldShape.lineTo(0.9, 0.85);
    shieldShape.lineTo(0.9, -0.3);
    shieldShape.lineTo(0, -1.3);
    shieldShape.lineTo(-0.9, -0.3);
    shieldShape.lineTo(-0.9, 0.85);
    shieldShape.closePath();

    const shieldGeom = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 4
    });
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      metalness: 0.75,
      roughness: 0.18
    });
    const aegisShield = new THREE.Mesh(shieldGeom, shieldMat);
    impactGroup.add(aegisShield);
    addNeonEdges(aegisShield, 0x00f0ff, 3); // Radiant Neon Cyan Rim!

    // 3D Emergency First-Aid / Medical Lifeline Cross on Shield Crest
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.14), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.9 }));
    crossH.position.set(0, 0.65, 0.22);
    impactGroup.add(crossH);
    addNeonEdges(crossH, 0xffffff, 2);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.14), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.9 }));
    crossV.position.set(0, 0.65, 0.22);
    impactGroup.add(crossV);
    addNeonEdges(crossV, 0xffffff, 2);

    // 3D Extruded Heartbeat Lifeline (EKG Pulse Wave) on Shield Face
    const ekgCurve = new THREE.CurvePath();
    const ekgPts = [
      new THREE.Vector3(-0.7, -0.05, 0.25),
      new THREE.Vector3(-0.25, -0.05, 0.25),
      new THREE.Vector3(-0.15, 0.3, 0.25),
      new THREE.Vector3(0, -0.45, 0.25),
      new THREE.Vector3(0.12, 0.5, 0.25),
      new THREE.Vector3(0.25, -0.15, 0.25),
      new THREE.Vector3(0.35, -0.05, 0.25),
      new THREE.Vector3(0.7, -0.05, 0.25)
    ];
    for (let p = 0; p < ekgPts.length - 1; p++) {
      ekgCurve.add(new THREE.LineCurve3(ekgPts[p], ekgPts[p + 1]));
    }
    const ekgTube = new THREE.Mesh(
      new THREE.TubeGeometry(ekgCurve, 40, 0.05, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    impactGroup.add(ekgTube);

    // Stylized Low-Poly Mountain Peak Base (Himalayan Inclusion)
    const mountainGeom = new THREE.ConeGeometry(1.6, 1.1, 5);
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 });
    const mountain = new THREE.Mesh(mountainGeom, mountainMat);
    mountain.position.set(0, -1.6, 0);
    impactGroup.add(mountain);
    addNeonEdges(mountain, 0x10b981, 2);

    // Snow-Cap on Mountain Top
    const snowCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 0.45, 5),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, emissive: 0x38bdf8, emissiveIntensity: 0.3 })
    );
    snowCap.position.set(0, -1.25, 0);
    impactGroup.add(snowCap);
    addNeonEdges(snowCap, 0xffffff, 2);

    // 3 Low-Poly Himalayan Community Village Cottages around Base
    [-0.8, 0, 0.8].forEach((hx, hi) => {
      const hut = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.3, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0xf59e0b, emissiveIntensity: 0.4, roughness: 0.4 })
      );
      hut.position.set(hx, -1.55, 0.7 - Math.abs(hx) * 0.3);
      impactGroup.add(hut);
      addNeonEdges(hut, 0xfbbf24, 2);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.22, 4),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.6 })
      );
      roof.position.set(hx, -1.33, 0.7 - Math.abs(hx) * 0.3);
      roof.rotation.y = Math.PI / 4;
      impactGroup.add(roof);
    });

    // Emergency Satellite Transmitter Dish
    const satDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.15 })
    );
    satDish.position.set(0.9, -1.2, -0.4);
    satDish.rotation.x = -Math.PI / 3;
    impactGroup.add(satDish);
    addNeonEdges(satDish, 0x00f0ff, 2);

    // Floating Disaster Status HUD Billboard
    const disasterHUD = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.95, 0.06),
      new THREE.MeshBasicMaterial({ map: createDisasterHUDTexture() })
    );
    disasterHUD.position.set(0, 1.45, -0.5);
    impactGroup.add(disasterHUD);
    addNeonEdges(disasterHUD, 0x00f0ff, 2);

    // Deflective Forcefield Rings
    const forceRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.03, 16, 64), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
    const forceRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.025, 16, 64), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    forceRing1.rotation.x = Math.PI / 2.5;
    forceRing2.rotation.y = Math.PI / 3;
    impactGroup.add(forceRing1);
    impactGroup.add(forceRing2);

    g6.userData = { impactGroup, aegisShield, ekgTube, crossH, crossV, forceDome, forceRing1, forceRing2, disasterHUD, satDish };

    // ─────────────────────────────────────────────────────────────
    // Slide 7: Conclusion (Trophy Smartphone with Verified Checkmark & 3D Rocket)
    // ─────────────────────────────────────────────────────────────
    const g7 = gConclusion;
    const finaleGroup = new THREE.Group();
    finaleGroup.position.set(0, -0.05, 0);
    g7.add(finaleGroup);

    // 1. Trophy Smartphone
    const phoneTrophy = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 2.7, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.15 })
    );
    phoneTrophy.position.set(-0.65, 0, 0);
    phoneTrophy.rotation.y = 0.22;
    finaleGroup.add(phoneTrophy);
    addNeonEdges(phoneTrophy, 0x10b981, 3);

    // Screen with Giant Verified Checkmark (Dual-Sided: Front & Back)
    const checkScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 2.56),
      new THREE.MeshBasicMaterial({ map: createCheckmarkScreenTexture() })
    );
    checkScreen.position.z = 0.082;
    phoneTrophy.add(checkScreen);

    const checkScreenBack = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 2.56),
      new THREE.MeshBasicMaterial({ map: createCheckmarkScreenTexture() })
    );
    checkScreenBack.position.z = -0.082;
    checkScreenBack.rotation.y = Math.PI;
    phoneTrophy.add(checkScreenBack);

    // 2. 3D Launch Rocket (Aerospace Arrow to Future)
    const rocketGroup = new THREE.Group();
    rocketGroup.position.set(0.9, 0.2, 0);
    finaleGroup.add(rocketGroup);

    // Rocket Fuselage (White/Cyan Ceramic)
    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 1.8, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.2 })
    );
    rocketGroup.add(fuselage);
    addNeonEdges(fuselage, 0x00f0ff, 2);

    // Conical Rocket Nose Cone
    const noseCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.65, 24),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.8 })
    );
    noseCone.position.y = 1.22;
    rocketGroup.add(noseCone);
    addNeonEdges(noseCone, 0xffffff, 2);

    // 3 Aerodynamic Fins
    const finGeom = new THREE.BoxGeometry(0.04, 0.55, 0.38);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x0284c7, emissiveIntensity: 0.6 });
    [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach(ang => {
      const fin = new THREE.Mesh(finGeom, finMat);
      fin.position.set(Math.cos(ang) * 0.35, -0.65, Math.sin(ang) * 0.35);
      fin.rotation.y = -ang;
      rocketGroup.add(fin);
    });

    // Glowing Ion Thruster Flame Cone
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.75, 16),
      new THREE.MeshBasicMaterial({ color: 0xffa500 })
    );
    flame.position.y = -1.25;
    flame.rotation.x = Math.PI;
    rocketGroup.add(flame);

    // Celebratory Golden Halo Rings
    const halo1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.04, 16, 64), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    halo1.rotation.x = Math.PI / 3;
    finaleGroup.add(halo1);

    const halo2 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.03, 16, 64), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    halo2.rotation.y = Math.PI / 4;
    finaleGroup.add(halo2);

    g7.userData = { finaleGroup, phoneTrophy, rocketGroup, flame, halo1, halo2 };
  }

  goToSlide(index) {
    if (index < 0 || index >= this.totalSlides || index === this.currentSlideIndex) return;

    // Pause all video elements if leaving
    const existingProblemVid = document.getElementById('problem-live-video');
    if (existingProblemVid) {
      existingProblemVid.pause();
      existingProblemVid.currentTime = 0;
      existingProblemVid.muted = true;
    }
    const existingVid = document.getElementById('solution-demo-video');
    if (existingVid) {
      existingVid.pause();
      existingVid.currentTime = 0;
      existingVid.muted = true;
    }

    this.currentSlideIndex = index;
    sfx.slideChange();

    const currentSlide = SLIDES[index];
    const isVideoSlide = (currentSlide.id === 'live-problem' || currentSlide.id === 'solution');

    this.slideObjects.forEach((grp, i) => {
      grp.visible = (!isVideoSlide && i === index);
    });

    this.updateResponsiveLayout();
    this.renderSlideUI(index);
  }

  nextSlide() {
    if (this.currentSlideIndex < this.totalSlides - 1) {
      this.goToSlide(this.currentSlideIndex + 1);
    }
  }

  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.goToSlide(this.currentSlideIndex - 1);
    }
  }

  renderSlideUI(index) {
    const data = SLIDES[index];

    // HUD Counter
    document.getElementById('hud-current-slide').textContent = String(index + 1).padStart(2, '0');
    document.getElementById('hud-total-slides').textContent = String(this.totalSlides).padStart(2, '0');

    // Navigation Dots
    const dotsContainer = document.getElementById('slide-dots');
    dotsContainer.innerHTML = '';
    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = `slide-dot ${i === index ? 'active' : ''}`;
      dot.title = `Slide ${i + 1}: ${SLIDES[i].title.replace(/<[^>]*>/g, '')}`;
      dot.onclick = () => this.goToSlide(i);
      dotsContainer.appendChild(dot);
    }

    const viewport = document.getElementById('slide-viewport');

    if (data.id === 'live-problem') {
      // Slide 1: Live Problem Statement - Vertical Video Theater Split
      viewport.innerHTML = `
        <div class="problem-split-container">
          <div class="problem-left-col">
            <div class="slide-kicker ${data.kickerType || 'danger'}">${data.kicker}</div>
            <h1 class="slide-title">${data.title}</h1>
            <div class="bullets-stack">
              ${data.bullets.map(b => `
                <div class="bullet-item ${b.glow || 'glow-danger'}">
                  <span class="bullet-icon">${b.icon}</span>
                  <span class="bullet-text">${b.text}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="merchant-quote-card">
              <div class="quote-author">🎙️ LIVE MERCHANT TESTIMONY • KATHMANDU</div>
              <div class="quote-nepali">"Customer le scan garyo bhane network chaina bhanda payment fail hunchha... ani cash nai maagnu parcha."</div>
              <div style="font-size: 11px; color: #94a3b8; line-height: 1.3;">("When customers scan and cellular signal drops, digital payment times out... forcing an awkward fallback to cash.")</div>
            </div>
          </div>

          <div class="problem-right-col">
            <div class="vertical-phone-kiosk">
              <div class="kiosk-notch"></div>
              <div class="kiosk-screen">
                <div class="kiosk-top-overlay">
                  <div class="kiosk-live-badge">
                    <span class="kiosk-pulse-red"></span>
                    <span>LIVE RECORDING</span>
                  </div>
                  <button class="kiosk-sound-btn active" id="problem-sound-btn" onclick="event.stopPropagation(); presentation.toggleProblemVideoAudio()">
                    🔊 <span id="problem-sound-state">Audio: ON</span>
                  </button>
                </div>
                <video id="problem-live-video" src="problem-live.mp4" playsinline preload="auto" onclick="presentation.toggleProblemVideoPlay()"></video>
                <div class="kiosk-start-overlay hidden" id="problem-start-overlay" onclick="presentation.startProblemVideoWithSound()">
                  <div class="kiosk-play-pulse-btn">
                    <span class="kiosk-play-icon">▶</span>
                  </div>
                  <div class="kiosk-start-heading">TAP TO PLAY WITH SOUND</div>
                  <div class="kiosk-start-sub">Unmutes live merchant interview (100% Volume)</div>
                </div>
                <div class="kiosk-progress-bar">
                  <div class="kiosk-progress-fill" id="problem-progress-fill"></div>
                </div>
              </div>
            </div>

            <div class="kiosk-controls-row">
              <button class="theater-btn replay-btn" onclick="presentation.replayProblemVideo()" title="Replay Live Recording">
                🔄 Replay Video
              </button>
              <button class="theater-btn next-slide-btn" id="problem-next-btn" onclick="presentation.nextSlide()" title="Proceed to Our Solution [Space or ➔]">
                <span>Our Solution</span> <span class="theater-arrow">➔</span> <kbd class="kbd-badge">Space</kbd>
              </button>
            </div>
          </div>
        </div>
      `;

      // Autoplay problem live video with sound & safety fallback
      setTimeout(() => {
        const vid = document.getElementById('problem-live-video');
        const progressFill = document.getElementById('problem-progress-fill');
        const nextBtn = document.getElementById('problem-next-btn');
        const soundBtn = document.getElementById('problem-sound-btn');
        const soundState = document.getElementById('problem-sound-state');
        const overlay = document.getElementById('problem-start-overlay');

        if (!vid) return;

        vid.currentTime = 0;
        vid.muted = false;
        vid.volume = 1.0;

        vid.ontimeupdate = () => {
          if (progressFill && vid.duration) {
            const pct = (vid.currentTime / vid.duration) * 100;
            progressFill.style.width = `${pct}%`;
          }
        };

        vid.onended = () => {
          if (nextBtn) nextBtn.classList.add('pulse-ready');
          if (progressFill) progressFill.style.width = '100%';
          this.showToast('✨ Live recording complete! Press [Space] to reveal our Solution');
        };

        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (overlay) overlay.classList.add('hidden');
              if (soundBtn) soundBtn.classList.add('active');
              if (soundState) soundState.textContent = 'Audio: ON 🔊';
            })
            .catch(err => {
              console.warn('Autoplay unmuted blocked by policy; waiting for user gesture at 0:', err);
              // Pause at time 0 so it DOES NOT silently run ahead without sound!
              vid.pause();
              vid.currentTime = 0;
              if (overlay) overlay.classList.remove('hidden');
              if (soundBtn) soundBtn.classList.remove('active');
              if (soundState) soundState.textContent = 'Click for Sound 🔊';
              this.showToast('🔊 Tap the phone screen to start video with sound');
            });
        }
      }, 60);

    } else if (data.id === 'solution') {
      // Slide 2: Full-Screen Independent Theater Mode for 10-Second 3D Architecture Video
      viewport.innerHTML = `
        <div class="theater-fullscreen-container">
          <div class="theater-topbar">
            <div class="theater-top-title-group">
              <div class="theater-badge">
                <span class="theater-pulse-dot"></span>
                <span>OFFLINEPAY 3D ARCHITECTURE</span>
              </div>
              <h2 class="theater-main-title">10-Sec Live Protocol Demonstration</h2>
            </div>
            <button class="theater-sound-pill active" id="vid-audio-toggle" onclick="presentation.toggleVideoAudio()">
              🔊 <span id="vid-audio-state">Voiceover: ON (100%)</span>
            </button>
          </div>

          <div class="theater-screen-frame">
            <video id="solution-demo-video" src="solution-demo.mp4" playsinline preload="auto"></video>
            <div class="theater-progress-track">
              <div class="theater-progress-fill" id="vid-progress-fill"></div>
            </div>
          </div>

          <div class="theater-bottom-bar">
            <div class="theater-flow-chips">
              <span class="flow-chip active">1. Dynamic QR Handshake</span>
              <span class="flow-arrow">➔</span>
              <span class="flow-chip active">2. Cryptographic Offline Vault</span>
              <span class="flow-arrow">➔</span>
              <span class="flow-chip active">3. eSewa / Khalti Sync</span>
            </div>

            <div class="theater-action-group">
              <button class="theater-btn replay-btn" onclick="presentation.replayTheaterVideo()" title="Replay 10-second video">
                🔄 Replay
              </button>
              <button class="theater-btn next-slide-btn" id="theater-next-btn" onclick="presentation.nextSlide()" title="Proceed to Slide 3 [Space or ➔]">
                <span>Next Slide</span> <span class="theater-arrow">➔</span> <kbd class="kbd-badge">Space</kbd>
              </button>
            </div>
          </div>
        </div>
      `;

      // Autoplay unmuted with safety fallback
      setTimeout(() => {
        const vid = document.getElementById('solution-demo-video');
        const progressFill = document.getElementById('vid-progress-fill');
        const nextBtn = document.getElementById('theater-next-btn');
        const soundState = document.getElementById('vid-audio-state');
        const soundBtn = document.getElementById('vid-audio-toggle');

        if (!vid) return;

        vid.currentTime = 0;
        vid.muted = false;
        vid.volume = 1.0;

        // Progress bar updates
        vid.ontimeupdate = () => {
          if (progressFill && vid.duration) {
            const pct = (vid.currentTime / vid.duration) * 100;
            progressFill.style.width = `${pct}%`;
          }
        };

        // When video finishes, pulse Next Slide button & show alert toast
        vid.onended = () => {
          if (nextBtn) {
            nextBtn.classList.add('pulse-ready');
          }
          if (progressFill) progressFill.style.width = '100%';
          this.showToast('✨ Demonstration complete! Press [Space] or click Next Slide');
        };

        // Attempt unmuted playback
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (soundBtn) soundBtn.classList.add('active');
              if (soundState) soundState.textContent = 'Voiceover: ON 🔊';
            })
            .catch(err => {
              console.warn('Autoplay unmuted restricted by browser policy:', err);
              // Fallback to muted playback and clearly invite user
              vid.muted = true;
              vid.play().catch(() => {});
              if (soundBtn) soundBtn.classList.remove('active');
              if (soundState) soundState.textContent = 'Click to Unmute 🔊';
              this.showToast('🔊 Click "Unmute Voiceover" to hear narration');
            });
        }
      }, 60);

    } else {
      // Standard Slide View
      viewport.innerHTML = `
        <div class="slide active">
          <div class="slide-kicker ${data.kickerType || ''}">${data.kicker}</div>
          <h1 class="slide-title">${data.title}</h1>
          <div class="bullets-stack">
            ${data.bullets.map(b => `
              <div class="bullet-item ${b.glow || ''}">
                <span class="bullet-icon">${b.icon}</span>
                <span class="bullet-text">${b.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Prompter update
    this.updatePrompter(data);
  }

  updatePrompter(data) {
    const p = data.prompter;
    if (!p) return;

    document.getElementById('prompter-title').textContent = `Slide ${this.currentSlideIndex + 1} Prompter`;
    document.getElementById('prompter-script').textContent = p.script;
    document.getElementById('prompter-takeaway').textContent = p.takeaway;
    document.getElementById('prompter-cue').textContent = p.cue;

    const qaContainer = document.getElementById('prompter-qa');
    qaContainer.innerHTML = (p.qa || []).map(item => `
      <div class="qa-card">
        <div class="qa-q">Q: ${item.q}</div>
        <div class="qa-a">${item.a}</div>
      </div>
    `).join('');
  }

  showToast(message, isDanger = false) {
    const toast = document.getElementById('hud-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.borderColor = isDanger ? 'var(--danger)' : 'var(--primary)';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  triggerSlideAction(fnName) {
    if (this[fnName]) this[fnName]();
  }

  igniteVault() {
    sfx.verifySuccess();
    this.showToast('✨ Offline Vault Initialized: Phone Secured & Balance Ready');
    const grp = this.slideObjects[0].userData;
    if (grp) {
      if (grp.heroCoin) {
        grp.heroCoin.scale.set(1.35, 1.35, 1.35);
        setTimeout(() => grp.heroCoin.scale.set(1.0, 1.0, 1.0), 300);
      }
      if (grp.lockGroup) {
        grp.lockGroup.rotation.z += Math.PI * 2;
      }
    }
  }

  simulateBlackout() {
    sfx.dangerAlert();
    this.showToast('⚠️ CENTRAL TOWER BLACKOUT: 0 Signal Bars — OfflinePay Engaged', true);
    const grp = this.slideObjects[1].userData;
    if (grp) {
      if (grp.beacon) {
        grp.beacon.scale.set(2.2, 2.2, 2.2);
        setTimeout(() => grp.beacon.scale.set(1.0, 1.0, 1.0), 400);
      }
      if (grp.warningSign) {
        grp.warningSign.position.z += 0.4;
        setTimeout(() => grp.warningSign.position.z -= 0.4, 400);
      }
    }
  }

  startProblemVideoWithSound() {
    const vid = document.getElementById('problem-live-video');
    const overlay = document.getElementById('problem-start-overlay');
    const soundBtn = document.getElementById('problem-sound-btn');
    const soundState = document.getElementById('problem-sound-state');
    if (!vid) return;

    if (overlay) overlay.classList.add('hidden');
    vid.currentTime = 0;
    vid.muted = false;
    vid.volume = 1.0;

    vid.play().then(() => {
      if (soundBtn) soundBtn.classList.add('active');
      if (soundState) soundState.textContent = 'Audio: ON 🔊';
      this.showToast('🎙️ Live Merchant Testimony: 100% Volume (Playing from Start)');
    }).catch(err => {
      console.warn('Playback error:', err);
      vid.muted = true;
      vid.play().catch(() => {});
    });
  }

  toggleProblemVideoPlay() {
    const vid = document.getElementById('problem-live-video');
    const overlay = document.getElementById('problem-start-overlay');
    if (!vid) return;

    if (overlay && !overlay.classList.contains('hidden')) {
      this.startProblemVideoWithSound();
      return;
    }

    if (vid.paused) {
      vid.play();
      this.showToast('▶️ Playing Live Ground Recording');
    } else {
      vid.pause();
      this.showToast('⏸️ Paused Live Ground Recording');
    }
  }

  toggleProblemVideoAudio() {
    const vid = document.getElementById('problem-live-video');
    const btn = document.getElementById('problem-sound-btn');
    const stateSpan = document.getElementById('problem-sound-state');
    const overlay = document.getElementById('problem-start-overlay');
    if (!vid) return;

    vid.muted = !vid.muted;
    if (!vid.muted) {
      vid.volume = 1.0;
      // If user unmuted during the initial 6 seconds, rewind to 0 so they hear the start!
      if (vid.currentTime < 6.0) {
        vid.currentTime = 0;
      }
      vid.play().catch(() => {});
      if (overlay) overlay.classList.add('hidden');
      if (btn) btn.classList.add('active');
      if (stateSpan) stateSpan.textContent = 'Audio: ON 🔊';
      this.showToast('🎙️ Merchant Audio: UNMUTED (100% Volume)');
    } else {
      if (btn) btn.classList.remove('active');
      if (stateSpan) stateSpan.textContent = 'Audio: OFF 🔇';
      this.showToast('🔇 Merchant Audio Muted');
    }
  }

  replayProblemVideo() {
    const vid = document.getElementById('problem-live-video');
    const nextBtn = document.getElementById('problem-next-btn');
    const progressFill = document.getElementById('problem-progress-fill');
    const overlay = document.getElementById('problem-start-overlay');
    const soundBtn = document.getElementById('problem-sound-btn');
    const soundState = document.getElementById('problem-sound-state');
    if (!vid) return;

    if (nextBtn) nextBtn.classList.remove('pulse-ready');
    if (progressFill) progressFill.style.width = '0%';
    if (overlay) overlay.classList.add('hidden');

    vid.currentTime = 0;
    vid.muted = false;
    vid.volume = 1.0;
    vid.play().then(() => {
      if (soundBtn) soundBtn.classList.add('active');
      if (soundState) soundState.textContent = 'Audio: ON 🔊';
    }).catch(() => {
      vid.muted = true;
      vid.play().catch(() => {});
    });

    sfx.slideChange();
    this.showToast('🔄 Replaying Live Merchant Problem Testimony');
  }

  firePaymentBeam() {
    this.replayTheaterVideo();
  }

  replayTheaterVideo() {
    const vid = document.getElementById('solution-demo-video');
    const nextBtn = document.getElementById('theater-next-btn');
    const progressFill = document.getElementById('vid-progress-fill');
    if (!vid) return;

    if (nextBtn) nextBtn.classList.remove('pulse-ready');
    if (progressFill) progressFill.style.width = '0%';

    vid.currentTime = 0;
    vid.muted = false;
    vid.volume = 1.0;
    vid.play().catch(() => {
      vid.muted = true;
      vid.play().catch(() => {});
    });

    sfx.beamLaser();
    this.showToast('⚡ Replaying 10-Second 3D Solution Demo');
  }

  toggleVideoAudio() {
    const vid = document.getElementById('solution-demo-video');
    const btn = document.getElementById('vid-audio-toggle');
    const stateSpan = document.getElementById('vid-audio-state');
    if (!vid) return;

    vid.muted = !vid.muted;
    if (!vid.muted) {
      vid.volume = 1.0;
      vid.play().catch(() => {});
      if (btn) btn.classList.add('active');
      if (stateSpan) stateSpan.textContent = 'Voiceover: ON 🔊';
      this.showToast('🎙️ Solution Voiceover: UNMUTED (100% Volume)');
    } else {
      if (btn) btn.classList.remove('active');
      if (stateSpan) stateSpan.textContent = 'Click to Unmute 🔊';
      this.showToast('🔇 Solution Voiceover: MUTED');
    }
  }

  scanUserSegments() {
    sfx.verifySuccess();
    this.showToast('📍 Ecosystem Connected: Tea Merchant Standee & Transit Bus Synced');
    const grp = this.slideObjects[3].userData;
    if (grp) {
      if (grp.shopPin) {
        grp.shopPin.position.y += 0.35;
        setTimeout(() => grp.shopPin.position.y -= 0.35, 300);
      }
      if (grp.busPin) {
        setTimeout(() => {
          grp.busPin.position.y += 0.35;
          setTimeout(() => grp.busPin.position.y -= 0.35, 300);
        }, 150);
      }
    }
  }

  verifyHashChain() {
    sfx.verifySuccess();
    this.showToast('🔐 Cryptographic Hash Chain Verified: NIST P-256 Key Sealed');
    const grp = this.slideObjects[4].userData;
    if (grp) {
      if (grp.masterKey) {
        grp.masterKey.rotation.z -= 0.5;
        setTimeout(() => grp.masterKey.rotation.z += 0.5, 300);
      }
      if (grp.chainLinks) {
        grp.chainLinks.forEach((link, idx) => {
          setTimeout(() => {
            link.scale.set(1.3, 0.8, 1.2);
            setTimeout(() => link.scale.set(1.1, 0.65, 1.0), 250);
          }, idx * 75);
        });
      }
    }
  }

  inspectEconomics() {
    sfx.verifySuccess();
    this.showToast('💰 Non-Custodial Economics: Zero Hardware Capex — Pure Growth');
    const grp = this.slideObjects[5].userData;
    if (grp) {
      if (grp.chartPillars) {
        grp.chartPillars.forEach((p, idx) => {
          p.scale.y = 1.35;
          setTimeout(() => p.scale.y = 1.0, 300 + idx * 80);
        });
      }
      if (grp.goldCoins) {
        grp.goldCoins.forEach((c, idx) => {
          c.position.y += 0.2;
          setTimeout(() => c.position.y -= 0.2, 250 + (idx % 3) * 60);
        });
      }
    }
  }

  displayImpact() {
    sfx.verifySuccess();
    this.showToast('🛡️ Disaster Resilience: Aegis Shield Active During Grid Blackout');
    const grp = this.slideObjects[6].userData;
    if (grp && grp.aegisShield) {
      grp.aegisShield.scale.set(1.25, 1.25, 1.25);
      setTimeout(() => grp.aegisShield.scale.set(1.0, 1.0, 1.0), 350);
    }
  }

  launchPilot() {
    sfx.verifySuccess();
    this.showToast('🚀 Trinity Sci-Pitch Pilot Ready: Rocket Ignited & Verified');
    const grp = this.slideObjects[7].userData;
    if (grp) {
      if (grp.rocketGroup) {
        grp.rocketGroup.position.y += 0.6;
        setTimeout(() => grp.rocketGroup.position.y -= 0.6, 500);
      }
      if (grp.flame) {
        grp.flame.scale.set(1.8, 2.5, 1.8);
        setTimeout(() => grp.flame.scale.set(1.0, 1.0, 1.0), 500);
      }
    }
  }

  togglePrompter() {
    const drawer = document.getElementById('prompter-drawer');
    const btn = document.getElementById('prompter-toggle-btn');
    this.isPrompterOpen = !this.isPrompterOpen;
    drawer.classList.toggle('open', this.isPrompterOpen);
    btn.classList.toggle('active', this.isPrompterOpen);
  }

  toggleFullscreen() {
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('fullscreen-mode'));
    if (!isFS) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          this.setSimulatedFullscreen(true);
        });
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen().catch(() => {
          this.setSimulatedFullscreen(true);
        });
      } else {
        this.setSimulatedFullscreen(true);
      }
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
        document.webkitExitFullscreen().catch(() => {});
      }
      this.setSimulatedFullscreen(false);
    }
  }

  exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
      document.webkitExitFullscreen().catch(() => {});
    }
    this.setSimulatedFullscreen(false);
  }

  setSimulatedFullscreen(enable) {
    document.body.classList.toggle('fullscreen-mode', enable);
    document.documentElement.classList.toggle('fullscreen-mode', enable);
    this.syncFullscreenUI();
  }

  syncFullscreenUI() {
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('fullscreen-mode'));
    document.body.classList.toggle('fullscreen-mode', isFS);
    document.documentElement.classList.toggle('fullscreen-mode', isFS);

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.textContent = isFS ? '🗗' : '⛶';
      fsBtn.title = isFS ? 'Exit Fullscreen [F]' : 'Toggle Fullscreen [F]';
    }

    const floatingBar = document.getElementById('floating-fs-bar');
    if (floatingBar) {
      floatingBar.style.display = isFS ? 'inline-flex' : 'none';
    }

    this.updateResponsiveLayout();
  }

  toggleClapDetection() {
    // 1. Mandatory for iOS Safari: Synchronously instantiate & resume AudioContext inside user gesture call stack
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!this.clapAudioCtx || this.clapAudioCtx.state === 'closed') {
      this.clapAudioCtx = new AudioCtx();
    }
    if (this.clapAudioCtx && this.clapAudioCtx.state === 'suspended') {
      this.clapAudioCtx.resume().catch(() => {});
    }

    // Force-unlock iOS WebAudio hardware pipeline by playing a 1-sample silent buffer directly to destination
    try {
      if (this.clapAudioCtx) {
        const dummy = this.clapAudioCtx.createBuffer(1, 1, 22050);
        const src = this.clapAudioCtx.createBufferSource();
        src.buffer = dummy;
        src.connect(this.clapAudioCtx.destination);
        src.start(0);
      }
    } catch (_) {}

    this.executeToggleClap();
  }

  async executeToggleClap() {
    if (this.isClapNavActive) {
      this.stopClapDetection();
      this.showToast('👏 Clap Navigation: OFF');
    } else {
      const started = await this.startClapDetection();
      if (started) {
        this.showToast('👏 Clap Nav Active — Listening (Clap to advance!)');
      }
    }
  }

  async startClapDetection() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.showToast('⚠️ Microphone API not supported in this browser', true);
        return false;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.clapAudioCtx || this.clapAudioCtx.state === 'closed') {
        this.clapAudioCtx = new AudioCtx();
      }
      if (this.clapAudioCtx && this.clapAudioCtx.state === 'suspended') {
        await this.clapAudioCtx.resume().catch(() => {});
      }

      // Universal audio constraints:
      // echoCancellation: false, noiseSuppression: false, autoGainControl: false
      // are ESSENTIAL for iOS Safari so Apple Voice Processing does NOT suppress hand claps!
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false }
          });
        } catch (err2) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      this.clapStream = stream;
      const source = this.clapAudioCtx.createMediaStreamSource(stream);

      // Pre-amplifier GainNode: 3.5x digital boost so even soft claps from across the room register strongly
      const preAmp = this.clapAudioCtx.createGain();
      preAmp.gain.setValueAtTime(3.5, this.clapAudioCtx.currentTime);

      // Highpass Filter at 250 Hz:
      // Preserves 100% of all clap frequencies (from hollow cupped 400Hz claps to sharp 6000Hz snaps)
      // while filtering out sub-bass room rumbles, AC hum, and table thumps (<250Hz)
      const highPass = this.clapAudioCtx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.setValueAtTime(250, this.clapAudioCtx.currentTime);
      highPass.Q.setValueAtTime(0.7, this.clapAudioCtx.currentTime);

      // ScriptProcessorNode: 1024 samples (~21ms per buffer slice)
      // Runs directly on the audio engine stream without frame-skipping or requestAnimationFrame lag.
      const processor = this.clapAudioCtx.createScriptProcessor(1024, 1, 1);
      this.clapProcessor = processor;

      // CRITICAL FOR iOS SAFARI / WEBKIT:
      // Connect to destination via an inaudible gain (0.00001 = -100dB).
      // Unlike gain=0 (which causes WebKit to prune the graph as silent),
      // non-zero gain keeps the iOS audio hardware rendering clock continuously active!
      const silentGain = this.clapAudioCtx.createGain();
      silentGain.gain.setValueAtTime(0.00001, this.clapAudioCtx.currentTime);

      source.connect(preAmp);
      preAmp.connect(highPass);
      highPass.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(this.clapAudioCtx.destination);

      this.isClapNavActive = true;
      this.updateClapUI(true);

      let prevPeak = 0.005;
      let prevRms = 0.005;
      let noiseFloor = 0.008;

      const meterDot = document.getElementById('clap-meter-dot');
      const fsMeterDot = document.getElementById('fs-clap-meter');

      processor.onaudioprocess = (e) => {
        if (!this.isClapNavActive) return;

        const input = e.inputBuffer.getChannelData(0);
        const len = input.length;

        let peak = 0;
        let sumSq = 0;
        for (let i = 0; i < len; i++) {
          const val = Math.abs(input[i]);
          if (val > peak) peak = val;
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / len);

        // Real-time audio meter animation (live visual proof of mic listening on iOS & desktop)
        if (meterDot || fsMeterDot) {
          const visualScale = Math.min(2.8, Math.max(0.6, 0.6 + rms * 18));
          const dotTransform = `scale(${visualScale})`;
          if (meterDot) meterDot.style.transform = dotTransform;
          if (fsMeterDot) fsMeterDot.style.transform = dotTransform;
        }

        // Slowly track ambient background room floor (smooth exponential average)
        noiseFloor = noiseFloor * 0.95 + rms * 0.05;

        const now = performance.now();
        const cooldown = 750; // 750ms debounce prevents double slide skips
        const cooldownPassed = (now - this.lastClapTimestamp) > cooldown;

        // Instantaneous Transient Calculation:
        // Claps cause an abrupt, instantaneous step spike in peak amplitude and high crest factor
        const deltaPeak = peak - prevPeak;
        const crestFactor = peak / (rms + 0.0001);
        const jumpRatio = rms / (noiseFloor + 0.0001);

        // Sensitive clap impulse criteria (catches soft, cupped, regular, and sharp claps):
        // 1. Any sharp transient jump: deltaPeak > 0.045 && peak > 0.08
        // 2. High impulsive crest factor: crestFactor > 2.4 && peak > 0.09
        // 3. Energy surge above ambient floor: jumpRatio > 2.0 && peak > 0.075
        // 4. Strong impulse peak: peak > 0.20
        const isClap = (
          (deltaPeak > 0.045 && peak > 0.08) ||
          (crestFactor > 2.4 && peak > 0.09) ||
          (jumpRatio > 2.0 && peak > 0.075) ||
          (peak > 0.20)
        );

        if (cooldownPassed && isClap) {
          this.lastClapTimestamp = now;
          this.onClapDetected(peak);
        }

        prevPeak = peak;
        prevRms = rms;
      };

      return true;

    } catch (err) {
      console.warn('Microphone access error:', err);
      this.isClapNavActive = false;
      this.updateClapUI(false);
      this.showToast('⚠️ Microphone permission required for Clap Navigation', true);
      return false;
    }
  }

  stopClapDetection() {
    this.isClapNavActive = false;
    if (this.clapProcessor) {
      this.clapProcessor.onaudioprocess = null;
      try { this.clapProcessor.disconnect(); } catch (_) {}
      this.clapProcessor = null;
    }
    if (this.clapStream) {
      this.clapStream.getTracks().forEach(t => t.stop());
      this.clapStream = null;
    }
    if (this.clapAudioCtx) {
      this.clapAudioCtx.close().catch(() => {});
      this.clapAudioCtx = null;
    }
    this.updateClapUI(false);
  }

  updateClapUI(active) {
    const clapBtn = document.getElementById('clap-toggle-btn');
    if (clapBtn) {
      clapBtn.classList.toggle('active', active);
      clapBtn.title = active ? 'Clap Navigation: ON [C]' : 'Toggle Clap Navigation [C]';
    }
    const fsClapBtn = document.getElementById('fs-clap-btn');
    const fsClapLabel = document.getElementById('fs-clap-label');
    if (fsClapBtn) {
      fsClapBtn.classList.toggle('active', active);
    }
    if (fsClapLabel) {
      fsClapLabel.textContent = active ? 'Clap Nav: ON' : 'Clap Nav: OFF';
    }
  }

  onClapDetected(level = 0) {
    try {
      if (typeof sfx !== 'undefined' && sfx.slideChange) {
        sfx.slideChange();
      }
    } catch (_) {}

    const pct = Math.round(level * 100);
    this.showToast(`👏 Clap Registered! (${pct}%) ➔ Next Slide`);

    try {
      const clapBtn = document.getElementById('clap-toggle-btn');
      const fsClapBtn = document.getElementById('fs-clap-btn');
      const meterDot = document.getElementById('clap-meter-dot');
      const fsMeterDot = document.getElementById('fs-clap-meter');

      [clapBtn, fsClapBtn].forEach(btn => {
        if (btn) {
          btn.classList.add('clap-pulse');
          setTimeout(() => btn.classList.remove('clap-pulse'), 550);
        }
      });

      [meterDot, fsMeterDot].forEach(dot => {
        if (dot) {
          dot.style.background = '#00f0ff';
          dot.style.boxShadow = '0 0 16px #00f0ff';
          dot.style.transform = 'scale(3)';
          setTimeout(() => {
            if (dot) {
              dot.style.background = '#10b981';
              dot.style.boxShadow = '0 0 10px #10b981';
            }
          }, 400);
        }
      });
    } catch (_) {}

    // Advance to next slide unconditionally!
    this.nextSlide();
  }

  toggleMute() {
    sfx.muted = !sfx.muted;
    const btn = document.getElementById('sound-toggle-btn');
    btn.classList.toggle('active', !sfx.muted);
    btn.textContent = sfx.muted ? '🔇' : '🔊';
  }

  startTimer() {
    const timerEl = document.getElementById('hud-timer');
    setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  getSlideScale(slideId) {
    switch (slideId) {
      case 'target-users':
        return 0.76; // Goldilocks medium size: bold, clearly visible, balanced margins
      case 'science':
        return 0.88; // Prominent enclave, clear NIST key and cryptographic chain
      case 'business':
        return 0.82; // Bold financial pillars & legible badges
      case 'benefits':
        return 0.80; // Large radiant Aegis resilience shield
      case 'conclusion':
        return 0.84; // Celebratory rocket & halo rings
      case 'problem':
        return 0.84; // Cell blackout tower
      case 'idea':
        return 1.15; // Hero digital wallet phone
      default:
        return 0.82;
    }
  }

  getSlideYOffset(slideId) {
    switch (slideId) {
      case 'target-users':
        return -0.18;
      case 'business':
        return -0.22;
      case 'benefits':
        return -0.14;
      case 'conclusion':
        return -0.15;
      case 'science':
        return -0.12;
      case 'problem':
        return -0.15;
      default:
        return 0;
    }
  }

  updateResponsiveLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const isPortrait = h > w;
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('fullscreen-mode'));

    if (this.camera) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(w, h);
    }

    if (isPortrait) {
      // Mobile / Portrait Tablet: Center 3D model gracefully in upper viewport
      const scaleFactor = aspect < 0.55 ? 0.65 : 0.74;
      const posY = aspect < 0.55 ? 1.40 : 1.20;
      
      this.targetCamera = { x: 0, y: 0.1, z: aspect < 0.55 ? 7.2 : 6.6 };
      this.targetLookAt = { x: 0, y: 0.4, z: 0 };

      this.slideObjects.forEach((grp, idx) => {
        const slideData = SLIDES[idx];
        const slideId = slideData ? slideData.id : null;
        const scaleVal = this.getSlideScale(slideId) * scaleFactor;
        grp.position.set(0, posY, 0);
        grp.scale.set(scaleVal, scaleVal, scaleVal);
      });
    } else if (w < 1100) {
      // Compact landscape (1024x768, laptops, netbooks) - Keep medium-sized and prominent!
      const posX = 1.62;
      this.targetCamera = { x: 0, y: 0.08, z: isFS ? 5.60 : 5.85 };
      this.targetLookAt = { x: 0, y: 0, z: 0 };

      this.slideObjects.forEach((grp, idx) => {
        const slideData = SLIDES[idx];
        const slideId = slideData ? slideData.id : null;
        const scaleVal = this.getSlideScale(slideId) * (isFS ? 1.05 : 0.94);
        const yOff = this.getSlideYOffset(slideId);
        grp.position.set(posX, yOff, 0);
        grp.scale.set(scaleVal, scaleVal, scaleVal);
      });
    } else {
      // Standard desktop / wide screen:
      // In fullscreen, camera is positioned closer and 3D objects are scaled up by 1.12x to fill stage
      const posX = isFS ? 1.76 : 1.74;
      this.targetCamera = { x: 0, y: 0.08, z: isFS ? 5.50 : 5.75 };
      this.targetLookAt = { x: 0, y: 0, z: 0 };

      this.slideObjects.forEach((grp, idx) => {
        const slideData = SLIDES[idx];
        const slideId = slideData ? slideData.id : null;
        const scaleVal = this.getSlideScale(slideId) * (isFS ? 1.12 : 1.0);
        const yOff = this.getSlideYOffset(slideId);
        grp.position.set(posX, yOff, 0);
        grp.scale.set(scaleVal, scaleVal, scaleVal);
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.updateResponsiveLayout();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateResponsiveLayout(), 120);
    });

    // Browser fullscreen state change listeners
    const onFullscreenChange = () => this.syncFullscreenUI();
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    // First-interaction gesture: auto-start problem video with sound on first user gesture & unlock WebAudio
    const triggerAudioOnFirstGesture = () => {
      const vid = document.getElementById('problem-live-video');
      const overlay = document.getElementById('problem-start-overlay');
      if (vid && this.currentSlideIndex === 0 && (vid.paused || (overlay && !overlay.classList.contains('hidden')))) {
        this.startProblemVideoWithSound();
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.clapAudioCtx && AudioCtx) {
        this.clapAudioCtx = new AudioCtx();
      }
      if (this.clapAudioCtx && this.clapAudioCtx.state === 'suspended') {
        this.clapAudioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('click', triggerAudioOnFirstGesture, { once: true });
    window.addEventListener('touchstart', triggerAudioOnFirstGesture, { once: true, passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        const vid = document.getElementById('problem-live-video');
        const overlay = document.getElementById('problem-start-overlay');
        if (this.currentSlideIndex === 0 && vid && (vid.paused || (overlay && !overlay.classList.contains('hidden')))) {
          this.startProblemVideoWithSound();
          return;
        }
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        this.prevSlide();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'n' || e.key === 'N') {
        this.togglePrompter();
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (document.body.classList.contains('fullscreen-mode') && !document.fullscreenElement) {
          this.setSimulatedFullscreen(false);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        this.toggleClapDetection();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleMute();
      } else if (e.key >= '1' && e.key <= '8') {
        const target = parseInt(e.key) - 1;
        if (target < this.totalSlides) this.goToSlide(target);
      }
    });

    // Mouse Drag for 3D Camera Orbit
    this.container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('fullscreen-mode'));
      if (isFS) {
        const bottomHud = document.querySelector('.bottom-hud');
        if (bottomHud) {
          if (e.clientY > window.innerHeight - 80) {
            bottomHud.classList.add('hover-active');
          } else {
            bottomHud.classList.remove('hover-active');
          }
        }
      }
      if (this.isDragging) {
        const dx = e.clientX - this.prevMouseX;
        const dy = e.clientY - this.prevMouseY;
        this.orbitYaw += dx * 0.005;
        this.orbitPitch += dy * 0.005;
        this.orbitPitch = Math.max(-0.5, Math.min(0.5, this.orbitPitch));
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
      }
    });

    // Touch Support: Orbit on 3D Drag + Horizontal Swipe to Change Slides
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        this.isDragging = true;
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.prevMouseX;
        const dy = e.touches[0].clientY - this.prevMouseY;
        this.orbitYaw += dx * 0.006;
        this.orbitPitch += dy * 0.006;
        this.orbitPitch = Math.max(-0.5, Math.min(0.5, this.orbitPitch));
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      this.isDragging = false;

      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        // Intentional swipe gesture detection (horizontal, fast, > 48px)
        if (elapsed < 420 && Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
          const target = e.target;
          if (!target || (!target.closest('button') && !target.closest('.slide-dot') && !target.closest('video') && !target.closest('aside'))) {
            if (deltaX < 0) {
              this.nextSlide();
            } else {
              this.prevSlide();
            }
          }
        }
      }
    }, { passive: true });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const currentSlide = SLIDES[this.currentSlideIndex];
    const isVideoSlide = (currentSlide && (currentSlide.id === 'live-problem' || currentSlide.id === 'solution'));

    // Completely pause 3D WebGL rendering while full-screen videos are playing.
    // This gives 100% of GPU decoding & compositor throughput to the video, eliminating all lag & frame drops!
    if (isVideoSlide) {
      return;
    }

    const time = Date.now() * 0.001;

    if (this.stars) {
      this.stars.rotation.y = time * 0.02;
    }

    const idx = this.currentSlideIndex;
    const grp = this.slideObjects[idx];

    // Dynamic 3D Scene Animations (Data-Driven, not index-dependent)
    if (grp && grp.visible && grp.userData) {
      if (grp.userData.heroPhoneGroup) {
        grp.userData.heroPhoneGroup.rotation.y = time * 0.45;
        grp.userData.heroPhoneGroup.rotation.x = Math.sin(time * 0.7) * 0.08;
        grp.userData.heroPhoneGroup.position.y = Math.sin(time * 1.8) * 0.07;

        if (grp.userData.heroCoin) {
          grp.userData.heroCoin.rotation.z = time * 2.2;
          grp.userData.heroCoin.position.y = 0.15 + Math.sin(time * 2.8) * 0.09;
          grp.userData.heroCoin.rotation.x = (Math.PI / 2) + Math.cos(time * 2.0) * 0.14;
        }
        if (grp.userData.lockGroup) {
          grp.userData.lockGroup.position.y = 1.35 + Math.sin(time * 2.2) * 0.07;
          grp.userData.lockGroup.rotation.y = Math.sin(time * 1.6) * 0.3;
        }
        if (grp.userData.ring1) {
          grp.userData.ring1.rotation.z = time * 0.9;
          grp.userData.ring1.rotation.x = (Math.PI / 3) + Math.sin(time * 1.4) * 0.12;
        }
        if (grp.userData.ring2) {
          grp.userData.ring2.rotation.z = -time * 0.7;
          grp.userData.ring2.rotation.y = (Math.PI / 4) + Math.cos(time * 1.2) * 0.12;
        }
      }
      else if (grp.userData.towerGroup) {
        grp.userData.towerGroup.rotation.y = time * 0.38;
        grp.userData.towerGroup.position.y = -0.15 + Math.sin(time * 1.6) * 0.04;
        if (grp.userData.beacon) {
          const strobe = (time * 2.8) % 1.0;
          const isFlash = (strobe < 0.12 || (strobe > 0.24 && strobe < 0.36));
          const flashScale = isFlash ? 1.7 : 0.25;
          grp.userData.beacon.scale.set(flashScale, flashScale, flashScale);
        }
        if (grp.userData.brokenWaves) {
          grp.userData.brokenWaves.forEach((w, i) => {
            w.rotation.z = time * (1.2 + i * 0.4);
            const tWave = (time * 1.4 + (w.userData.phase || i * 0.33)) % 1.0;
            const waveScale = 0.8 + tWave * 0.7;
            w.scale.set(waveScale, waveScale, waveScale);
            if (w.material) w.material.opacity = Math.max(0, 1.0 - tWave * 0.9);
          });
        }
        if (grp.userData.warningSign) {
          grp.userData.warningSign.position.y = 0.25 + Math.sin(time * 2.0) * 0.05;
          grp.userData.warningSign.rotation.y = 0.12 + Math.sin(time * 1.4) * 0.06;
        }
      }
      else if (grp.userData.phoneAFrame) {
        grp.userData.phoneAFrame.rotation.y = 0.32 + Math.sin(time * 1.5) * 0.12;
        if (grp.userData.phoneBFrame) {
          grp.userData.phoneBFrame.rotation.y = -0.32 - Math.sin(time * 1.5) * 0.12;
        }
        if (grp.userData.waveCore) {
          grp.userData.waveCore.rotation.y = time * 2;
        }
      }
      else if (grp.userData.ecoGroup) {
        grp.userData.ecoGroup.rotation.y = time * 0.35;
        grp.userData.ecoGroup.rotation.x = 0.22 + Math.sin(time * 0.6) * 0.05;
        grp.userData.ecoGroup.position.y = -0.22 + Math.sin(time * 1.6) * 0.04;

        if (grp.userData.floorRing1) grp.userData.floorRing1.rotation.z = time * 0.6;
        if (grp.userData.floorRing2) grp.userData.floorRing2.rotation.z = -time * 0.5;
        if (grp.userData.scanPyramid) {
          const pulse = 1.0 + Math.sin(time * 7.0) * 0.15;
          grp.userData.scanPyramid.scale.set(pulse, 1.0, pulse);
          if (grp.userData.scanPyramid.material) {
            grp.userData.scanPyramid.material.opacity = 0.55 + Math.sin(time * 8.0) * 0.35;
          }
        }
        if (grp.userData.ecoHUD) {
          grp.userData.ecoHUD.position.y = 1.45 + Math.sin(time * 1.5) * 0.05;
        }
        if (grp.userData.shopPin) {
          grp.userData.shopPin.position.y = 1.85 + Math.abs(Math.sin(time * 2.6)) * 0.12;
        }
        if (grp.userData.busPin) {
          grp.userData.busPin.position.y = 1.45 + Math.abs(Math.sin(time * 2.6 + 1.2)) * 0.12;
        }
        if (grp.userData.busWheels) {
          grp.userData.busWheels.forEach(w => {
            w.rotation.z = -time * 4.5;
          });
        }
        if (grp.userData.tokenArcCoins) {
          grp.userData.tokenArcCoins.forEach(tc => {
            const t = (time * 0.75 + tc.userData.phase) % 1;
            tc.position.x = -1.15 + t * 2.2;
            tc.position.y = -0.2 + Math.sin(t * Math.PI) * 0.95;
            tc.position.z = -0.3 + t * 0.75;
            tc.rotation.y = time * 5.0;
          });
        }
      }
      else if (grp.userData.cryptoGroup) {
        grp.userData.cryptoGroup.rotation.y = time * 0.36;
        grp.userData.cryptoGroup.rotation.x = 0.10 + Math.sin(time * 0.6) * 0.04;
        grp.userData.cryptoGroup.position.y = -0.22 + Math.sin(time * 1.8) * 0.04;

        if (grp.userData.plinthRing) grp.userData.plinthRing.rotation.z = time * 0.7;
        if (grp.userData.cryptoLaser) {
          grp.userData.cryptoLaser.material.opacity = 0.6 + Math.sin(time * 10.0) * 0.35;
          grp.userData.cryptoLaser.scale.x = 1.0 + Math.sin(time * 12.0) * 0.25;
          grp.userData.cryptoLaser.scale.z = 1.0 + Math.sin(time * 12.0) * 0.25;
        }
        if (grp.userData.cryptoHUD) {
          grp.userData.cryptoHUD.position.y = 1.45 + Math.sin(time * 1.6) * 0.05;
        }
        if (grp.userData.masterKey) {
          grp.userData.masterKey.position.y = 0.75 + Math.sin(time * 2.0) * 0.10;
          grp.userData.masterKey.rotation.y = Math.sin(time * 1.5) * 0.35;
          grp.userData.masterKey.rotation.z = -0.35 + Math.cos(time * 1.4) * 0.08;
        }
        if (grp.userData.chainBlocks) {
          grp.userData.chainBlocks.forEach((b, bi) => {
            b.rotation.y = time * 2.0 + bi * 0.5;
            b.rotation.x = Math.sin(time * 2.2 + bi) * 0.25;
          });
        }
        if (grp.userData.chainLinks) {
          grp.userData.chainLinks.forEach((link, l) => {
            link.position.y = 0.12 + (l % 2 === 0 ? 0.06 : -0.06) + Math.sin(time * 2.8 + l * 0.9) * 0.08;
            if (l % 2 === 0) {
              link.rotation.y = Math.sin(time * 2.2 + l) * 0.25;
            } else {
              link.rotation.z = Math.sin(time * 2.2 + l) * 0.25;
            }
          });
        }
      }
      else if (grp.userData.econGroup) {
        grp.userData.econGroup.rotation.y = time * 0.38;
        grp.userData.econGroup.rotation.x = 0.08 + Math.sin(time * 0.5) * 0.03;
        grp.userData.econGroup.position.y = -0.32 + Math.sin(time * 1.5) * 0.04;

        if (grp.userData.apexCoin) {
          grp.userData.apexCoin.rotation.z = time * 2.5;
          grp.userData.apexCoin.position.y = 1.62 + Math.sin(time * 3.0) * 0.06;
        }
        if (grp.userData.apexHalo) {
          grp.userData.apexHalo.rotation.z = -time * 1.5;
          grp.userData.apexHalo.scale.setScalar(1.0 + Math.sin(time * 3.5) * 0.08);
        }
        if (grp.userData.lightColumns) {
          grp.userData.lightColumns.forEach((col, ci) => {
            col.scale.y = 0.8 + Math.sin(time * 5.0 + ci * 1.4) * 0.25;
            if (col.material) col.material.opacity = 0.7 + Math.sin(time * 6.0 + ci) * 0.25;
          });
        }
        if (grp.userData.goldCoins) {
          grp.userData.goldCoins.forEach((c, i) => {
            c.rotation.y = time * 1.5 + i * 0.25;
          });
        }
        if (grp.userData.arrowHead) {
          const pulse = 1.0 + Math.sin(time * 4.0) * 0.18;
          grp.userData.arrowHead.scale.set(pulse, pulse, pulse);
        }
      }
      else if (grp.userData.impactGroup) {
        grp.userData.impactGroup.rotation.y = time * 0.38;
        grp.userData.impactGroup.rotation.x = Math.sin(time * 0.6) * 0.05;
        grp.userData.impactGroup.position.y = -0.15 + Math.sin(time * 1.6) * 0.04;

        if (grp.userData.forceDome) {
          grp.userData.forceDome.rotation.y = time * 0.28;
        }
        if (grp.userData.satDish) {
          grp.userData.satDish.rotation.z = Math.sin(time * 1.6) * 0.22;
          grp.userData.satDish.rotation.y = Math.cos(time * 1.2) * 0.18;
        }
        if (grp.userData.disasterHUD) {
          grp.userData.disasterHUD.position.y = 1.45 + Math.sin(time * 1.5) * 0.05;
        }
        const phase = (time * 2.4) % 1.0;
        let beat = 0;
        if (phase < 0.15) beat = Math.sin((phase / 0.15) * Math.PI) * 0.40;
        else if (phase >= 0.22 && phase < 0.35) beat = Math.sin(((phase - 0.22) / 0.13) * Math.PI) * 0.25;
        
        if (grp.userData.ekgTube) {
          grp.userData.ekgTube.scale.set(1.0 + beat, 1.0 + beat, 1.0 + beat);
        }
        if (grp.userData.crossH && grp.userData.crossV) {
          const crossGlow = 0.75 + beat * 0.8;
          grp.userData.crossH.material.emissiveIntensity = crossGlow;
          grp.userData.crossV.material.emissiveIntensity = crossGlow;
        }
        if (grp.userData.forceRing1) grp.userData.forceRing1.rotation.z = time * 1.0;
        if (grp.userData.forceRing2) grp.userData.forceRing2.rotation.z = -time * 0.8;
      }
      else if (grp.userData.finaleGroup) {
        grp.userData.finaleGroup.rotation.y = time * 0.40;
        grp.userData.finaleGroup.rotation.x = Math.sin(time * 0.5) * 0.05;
        grp.userData.finaleGroup.position.y = Math.sin(time * 1.8) * 0.05;

        if (grp.userData.phoneTrophy) {
          grp.userData.phoneTrophy.position.y = Math.sin(time * 2.0) * 0.04;
        }
        if (grp.userData.rocketGroup) {
          grp.userData.rocketGroup.position.y = 0.2 + Math.sin(time * 2.4) * 0.09;
        }
        if (grp.userData.flame) {
          const flicker = 1.0 + Math.sin(time * 22.0) * 0.28 + Math.sin(time * 43.0) * 0.15;
          grp.userData.flame.scale.set(1.0 + flicker * 0.12, flicker, 1.0 + flicker * 0.12);
        }
        if (grp.userData.halo1) grp.userData.halo1.rotation.z = time * 0.9;
        if (grp.userData.halo2) grp.userData.halo2.rotation.z = -time * 0.7;
      }
    }

    // Automatic cinematic drift when user is not manually dragging
    if (!this.isDragging) {
      this.autoOrbitTime = (this.autoOrbitTime || 0) + 0.005;
      const autoYaw = Math.sin(this.autoOrbitTime * 0.6) * 0.10;
      const autoPitch = Math.cos(this.autoOrbitTime * 0.5) * 0.03;

      this.orbitYaw += (autoYaw - this.orbitYaw) * 0.03;
      this.orbitPitch += (autoPitch - this.orbitPitch) * 0.03;
    }

    // Camera smoothing with orbit controls
    const baseCamX = this.targetCamera.x + Math.sin(this.orbitYaw) * 0.7;
    const baseCamY = this.targetCamera.y + this.orbitPitch * 0.3;
    const baseCamZ = this.targetCamera.z + Math.cos(this.orbitYaw) * 0.7;

    this.camera.position.x += (baseCamX - this.camera.position.x) * 0.06;
    this.camera.position.y += (baseCamY - this.camera.position.y) * 0.06;
    this.camera.position.z += (baseCamZ - this.camera.position.z) * 0.06;

    this.currentLookAt.x += (this.targetLookAt.x - this.currentLookAt.x) * 0.06;
    this.currentLookAt.y += (this.targetLookAt.y - this.currentLookAt.y) * 0.06;
    this.currentLookAt.z += (this.targetLookAt.z - this.currentLookAt.z) * 0.06;

    this.camera.lookAt(this.currentLookAt.x, this.currentLookAt.y, this.currentLookAt.z);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.presentation = new PresentationApp();
});
