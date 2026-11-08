// Chemistry world: doses in one flask (level, color, fizz, heat).
// Reads live config refs (sliders edit counts/strength in place); rebind() refreshes refs.
export function createWorld({ substances, material, laws }) {
  const byId = (arr) => {
    const o = {};
    (arr || []).forEach((x) => { o[x.id] = x; });
    return o;
  };
  return {
    groups: byId(substances),
    material: byId(material),
    laws: laws || [],
    t: 0,
    temp: 19,
    ph: 7,
    volume: 0,
    fizz: 0,
    heating: false,
    mixed: false,
    W: 800,
    H: 600,
    doses() {
      const g = this.groups;
      return {
        bleu: (g.bleu && g.bleu.count) || 0,
        jaune: (g.jaune && g.jaune.count) || 0,
        acide: (g.acide && g.acide.count) || 0,
      };
    },
    rebind(substances, mat) {
      this.groups = byId(substances);
      this.material = byId(mat);
    },
    reset() {
      this.t = 0; this.temp = 19; this.ph = 7; this.volume = 0;
      this.fizz = 0; this.heating = false; this.mixed = false;
    },
    setSize(w, h) { this.W = w; this.H = h; },
    step(dt, isActive) {
      this.t += dt;
      this.fizz = 0; this.heating = false; this.mixed = false; this.ph = 7; this.volume = 0;
      for (const l of this.laws) {
        if (isActive("laws", l.id)) l.mod.apply(this, dt, l.params, l.targetIds, isActive);
      }
      this.temp += (19 - this.temp) * Math.min(1, 0.25 * dt);
      if (this.temp >= 99.5) this.fizz = 1;
      this.temp = Math.max(0, Math.min(100, this.temp));
    },
    measures() {
      const out = {
        temp: Math.round(this.temp * 10) / 10,
        ph: this.ph,
        volume: this.volume,
      };
      for (const id of Object.keys(this.groups)) out[`counts.${id}`] = this.groups[id].count || 0;
      return out;
    },
    draw(ctx, W, H) {
      const ink = "#e8e6e1";
      const benchY = H * 0.68;
      // Wooden bench.
      const wood = ctx.createLinearGradient(0, benchY, 0, H);
      wood.addColorStop(0, "#5b4a33"); wood.addColorStop(1, "#3f3423");
      ctx.fillStyle = wood;
      ctx.fillRect(0, benchY, W, H - benchY);
      // Flask geometry (fractions of the smallest side).
      const s = Math.min(W, H);
      const fx = W * 0.36;
      const baseY = benchY - 6;
      const topW = s * 0.11, botW = s * 0.21, fh = s * 0.4, neckH = s * 0.1;
      const topY = baseY - fh;
      const flask = () => {
        ctx.beginPath();
        ctx.moveTo(fx - topW, topY);
        ctx.lineTo(fx + topW, topY);
        ctx.lineTo(fx + botW, baseY);
        ctx.lineTo(fx - botW, baseY);
        ctx.closePath();
      };
      // Liquid (clipped to the flask).
      const d = this.doses();
      const frac = Math.min(1, this.volume / 500);
      let color = null;
      if (d.bleu + d.jaune + d.acide > 0) {
        if (d.bleu > 0 && d.jaune > 0) color = d.acide > 0 ? "#65a30d" : "#16a34a";
        else if (d.bleu > 0) color = "#2563eb";
        else if (d.jaune > 0) color = "#facc15";
        else color = "#fb923c";
      }
      if (color && frac > 0) {
        ctx.save();
        flask(); ctx.clip();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(fx - botW - 2, baseY - fh * frac, botW * 2 + 4, fh * frac + 2);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      // Bubbles.
      if (this.fizz && frac > 0) {
        const liqTop = baseY - fh * frac;
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 14; i++) {
          const px = fx + (((i * 53) % 60) - 30) / 60 * botW * 1.3;
          const py = baseY - 4 - ((this.t * (36 + i * 5) + i * 97) % Math.max(8, fh * frac - 6));
          if (py < liqTop + 2) continue;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(px, py, 1.6 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // Flask glass + neck.
      ctx.strokeStyle = "#e8e6e1"; ctx.lineWidth = Math.max(2, s * 0.008);
      flask(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - topW, topY); ctx.lineTo(fx - topW, topY - neckH);
      ctx.moveTo(fx + topW, topY); ctx.lineTo(fx + topW, topY - neckH);
      ctx.stroke();
      // Flame.
      if (this.heating) {
        const fl = s * 0.05 + Math.sin(this.t * 13) * s * 0.006;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(fx, baseY + 8);
        ctx.quadraticCurveTo(fx - s * 0.03, baseY + 8 + fl, fx, baseY + 14 + fl * 1.6);
        ctx.quadraticCurveTo(fx + s * 0.03, baseY + 8 + fl, fx, baseY + 8);
        ctx.fill();
        ctx.fillStyle = "#fde047";
        ctx.beginPath(); ctx.arc(fx, baseY + 12, s * 0.012, 0, Math.PI * 2); ctx.fill();
      }
      // Vapor above the neck when hot.
      if (this.temp > 80) {
        ctx.fillStyle = "#78716c";
        for (let i = 0; i < 3; i++) {
          const vy = topY - neckH - 10 - ((this.t * 30 + i * 40) % 90);
          ctx.globalAlpha = 0.22;
          ctx.beginPath();
          ctx.ellipse(fx + Math.sin(this.t * 2 + i) * 8, vy, 12, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // Thermometer.
      const tx = W * 0.8, ty0 = H * 0.16, ty1 = H * 0.6, tw = Math.max(10, s * 0.03);
      ctx.fillStyle = "#1a241d"; ctx.strokeStyle = "#e8e6e1"; ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(tx - tw / 2, ty0, tw, ty1 - ty0, tw / 2);
      else ctx.rect(tx - tw / 2, ty0, tw, ty1 - ty0);
      ctx.fill(); ctx.stroke();
      const fillH = (ty1 - ty0 - 8) * (this.temp / 100);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(tx - tw / 2 + 4, ty1 - 4 - fillH, tw - 8, fillH);
      ctx.beginPath(); ctx.arc(tx, ty1 + 6, tw * 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e8e6e1"; ctx.stroke();
      // Labels.
      ctx.fillStyle = ink;
      ctx.font = `${Math.max(12, Math.round(s * 0.032))}px sans-serif`;
      ctx.fillText("Erlenmeyer 500 mL", Math.max(8, fx - botW - 130), baseY - fh - neckH - 8);
      ctx.fillText(`${Math.round(this.temp)} °C`, tx + tw, ty0 + 14);
    },
  };
}
