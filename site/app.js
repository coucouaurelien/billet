const CARDS = Array.isArray(window.SV_CARDS) ? window.SV_CARDS : [];
const CONFIG = window.SV_CONFIG || {};
const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let cardIndex = 0;
let editorState = { message: "", signature: "" };
let compositionStartedAt = null;
let creationRequestId = null;

const escapeHtml = (value="") => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const currentCard = () => CARDS[cardIndex];

const cardById = (id) => CARDS.find(card => card.id === id) || CARDS[0];

function loadingMarkup(){
  return `
    ${brandHeader()}
    <section class="recipient-stage loading-stage">
      <div class="loading-shell" aria-live="polite">
        <div class="loading-copy">Ouverture du billet…</div>
      </div>
    </section>
    <div class="footer"></div>`;
}

function renderRecipientFinal(cardId=""){
  const card = cardById(cardId);
  app.innerHTML = `
    ${brandHeader()}
    <section class="recipient-experience is-final">
      <a class="recipient-create recipient-create-final visible" href="/?card=${encodeURIComponent(card?.id || "")}" aria-hidden="false">
        <span>Moi aussi,</span>
        <span>écrire mon billet.</span>
      </a>
    </section>
    <div class="footer"></div>`;
}

async function consumeBillet(slug, cardId=""){
  try{
    localStorage.setItem(`sv:consumed:${slug}`, cardId || "1");
  }catch(_){ }
  const payload = JSON.stringify({slug});
  for(let attempt=0; attempt<2; attempt++){
    try{
      const res = await fetch("/api/consume", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:payload,
        cache:"no-store",
        keepalive:true
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok && data.ok) return true;
    }catch(_){ }
    await new Promise(r=>setTimeout(r,180));
  }
  return false;
}

function renderRecipientView(data, slug){
  const card = cardById(data.card_id);
  app.innerHTML=`
    ${brandHeader()}
    <section class="recipient-experience" id="recipientStage">
      <button class="recipient-billet" id="recipientBillet" type="button" aria-label="Retourner le billet">
        <div class="recipient-billet-inner" id="recipientBilletInner">
          <div class="recipient-side recipient-art-side">
            <img src="${card.src}" alt="" class="recipient-art">
          </div>
          <div class="recipient-side recipient-word-side">
            <div class="recipient-word" id="recipientWord">
              <div class="recipient-message">${escapeHtml(data.message)}</div>
              <div class="recipient-signature">${escapeHtml(data.signature)}</div>
            </div>
          </div>
        </div>
      </button>

      <div class="recipient-instruction" id="recipientInstruction">Clic pour retourner le billet.</div>

      <a class="recipient-create recipient-create-final" id="recipientCreate" href="/?card=${encodeURIComponent(card.id)}" aria-hidden="true">
        <span>Moi aussi,</span>
        <span>écrire mon billet.</span>
      </a>
    </section>
    <div class="footer"></div>`;

  const stage = document.querySelector("#recipientStage");
  const billet = document.querySelector("#recipientBillet");
  const inner = document.querySelector("#recipientBilletInner");
  const word = document.querySelector("#recipientWord");
  const instruction = document.querySelector("#recipientInstruction");
  const recipientCreate = document.querySelector("#recipientCreate");
  let step = 1;
  let locked = false;

  const showMessage = ()=>{
    if(locked || step !== 1) return;
    locked = true;
    step = 2;
    instruction.classList.add("is-hidden");
    inner.classList.add("is-flipped");
    billet.setAttribute("aria-label","Faire disparaître le message");
    window.setTimeout(()=>{ locked = false; }, 900);
  };

  const dissolveMessage = ()=>{
    if(locked || step !== 2) return;
    locked = true;
    step = 3;
    word.classList.add("is-dissolving");
    stage.classList.add("is-final");
    const consumed = consumeBillet(slug, card.id);
    window.setTimeout(async()=>{
      await consumed;
      billet.classList.add("is-gone");
      recipientCreate.classList.add("visible");
      recipientCreate.setAttribute("aria-hidden","false");
      recipientCreate.focus({preventScroll:true});
      locked = false;
    }, 760);
  };

  billet.addEventListener("click", event=>{
    if(step === 1) showMessage();
    else if(step === 2 && event.target.closest("#recipientWord")) dissolveMessage();
  });
}

const fontReady = (() => {
  try {
    if (document.fonts?.load) {
      return Promise.all([
        document.fonts.load('32px "Coucouaurelien"'),
        document.fonts.ready
      ]).catch(() => undefined);
    }
  } catch (_) {}
  return Promise.resolve();
})();

async function ensureCoucouFont(){
  await fontReady;
}

function showToast(text){
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>toast.classList.remove("show"), 1700);
}

function route(){
  if(!CARDS.length){
    app.innerHTML = `<section class="stage"><div class="error">Aucune illustration n’est disponible.</div></section>`;
    return;
  }
  const slug = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ""));
  if(slug) renderRecipient(slug);
  else {
    const requestedCard = new URLSearchParams(location.search).get("card");
    const requestedIndex = requestedCard ? CARDS.findIndex(card => card.id === requestedCard) : -1;
    if(requestedIndex >= 0) cardIndex = requestedIndex;
    renderChooser();
  }
}

function brandHeader(actionHtml=""){
  return `<header class="brand-header">
    ${actionHtml ? `<div class="brand-action">${actionHtml}</div>` : ""}
    <div class="brand-title">Les billets Éphémères</div>
  </header>`;
}

function shell(eyebrow="", right=""){
  return `${brandHeader(right)}${eyebrow ? `<div class="screen-kicker">${eyebrow}</div>` : ""}`;
}

function renderChooser(){
  const loopCards = [...CARDS, ...CARDS, ...CARDS];
  const n = CARDS.length;
  app.innerHTML = `
    ${brandHeader()}
    <section class="chooser-stage">
      <div class="carousel-shell">
        <div class="carousel" id="carousel" aria-label="Illustrations à choisir">
          ${loopCards.map((c,virtual)=>{
            const logical = virtual % n;
            return `<button class="card-thumb ${logical===cardIndex && virtual>=n && virtual<2*n?'active':''}" data-index="${logical}" data-virtual="${virtual}" aria-label="Choisir ${escapeHtml(c.label)}"><img src="${c.src}" alt=""></button>`;
          }).join("")}
        </div>
        <div class="hint">Touche le billet pour écrire.</div>
      </div>
    </section>
    <div class="footer"></div>`;

  const carousel = document.querySelector("#carousel");
  const cards = [...document.querySelectorAll(".card-thumb")];
  let scrollTimer = null;
  let pointerDown = false;
  let dragged = false;
  let startX = 0;
  let startScroll = 0;
  let relooping = false;
  let pointerCaptured = false;
  let suppressClickUntil = 0;

  function cardCenterScrollLeft(el){
    return el.offsetLeft + el.clientWidth/2 - carousel.clientWidth/2;
  }
  function centerVirtual(virtual, behavior="smooth"){
    const el = cards[virtual];
    if(!el) return;
    carousel.scrollTo({left:cardCenterScrollLeft(el), behavior});
  }
  function nearestVirtual(){
    const center = carousel.scrollLeft + carousel.clientWidth/2;
    let best = 0, dist = Infinity;
    cards.forEach((el,i)=>{
      const d = Math.abs((el.offsetLeft + el.clientWidth/2)-center);
      if(d<dist){ dist=d; best=i; }
    });
    return best;
  }
  function setActiveFromVirtual(virtual){
    const logical = ((virtual % n) + n) % n;
    cardIndex = logical;
    cards.forEach((el,i)=>el.classList.toggle("active", i===virtual));
  }
  function normalizeLoop(){
    if(relooping) return;
    const v = nearestVirtual();
    setActiveFromVirtual(v);
    let target = v;
    if(v < n) target = v + n;
    else if(v >= 2*n) target = v - n;
    if(target !== v){
      relooping = true;
      requestAnimationFrame(()=>{
        centerVirtual(target,"auto");
        setActiveFromVirtual(target);
        requestAnimationFrame(()=>{ relooping=false; });
      });
    }
  }

  carousel.addEventListener("scroll",()=>{
    if(relooping) return;
    setActiveFromVirtual(nearestVirtual());
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(normalizeLoop, 150);
  },{passive:true});
  if("onscrollend" in window){ carousel.addEventListener("scrollend",normalizeLoop,{passive:true}); }

  let touchStartX = 0;
  carousel.addEventListener("touchstart",e=>{
    touchStartX = e.touches[0]?.clientX || 0;
    dragged = false;
  },{passive:true});
  carousel.addEventListener("touchmove",e=>{
    const x = e.touches[0]?.clientX || touchStartX;
    if(Math.abs(x-touchStartX) > 8) dragged = true;
  },{passive:true});

  cards.forEach(btn=>btn.addEventListener("click",()=>{
    if(Date.now() < suppressClickUntil) return;
    const logical = Number(btn.dataset.index);
    const virtual = Number(btn.dataset.virtual);
    if(dragged){ dragged=false; return; }
    const centered = nearestVirtual();
    if(virtual !== centered){
      setActiveFromVirtual(virtual);
      centerVirtual(virtual);
      return;
    }
    cardIndex = logical;
    renderEditor();
  }));

  carousel.addEventListener("pointerdown",e=>{
    if(e.pointerType === "touch") return;
    pointerDown=true; dragged=false; pointerCaptured=false;
    startX=e.clientX; startScroll=carousel.scrollLeft;
    cancelSwipeDemo();
  });
  carousel.addEventListener("pointermove",e=>{
    if(!pointerDown) return;
    const dx=e.clientX-startX;
    if(Math.abs(dx)>5){
      if(!dragged){
        dragged=true;
        carousel.classList.add("dragging");
        try{ carousel.setPointerCapture?.(e.pointerId); pointerCaptured=true; }catch(_){ }
      }
      carousel.scrollLeft=startScroll-dx;
    }
  });
  function stopDrag(e){
    if(!pointerDown) return;
    pointerDown=false;
    if(dragged){
      suppressClickUntil = Date.now()+280;
      carousel.classList.remove("dragging");
      if(pointerCaptured){ try{ carousel.releasePointerCapture?.(e.pointerId); }catch(_){ } }
      const v=nearestVirtual();
      setActiveFromVirtual(v);
      centerVirtual(v);
      setTimeout(normalizeLoop,180);
    }
    pointerCaptured=false;
  }
  carousel.addEventListener("pointerup",stopDrag);
  carousel.addEventListener("pointercancel",stopDrag);

  carousel.addEventListener("wheel",e=>{
    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
      e.preventDefault();
      carousel.scrollLeft += e.deltaY;
      cancelSwipeDemo();
    }
  },{passive:false});

  const initialVirtual = n + cardIndex;
  let demoTimers = [];
  let demoCancelled = false;
  function cancelSwipeDemo(){
    if(demoCancelled) return;
    demoCancelled = true;
    demoTimers.forEach(clearTimeout);
    demoTimers = [];
    carousel.classList.remove("demoing");
  }
  ["touchstart","wheel"].forEach(type=>carousel.addEventListener(type,cancelSwipeDemo,{passive:true,once:true}));

  function maybePlaySwipeDemo(){
    if(n < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    carousel.classList.add("demoing");
    const base = n + cardIndex;
    demoTimers.push(setTimeout(()=>{
      if(demoCancelled) return;
      setActiveFromVirtual(base + 1);
      centerVirtual(base + 1, "smooth");
    }, 1050));
    demoTimers.push(setTimeout(()=>{
      if(!demoCancelled){
        carousel.classList.remove("demoing");
      }
    }, 3200));
  }

  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    centerVirtual(initialVirtual,"auto");
    setActiveFromVirtual(initialVirtual);
    maybePlaySwipeDemo();
  }));
  window.onresize=()=>{
    if(!document.querySelector("#carousel")) return;
    centerVirtual(n+cardIndex,"auto");
  };
}

function renderEditor(){
  const card=currentCard();
  compositionStartedAt = null;
  app.innerHTML = `
    ${brandHeader('<button class="text-button" id="back">← Changer de carte</button>')}
    <section class="stage editor-stage">
      <div class="flip-wrap">
        <div class="flip-card" id="flipCard">
          <div class="face front"><img src="${card.src}" alt=""></div>
          <div class="face back">
            <textarea id="message" class="message" rows="4" maxlength="170" placeholder="Écris ton message ici…" aria-label="Message, quatre lignes maximum">${escapeHtml(editorState.message)}</textarea>
            <input id="signature" class="signature" maxlength="30" placeholder="Signature" value="${escapeHtml(editorState.signature)}" aria-label="Signature">
            <div class="line-count" id="lineCount"></div>
          </div>
        </div>
      </div>
    </section>
    <div class="footer"><button class="gold-button" id="send">Envoyer</button></div>`;

  const flipCard=document.querySelector("#flipCard");
  const msg=document.querySelector("#message");
  const sig=document.querySelector("#signature");
  const count=document.querySelector("#lineCount");
  (async()=>{
    await ensureCoucouFont();
    requestAnimationFrame(()=>requestAnimationFrame(()=>flipCard.classList.add("is-flipped")));
    setTimeout(()=>msg.focus({preventScroll:true}),760);
  })();

  function beginComposition(){ if(!compositionStartedAt) compositionStartedAt=Date.now(); }
  function visualLines(el){
    if(!el.value) return 0;
    const cs=getComputedStyle(el), mirror=document.createElement("div");
    Object.assign(mirror.style,{
      position:"absolute",visibility:"hidden",pointerEvents:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",overflowWrap:"break-word",
      boxSizing:"border-box",width:cs.width,fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,fontStyle:cs.fontStyle,
      letterSpacing:cs.letterSpacing,lineHeight:cs.lineHeight,paddingLeft:cs.paddingLeft,paddingRight:cs.paddingRight,paddingTop:cs.paddingTop,paddingBottom:cs.paddingBottom,border:"0"
    });
    mirror.textContent=el.value||" "; document.body.appendChild(mirror);
    const contentHeight = mirror.scrollHeight - parseFloat(cs.paddingTop||0) - parseFloat(cs.paddingBottom||0);
    const lines=Math.max(1,Math.round(contentHeight/parseFloat(cs.lineHeight))); mirror.remove(); return lines;
  }
  let previous=msg.value;
  function updateCount(){
    const n=visualLines(msg);
    count.textContent=n>=4 ? "4 lignes maximum" : "";
    count.classList.toggle("visible",n>=4);
  }
  msg.addEventListener("beforeinput",()=>{ previous=msg.value; beginComposition(); });
  msg.addEventListener("input",()=>{ if(visualLines(msg)>4) msg.value=previous; editorState.message=msg.value; updateCount(); });
  sig.addEventListener("input",()=>{ beginComposition(); editorState.signature=sig.value; });
  updateCount();

  document.querySelector("#back").onclick=()=>{ editorState.message=msg.value; editorState.signature=sig.value; renderChooser(); };
  document.querySelector("#send").onclick=()=>createBillet(msg.value,sig.value,visualLines(msg));
}

async function createBillet(message, signature, visualLineCount){
  message=message.trim(); signature=signature.trim();
  if(!message){ showToast("Écris quelques mots d’abord"); return; }
  if(!signature){ showToast("Ajoute ta signature"); return; }
  const button=document.querySelector("#send");
  button.disabled=true; button.textContent="Création…";
  const compositionSeconds = compositionStartedAt ? Math.min(3600, Math.max(0, Math.round((Date.now()-compositionStartedAt)/1000))) : 0;
  try{
    const res=await fetch("/api/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      request_id: creationRequestId || (creationRequestId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)),
      card_id:currentCard().id,
      message,
      signature,
      reuse_artistic:true,
      reuse_consent_version:"artist-use-notice-upstream-2026-09",
      composition_seconds:compositionSeconds,
      visual_line_count:Math.max(1, Math.min(4, Number(visualLineCount)||1)),
      app_version:"sv-1.23"
    })});
    const raw=await res.text();
    let data;
    try{ data=JSON.parse(raw); }catch(_){
      console.error("create endpoint returned non JSON", raw.slice(0,300));
      throw new Error("Le serveur a mis trop de temps. Réessaie une fois.");
    }
    if(!res.ok || !data.ok) throw new Error(data.error||"Création impossible");
    creationRequestId = null;
    renderResult(data.slug);
  }catch(err){
    console.error("createBillet failed:",err);
    showToast(err?.message || "Impossible de créer le billet");
    button.disabled=false; button.textContent="Envoyer";
  }
}

function renderResult(slug){
  const url=`${location.origin}/${slug}`;
  const physicalUrl = CONFIG.physicalMailUrl || "https://coucouaurelien.com";
  app.innerHTML=`
    ${brandHeader()}
    <section class="stage"><div class="result">
      <h1>Il ne reste plus qu’à le faire voyager.</h1>
      <div class="result-actions">
        <button class="gold-button result-button" id="share">Envoyer par message</button>
        <div class="physical-wrap">
          <a class="gold-button result-button result-link-button" id="physical" href="${escapeHtml(physicalUrl)}" target="_blank" rel="noopener">Envoyer dans un véritable courrier</a>
          <div class="physical-sub">Écrit à la main, au dos d’une risographie, et posté directement à ton crush</div>
        </div>
      </div>
    </div></section>
    <div class="footer"><button class="text-button" id="another">Créer un autre billet</button></div>`;
  document.querySelector("#share").onclick=async()=>{
    if(navigator.share){
      try{ await navigator.share({title:"Les billets Éphémères",url}); }catch(e){}
    } else {
      await navigator.clipboard.writeText(url); showToast("Lien prêt à être collé dans ton message");
    }
  };
  document.querySelector("#another").onclick=()=>{ editorState={message:"",signature:""}; creationRequestId=null; history.pushState({},"","/"); route(); };
}

async function renderRecipient(slug){
  try{
    if(window.SV_BILLET_GONE){
      const gone = window.SV_BILLET_GONE;
      window.SV_BILLET_GONE = null;
      renderRecipientFinal(gone.card_id || "");
      return;
    }
    try{
      const localConsumed = localStorage.getItem(`sv:consumed:${slug}`);
      if(localConsumed){
        renderRecipientFinal(localConsumed === "1" ? "" : localConsumed);
        return;
      }
    }catch(_){ }
  }catch(_){ }

  app.innerHTML = loadingMarkup();
  let data = window.SV_PRELOADED_BILLET || null;
  window.SV_PRELOADED_BILLET = null;

  if(!data){
    try{
      const res = await fetch(`/api/billet?slug=${encodeURIComponent(slug)}`, { cache:"no-store" });
      const payload = await res.json();
      if(res.status === 410 || payload?.gone){
        renderRecipientFinal(payload?.card_id || "");
        return;
      }
      if(!res.ok || !payload.ok) throw new Error("Billet introuvable");
      data = payload;
    }catch(err){
      console.error("Billet read failed", err);
      app.innerHTML=`${brandHeader()}<section class="recipient-stage"><div class="error">Ce billet est introuvable ou n’est plus disponible.</div><a class="recipient-create visible" href="/"><span>Moi aussi,</span><span>écrire mon billet.</span></a></section><div class="footer"></div>`;
      return;
    }
  }

  try{
    renderRecipientView(data, slug);
  }catch(err){
    console.error("Billet display failed", err, data);
    app.innerHTML=`${brandHeader()}<section class="recipient-stage"><div class="error">Le billet existe, mais son affichage a rencontré un problème.</div><a class="recipient-create visible" href="/"><span>Moi aussi,</span><span>écrire mon billet.</span></a></section><div class="footer"></div>`;
  }
}


window.addEventListener("popstate",route);
route();
