// Chemistry HUD stylesheet (design C4 "blown glass"): frosted-glass panels on the page colour.
export const CH_CSS = `
.ch-root{position:absolute;inset:0;pointer-events:none;color:#0b2a17;font-family:"Archivo","Segoe UI",system-ui,sans-serif;font-size:13px;line-height:1.35;z-index:5;-webkit-font-smoothing:antialiased}
.ch-root *{box-sizing:border-box}
.ch-root p{margin:0}
.ch-root :where(button){font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;margin:0}
.ch-root :where(button,a,input,textarea,label):focus-visible{outline:3px solid #0b2a17;outline-offset:2px}
.ch-gx{pointer-events:auto;background:rgba(255,255,255,.38);-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);border:1px solid rgba(255,255,255,.62);box-shadow:0 20px 40px -24px rgba(5,45,20,.6),inset 0 1px 0 rgba(255,255,255,.75);border-radius:22px}
.ch-pill{border-radius:999px}
.ch-i{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block;flex:none}
.ch-brand{position:absolute;left:24px;top:16px;height:46px;display:flex;align-items:center;gap:10px;pointer-events:auto}
.ch-logo{width:40px;display:block;flex:none}
.ch-brand b{font-weight:900;font-stretch:70%;font-size:31px;line-height:1;letter-spacing:-.01em;white-space:nowrap}
.ch-tabs{position:absolute;left:50%;top:16px;height:46px;transform:translateX(-50%);padding:5px;display:flex;gap:2px}
.ch-tabs button{height:36px;padding:0 18px;border-radius:999px;font-weight:600;font-size:13.5px;white-space:nowrap;position:relative}
.ch-tabs button:hover{background:rgba(255,255,255,.45)}
.ch-tabs button[aria-selected="true"]{background:#0b2a17;color:#fff}
.ch-tabs .badge{position:absolute;top:-3px;right:-2px;min-width:17px;height:17px;border-radius:9px;background:#ff5a3d;color:#fff;font:700 10px/17px "JetBrains Mono",ui-monospace,monospace;text-align:center;padding:0 4px}
.ch-home{position:absolute;right:24px;top:16px;height:46px;padding:0 18px 0 12px;display:flex;align-items:center;gap:6px;font-weight:700;color:#0b2a17;text-decoration:none;white-space:nowrap}
.ch-home .ch-i{width:16px;height:16px}
.ch-side{position:absolute;right:24px;top:84px;bottom:96px;width:236px;display:flex;flex-direction:column;gap:12px}
.ch-side>[hidden]{display:none!important}
.ch-widgets{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px}
 .ch-card{padding:14px 16px;display:flex;flex-direction:column;gap:7px;min-height:0}
 .ch-widgets>.ch-card[hidden]{display:none}
 .ch-bar .ch-btn.notebook.on{background:#0b2a17;color:#fff}
.ch-cap{font:700 10.5px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(11,42,23,.6)}
.ch-wh{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ch-chip{font-weight:700;font-size:11px;background:#ff5a3d;color:#fff;border-radius:999px;padding:3px 9px;white-space:nowrap}
.ch-chip.cool{background:#3b82f6}
.ch-chip.boil{background:#b91c1c}
.ch-mut{font-weight:600;font-size:12px;color:rgba(11,42,23,.6);white-space:nowrap}
.ch-num{font-family:"Archivo","Arial Narrow",sans-serif;font-stretch:66%;font-weight:900;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:.9;white-space:nowrap}
.ch-num sup{font-size:.34em;font-stretch:100%;font-weight:700;vertical-align:top;margin-left:3px;position:relative;top:.3em;letter-spacing:0}
.ch-big{font-size:68px}
.ch-mid{font-size:44px}
.ch-temp{flex:1}
.ch-spark{width:100%;flex:1;min-height:30px;display:block;overflow:visible}
.ch-phb{height:10px;border-radius:5px;background:linear-gradient(90deg,#e53935,#fb8c00,#fdd835,#43a047,#1e88e5,#5e35b1);position:relative;margin-top:4px}
.ch-phb u{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#fff;border:3px solid #0b2a17;transition:left .4s}
.ch-phl{display:flex;justify-content:space-between;font-size:10.5px;color:rgba(11,42,23,.55)}
.ch-vb{height:10px;border-radius:5px;background:rgba(11,42,23,.12);overflow:hidden;margin-top:4px}
.ch-vb i{display:block;height:100%;width:0;background:#0b2a17;border-radius:5px;transition:width .4s}
.ch-sheet{flex:1;overflow:auto;gap:10px;overscroll-behavior:contain}
.ch-sheet>*{flex-shrink:0}
.ch-sheet h3{margin:0;font-weight:900;font-stretch:70%;font-size:22px;line-height:1}
.ch-row{display:flex;align-items:center;gap:9px;min-height:30px}
.ch-row .nm{flex:1;min-width:0;font-weight:600;font-size:13px}
.ch-row .nm small{display:block;font-weight:500;font-size:11px;color:rgba(11,42,23,.55)}
.ch-sw{position:relative;width:36px;height:22px;flex:none}
.ch-sw input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer}
.ch-sw span{position:absolute;inset:0;border-radius:999px;background:rgba(11,42,23,.2);transition:background .15s;pointer-events:none}
.ch-sw span::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
.ch-sw input:checked+span{background:#0b2a17}
.ch-sw input:checked+span::after{left:17px}
.ch-sw input:focus-visible+span{outline:3px solid #0b2a17;outline-offset:2px}
.ch-ib{width:22px;height:22px;border-radius:50%;border:1.5px solid #0b2a17;font:800 11px/19px "Archivo",sans-serif;text-align:center;flex:none}
.ch-notice{display:none;font-size:12px;line-height:1.45;color:rgba(11,42,23,.8);background:rgba(255,255,255,.55);border-radius:12px;padding:8px 10px}
.ch-notice.open{display:block}
.ch-notice b{color:#0b2a17}
.ch-ctl label{display:flex;justify-content:space-between;align-items:baseline;font-weight:600;font-size:13px;margin-bottom:8px}
.ch-ctl output{font:700 12px "JetBrains Mono",ui-monospace,monospace}
.ch-ctl input{width:100%;margin:0;accent-color:#0b2a17}
.ch-prompts,.ch-list{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:12.5px}
.ch-prompts li{background:rgba(255,255,255,.55);border-radius:12px;padding:8px 10px;font-weight:600}
.ch-root textarea{width:100%;min-height:74px;resize:vertical;border:1px solid rgba(11,42,23,.15);border-radius:12px;background:rgba(255,255,255,.72);padding:9px 10px;font:inherit;color:inherit}
.ch-acts{display:flex;gap:6px}
.ch-btn{height:34px;padding:0 14px;border-radius:999px;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;border:1.5px solid #0b2a17!important;white-space:nowrap}
.ch-btn.ink{background:#0b2a17;color:#fff}
.ch-btn i{width:8px;height:8px;border-radius:50%;background:#ff5a3d}
.ch-list li{display:flex;align-items:flex-start;gap:8px;background:rgba(255,255,255,.55);border-radius:12px;padding:7px 8px 7px 10px}
.ch-list .t{font:600 11px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.55);padding-top:1px}
.ch-list .txt{flex:1;min-width:0;overflow-wrap:break-word}
.ch-list button{font-weight:700;font-size:11.5px;padding:2px 6px;border-radius:8px}
.ch-list button:hover{background:rgba(11,42,23,.08)}
.ch-sheet.ch-book{overflow:hidden}
.ch-book>.ch-feed{flex:1 1 0;min-height:0;overflow:hidden;align-content:start}
.ch-feed li.snap{background:rgba(255,255,255,.8)}
.ch-feed li .txt{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
.ch-feed li.open .txt{display:block}
.ch-feed li.empty{color:rgba(11,42,23,.6);font-weight:600}
.ch-book textarea{flex:0 1 64px;min-height:40px!important;resize:none!important}
.ch-q{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.55);border-radius:12px;padding:7px 6px 7px 10px;font-weight:600;font-size:12.5px;line-height:1.35}
.ch-q span{flex:1;min-width:0}
.ch-q button{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;flex:none}
.ch-q button:hover{background:rgba(11,42,23,.08)}
.ch-q .ch-i{width:14px;height:14px}
.ch-pager{display:flex;align-items:center;justify-content:space-between;gap:6px;font:600 11px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.6)}
.ch-pager[hidden]{display:none}
.ch-pager button{font:700 12px "Archivo",sans-serif;color:#0b2a17;padding:4px 10px;border-radius:999px;border:1.5px solid rgba(11,42,23,.25)!important}
.ch-pager button:disabled{opacity:.35;cursor:default}
.ch-tag{position:absolute;left:-400px;top:-400px;transform:translate(-100%,-50%);display:flex;flex-direction:row-reverse;align-items:center;font-weight:700;font-size:12px;white-space:nowrap;pointer-events:none}
.ch-tag i{width:22px;height:1.5px;background:#0b2a17;position:relative;flex:none}
.ch-tag i::before{content:"";position:absolute;right:-4px;top:-3px;width:7px;height:7px;border-radius:50%;background:#0b2a17}
.ch-tag span{padding:5px 11px}
.ch-bar{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);height:58px;max-width:calc(100% - 40px);padding:8px;display:flex;align-items:center;gap:6px}
.ch-ib2{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.62);flex:none}
.ch-ib2.ink{background:#0b2a17;color:#fff}
.ch-ib2:disabled{opacity:.35;cursor:default}
.ch-sep{width:1px;height:24px;background:rgba(11,42,23,.18);margin:0 6px;flex:none}
.ch-stat{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13.5px;white-space:nowrap;min-width:0;max-width:340px}
.ch-stat .dots{display:flex;flex:none}
.ch-stat .dots b{width:14px;height:14px;border-radius:50%;display:block;box-shadow:inset 0 -2px 3px rgba(0,0,0,.2),0 0 0 2px rgba(255,255,255,.65)}
.ch-stat .dots b+b{margin-left:-4px}
.ch-stat span{overflow:hidden;text-overflow:ellipsis}
.ch-measure{height:42px;border-radius:999px;padding:0 18px 0 14px;display:flex;align-items:center;gap:7px;font-weight:700;font-size:13.5px;white-space:nowrap;background:#0b2a17;color:#fff;flex:none}
.ch-measure i{width:8px;height:8px;border-radius:50%;background:#ff5a3d}
@media (max-width:1100px){.ch-left{width:220px;left:14px;top:78px}}
@media (max-width:900px){
  .ch-tabs{top:70px}
  .ch-side{left:16px;right:16px;top:auto;bottom:88px;width:auto;height:150px}
  .ch-side.sheet{height:min(440px,calc(100% - 222px))}
  .ch-widgets{flex-direction:row}
  .ch-widgets>.ch-card{flex:1;min-width:0}
  .ch-big{font-size:44px}.ch-mid{font-size:34px}
  .ch-bar{bottom:16px}
  .ch-home{right:16px}.ch-brand{left:16px}
}
@media (max-width:640px){
  .ch-left{display:none}
  .ch-brand b{font-size:24px}
  .ch-tabs button{padding:0 12px;font-size:12.5px}
  .ch-home span{display:none}
  .ch-home{padding:0 12px}
  .ch-stat,.ch-bar .ch-sep:last-of-type{display:none}
  .ch-widgets .ch-phl,.ch-widgets .ch-spark,.ch-widgets .of{display:none}
}
@media (prefers-reduced-motion: reduce){.ch-root *{transition:none!important}}

.ch-bur{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}
.ch-bur button{height:30px;padding:0 12px;border-radius:999px;font:700 12px "Archivo",sans-serif;border:1.5px solid #0b2a17}
.ch-bur button:hover{background:rgba(255,255,255,.6)}
.ch-bur button.ink{background:#0b2a17;color:#fff}
.ch-bur small{font:600 11px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.6);flex:1;text-align:right}
.ch-eq{align-items:center;gap:5px;font-weight:800;font-size:11px;background:#16a34a;color:#fff;border-radius:999px;padding:3px 9px}
.ch-left{position:absolute;left:24px;top:84px;bottom:96px;width:268px;padding:14px 16px;display:flex;flex-direction:column;gap:14px;overflow:auto;overscroll-behavior:contain}
.ch-left>*{flex-shrink:0}
.ch-lsec{display:flex;flex-direction:column;gap:7px}
.ch-lsec h3{margin:0;font:700 10.5px/1.3 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(11,42,23,.6);display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.ch-lsec h3 small{font-weight:600;letter-spacing:0;text-transform:none;opacity:.8}
.ch-sub{display:flex;align-items:center;gap:7px;min-height:30px}
.ch-sub .dot{width:11px;height:11px;border-radius:50%;background:var(--c);flex:none;box-shadow:inset 0 -2px 3px rgba(0,0,0,.25)}
.ch-sub .nm{flex:1;min-width:0;font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-sub .ct{font:700 11px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.7);flex:none}
.ch-sub .sq{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;font:700 15px/1 "Archivo",sans-serif;border:1.5px solid rgba(11,42,23,.3);flex:none}
.ch-sub .sq:hover:not(:disabled){background:rgba(255,255,255,.65)}
.ch-sub .sq.plus{background:#0b2a17;color:#fff;border-color:#0b2a17}
.ch-sub .sq:disabled{opacity:.3;cursor:default}
.ch-ins{display:flex;align-items:baseline;gap:8px;min-height:26px;border-bottom:1px solid rgba(11,42,23,.08);padding-bottom:4px}
.ch-ins:last-child{border-bottom:0}
.ch-ins .cap{flex:1;min-width:0;font-weight:600;font-size:11.5px;color:rgba(11,42,23,.78);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-ins .val b{font:700 17px "JetBrains Mono",ui-monospace,monospace;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.ch-ins .val small{font:600 10px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.6);margin-left:3px}
.ch-ins .tag{font:700 9.5px "JetBrains Mono",ui-monospace,monospace;border-radius:999px;padding:2px 7px;white-space:nowrap;background:rgba(11,42,23,.12);color:#0b2a17}
.ch-ins .tag[hidden]{display:none}
.ch-ins .tag.acid{background:#ef4444;color:#fff}
.ch-ins .tag.neutral{background:#22c55e;color:#fff}
.ch-ins .tag.base{background:#7c3aed;color:#fff}
.ch-ins .tag.solid{background:#0ea5e9;color:#fff}
.ch-ins .tag.gas{background:#f97316;color:#fff}
 .ch-ins .tag.hot{background:#b91c1c;color:#fff}
 .ch-instrument{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:7px;min-height:30px}
 .ch-instrument .nm{min-width:0;font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .ch-instrument .readout{font:700 10px "JetBrains Mono",ui-monospace,monospace;color:rgba(11,42,23,.7);white-space:nowrap}
 .ch-check{position:relative;width:36px;height:22px;display:block}
 .ch-check input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer}
 .ch-check span{position:absolute;inset:0;border-radius:999px;background:rgba(11,42,23,.2);transition:background .15s;pointer-events:none}
 .ch-check span::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
 .ch-check input:checked+span{background:#0b2a17}
 .ch-check input:checked+span::after{left:17px}
 .ch-check input:focus-visible+span{outline:3px solid #0b2a17;outline-offset:2px}
 .ch-instrument-control{grid-column:2 / 4;width:100%;margin:-2px 0 2px;accent-color:#0b2a17}
 .ch-instrument-quick{grid-column:2 / 4;display:flex;gap:4px}
 .ch-instrument-quick button{border:1px solid rgba(11,42,23,.25);border-radius:999px;padding:2px 7px;font-size:10px}
 .ch-instrument-quick button.ink{background:#0b2a17;color:#fff}
 .ch-instrument-quick button:disabled{opacity:.3;cursor:default}
 .ch-instrument.off{opacity:.55}
 .ch-law{display:flex;align-items:center;gap:8px;min-height:28px}
 .ch-law .nm{flex:1;min-width:0;font-weight:600;font-size:12px}
 `;
