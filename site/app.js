const CARDS = Array.isArray(window.SV_CARDS) ? window.SV_CARDS : [];
const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let cardIndex = 0;
let editorState = { message: "", signature: "" };
let compositionStartedAt = null;

const escapeHtml = (value="") => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const currentCard = () => CARDS[cardIndex];

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
  else renderChooser();
}

function shell(eyebrow, right=""){
  return `<div class="topbar"><div class="eyebrow">${eyebrow}</div>${right}</div>`;
}

function renderChooser(){
  app.innerHTML = `
    ${shell("Choisis une carte")}
    <section class="stage">
      <div class="carousel-shell">
        <div class="carousel" id="carousel" aria-label="Illustrations à choisir">
          ${CARDS.map((c,i)=>`<button class="card-thumb ${i===cardIndex?'active':''}" data-index="${i}" aria-label="Choisir ${escapeHtml(c.label)}"><img src="${c.src}" alt=""></button>`).join("")}
        </div>
        <div class="hint">Fais glisser · touche la carte pour écrire</div>
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

  function centerCard(index, behavior="smooth"){
    const el = cards[index];
    if(!el) return;
    // scrollIntoView + scroll-snap donne un centrage fiable sur iOS/Safari/desktop.
    el.scrollIntoView({ behavior, block:"nearest", inline:"center" });
  }

  function nearestIndex(){
    const center = carousel.scrollLeft + carousel.clientWidth/2;
    let best = 0, dist = Infinity;
    cards.forEach((el,i)=>{
      const cardCenter = el.offsetLeft + el.clientWidth/2;
      const d = Math.abs(cardCenter-center);
      if(d<dist){dist=d;best=i;}
    });
    return best;
  }

  function setActive(index){
    cardIndex = index;
    cards.forEach((el,i)=>el.classList.toggle("active",i===index));
  }

  carousel.addEventListener("scroll",()=>{
    setActive(nearestIndex());
    clearTimeout(scrollTimer);
    // On laisse le snap natif finir le geste : aucune correction agressive pendant le swipe.
    scrollTimer = setTimeout(()=>setActive(nearestIndex()),140);
  },{passive:true});
  if("onscrollend" in window){
    carousel.addEventListener("scrollend",()=>setActive(nearestIndex()),{passive:true});
  }

  // Sur tactile, mémorise le déplacement pour qu’un swipe ne déclenche pas l’ouverture.
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
    const i = Number(btn.dataset.index);
    if(dragged){ dragged=false; return; }
    if(i !== cardIndex){ setActive(i); centerCard(i); }
    else renderEditor();
  }));

  // Souris/trackpad sur ordinateur : on peut attraper la rangée comme une bande de cartes.
  carousel.addEventListener("pointerdown",e=>{
    if(e.pointerType === "touch") return;
    pointerDown=true; dragged=false; startX=e.clientX; startScroll=carousel.scrollLeft;
    carousel.classList.add("dragging");
    carousel.setPointerCapture?.(e.pointerId);
  });
  carousel.addEventListener("pointermove",e=>{
    if(!pointerDown) return;
    const dx=e.clientX-startX;
    if(Math.abs(dx)>5) dragged=true;
    carousel.scrollLeft=startScroll-dx;
  });
  function stopDrag(e){
    if(!pointerDown) return;
    pointerDown=false; carousel.classList.remove("dragging");
    try{ carousel.releasePointerCapture?.(e.pointerId); }catch(_){ }
    setActive(nearestIndex()); centerCard(cardIndex);
  }
  carousel.addEventListener("pointerup",stopDrag);
  carousel.addEventListener("pointercancel",stopDrag);

  // Une roulette verticale sur la galerie devient un défilement horizontal discret.
  carousel.addEventListener("wheel",e=>{
    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
      e.preventDefault();
      carousel.scrollLeft += e.deltaY;
    }
  },{passive:false});

  requestAnimationFrame(()=>requestAnimationFrame(()=>centerCard(cardIndex,"auto")));
  window.onresize=()=>centerCard(cardIndex,"auto");
}

function renderEditor(){
  const card=currentCard();
  compositionStartedAt = null;
  app.innerHTML = `
    ${shell("Écris ton billet", '<button class="text-button" id="back">← Changer de carte</button>')}
    <section class="stage">
      <div class="flip-wrap">
        <div class="flip-card" id="flipCard">
          <div class="face front"><img src="${card.src}" alt=""></div>
          <div class="face back">
            <textarea id="message" class="message" rows="4" maxlength="170" placeholder="Écris ton message ici…" aria-label="Message, quatre lignes maximum">${escapeHtml(editorState.message)}</textarea>
            <input id="signature" class="signature" maxlength="30" placeholder="Signature" value="${escapeHtml(editorState.signature)}" aria-label="Signature">
            <div class="line-count" id="lineCount">0 / 4 lignes</div>
          </div>
        </div>
      </div>
    </section>
    <div class="footer"><button class="gold-button" id="send">Envoyer</button></div>`;

  const flipCard=document.querySelector("#flipCard");
  const msg=document.querySelector("#message");
  const sig=document.querySelector("#signature");
  const count=document.querySelector("#lineCount");
  requestAnimationFrame(()=>requestAnimationFrame(()=>flipCard.classList.add("is-flipped")));
  setTimeout(()=>msg.focus({preventScroll:true}),760);

  function beginComposition(){ if(!compositionStartedAt) compositionStartedAt=Date.now(); }
  function visualLines(el){
    if(!el.value) return 0;
    const cs=getComputedStyle(el), mirror=document.createElement("div");
    Object.assign(mirror.style,{position:"absolute",visibility:"hidden",pointerEvents:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",overflowWrap:"break-word",width:el.clientWidth+"px",font:cs.font,letterSpacing:cs.letterSpacing,lineHeight:cs.lineHeight});
    mirror.textContent=el.value||" "; document.body.appendChild(mirror);
    const lines=Math.max(1,Math.round(mirror.scrollHeight/parseFloat(cs.lineHeight))); mirror.remove(); return lines;
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
      card_id:currentCard().id,
      message,
      signature,
      reuse_artistic:true,
      reuse_consent_version:"artist-use-notice-upstream-2026-09",
      composition_seconds:compositionSeconds,
      visual_line_count:Math.max(1, Math.min(4, Number(visualLineCount)||1)),
      app_version:"sv-1.3"
    })});
    const raw=await res.text();
    let data;
    try{ data=JSON.parse(raw); }catch(_){ throw new Error(raw || `HTTP ${res.status}`); }
    if(!res.ok || !data.ok) throw new Error(data.error||"Création impossible");
    renderResult(data.slug);
  }catch(err){
    console.error("createBillet failed:",err);
    showToast("Impossible de créer le billet");
    button.disabled=false; button.textContent="Envoyer";
  }
}

function renderResult(slug){
  const url=`${location.origin}/${slug}`;
  app.innerHTML=`
    ${shell("Ton billet est prêt")}
    <section class="stage"><div class="result">
      <h1>Il ne reste qu’à le faire voyager.</h1>
      <p>Partage simplement ce lien à la personne de ton choix.</p>
      <div class="linkbox"><input id="shareUrl" readonly value="${escapeHtml(url)}"><button id="copy">Copier</button></div>
      <button class="gold-button" id="share">Partager</button>
    </div></section>
    <div class="footer"><button class="text-button" id="another">Créer un autre billet</button></div>`;
  document.querySelector("#copy").onclick=async()=>{ await navigator.clipboard.writeText(url); trackEvent(slug,"share"); showToast("Lien copié"); };
  document.querySelector("#share").onclick=async()=>{
    if(navigator.share){
      try{ await navigator.share({title:"Un billet pour toi",url}); trackEvent(slug,"share"); }catch(e){}
    } else {
      await navigator.clipboard.writeText(url); trackEvent(slug,"share"); showToast("Lien copié");
    }
  };
  document.querySelector("#another").onclick=()=>{ editorState={message:"",signature:""}; history.pushState({},"","/"); route(); };
}

async function renderRecipient(slug){
  app.innerHTML=`${shell("Un billet pour toi")}<section class="stage"><div class="error">Ouverture du billet…</div></section><div class="footer"></div>`;
  try{
    const res=await fetch(`/api/billet?slug=${encodeURIComponent(slug)}`);
    const data=await res.json();
    if(!res.ok || !data.ok) throw new Error("Billet introuvable");
    const card=CARDS.find(c=>c.id===data.card_id) || CARDS[0];
    app.innerHTML=`
      ${shell("Un billet pour toi")}
      <section class="stage">
        <div class="flip-wrap recipient" id="recipientCard">
          <div class="flip-card" id="flipCard">
            <div class="face front"><img src="${card.src}" alt=""></div>
            <div class="face back">
              <div class="message" style="height:auto;overflow:visible;white-space:pre-wrap;pointer-events:none">${escapeHtml(data.message)}</div>
              <div class="signature" style="pointer-events:none">${escapeHtml(data.signature)}</div>
            </div>
          </div>
        </div>
        <div class="recipient-note" id="recipientNote">Clique sur la carte</div>
      </section>
      <div class="footer"></div>`;
    let open=false, revealTracked=false;
    document.querySelector("#recipientCard").onclick=()=>{
      open=!open; document.querySelector("#flipCard").classList.toggle("is-flipped",open);
      document.querySelector("#recipientNote").textContent=open?"":"Clique sur la carte";
      if(open && !revealTracked){ revealTracked=true; trackEvent(slug,"reveal"); }
    };
    trackEvent(slug,"view");
  }catch(err){
    app.innerHTML=`${shell("Un billet pour toi")}<section class="stage"><div class="error">Ce billet est introuvable ou n’est plus disponible.</div></section><div class="footer"></div>`;
  }
}

function trackEvent(slug,type){
  fetch("/api/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,type})}).catch(()=>{});
}

window.addEventListener("popstate",route);
route();
