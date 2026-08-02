(function(){
  "use strict";

  var reduced     = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var raf = 0, timers = [], observers = [], listeners = [];
  function on(t,type,fn,opts){ t.addEventListener(type,fn,opts); listeners.push([t,type,fn,opts]); }

  /* ------------------------------------------------------------ split text */
  document.querySelectorAll(".split").forEach(function(el){
    var src = Array.prototype.slice.call(el.childNodes);
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g," ").trim());
    el.textContent = "";
    var frag = document.createDocumentFragment(), i = 0;
    src.forEach(function(node){
      var cls = node.nodeType === 1 ? (node.getAttribute("class")||"") : "";
      node.textContent.split(/(\s+)/).forEach(function(tok){
        if (!tok) return;
        if (!tok.trim()){ frag.appendChild(document.createTextNode(" ")); return; }
        var shell = document.createElement("span");
        shell.className = "w" + (cls ? " " + cls : "");
        shell.style.setProperty("--i", i++);
        var inner = document.createElement("i");
        inner.textContent = tok;
        shell.appendChild(inner);
        frag.appendChild(shell);
      });
    });
    var hidden = document.createElement("span");
    hidden.setAttribute("aria-hidden","true");
    hidden.appendChild(frag);
    el.appendChild(hidden);
  });

  /* ------------------------------------------------------------- the rotator
     The phrases live in one grid cell so nothing reflows. The whole block is
     aria-hidden with a static sentence beside it — a live region here would
     re-announce every three seconds, which is unusable with a screen reader. */
  (function(){
    var rot = document.querySelector(".rot");
    if (!rot || reduced) return;
    var words = Array.prototype.slice.call(rot.querySelectorAll(".rw"));
    if (words.length < 2) return;
    var idx = 0;

    // A phrase that has left upward keeps .out until its next turn. Clearing
    // .out with the transition live would animate it back DOWN through the
    // visible line — so the reset to the below-the-line start is done with
    // transitions suppressed, then re-enabled for the rise.
    function bringIn(el){
      var i = el.querySelector("i");
      i.style.transition = "none";
      el.classList.remove("out");
      void i.offsetWidth;                          // force the reset to land
      i.style.transition = "";
      el.classList.add("on");
    }

    var id = setInterval(function(){
      if (document.hidden) return;                 // don't cycle in a background tab
      var cur = words[idx];
      idx = (idx + 1) % words.length;
      cur.classList.remove("on");
      cur.classList.add("out");
      bringIn(words[idx]);
    }, 2600);
    timers.push(id);
  })();

  /* -------------------------------------------------------- scroll reveals */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { rootMargin:"0px 0px -10% 0px", threshold:0.12 });
  observers.push(io);

  document.querySelectorAll(".split, .rise, .reveal-group").forEach(function(el){
    if (el.classList.contains("rise")){
      var sibs = Array.prototype.slice.call(el.parentNode.children)
        .filter(function(n){ return n.classList && n.classList.contains("rise"); });
      el.style.setProperty("--i", Math.max(0, sibs.indexOf(el)));
    }
    io.observe(el);
  });
  // stagger clipped children off their index; the GROUP is what gets observed,
  // because a clip-path'd element reports zero intersection and never fires.
  document.querySelectorAll(".reveal-group").forEach(function(g){
    Array.prototype.slice.call(g.querySelectorAll(".reveal")).forEach(function(el,n){
      el.style.setProperty("--i", n);
    });
  });

  /* ------------------------------------------------------------- the menu
     Mobile only, by CSS — the button is display:none above 720px, so none of
     this can fire on desktop. The panel is a block under the bar rather than a
     full-screen overlay, so there is no scroll to lock and nothing to trap. */
  (function(){
    var btn  = document.querySelector(".burger");
    var menu = document.getElementById("menu");
    if (!btn || !menu) return;

    function set(open){
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      menu.classList.toggle("open", open);
    }
    on(btn, "click", function(){
      set(btn.getAttribute("aria-expanded") !== "true");
    });
    on(document, "keydown", function(e){
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true"){
        set(false); btn.focus();
      }
    });
    // a tap outside the bar closes it; tapping a link navigates and the new
    // page loads closed, so links need no handler of their own
    on(document, "click", function(e){
      if (btn.getAttribute("aria-expanded") !== "true") return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      set(false);
    });
    // resizing up to desktop leaves the panel open-but-hidden; reset the state
    // so the button is not lying about it when the viewport comes back down
    on(window, "resize", function(){
      if (window.innerWidth > 720) set(false);
    });
  })();

  /* --------------------------------------------------------- testimonials
     One at a time, 8s each, arrows either way plus swipe. Auto-advance is
     content that moves on its own for longer than 5s, so it MUST be stoppable
     (WCAG 2.2.2):
     it pauses on hover, pauses while anything inside has keyboard focus, stops
     in a background tab, and never starts at all under reduced motion. */
  (function(){
    var box = document.querySelector(".qbox");
    if (!box) return;
    var slides = Array.prototype.slice.call(box.querySelectorAll(".q"));
    var count  = box.querySelector(".qcount b");
    if (slides.length < 2) return;

    var stage = box.querySelector(".qstage");
    var i = 0, dragging = false, tick = 0;
    var DWELL = 8000;

    // Must match .q.prev / .q.next in site.css. A side card scales about its
    // CENTRE, so a card of layout height H paints from 0.06H to 0.94H — its
    // bottom edge sits at 0.94H, not 0.88H. Sizing the stage to 0.88 clipped
    // every neighbour taller than the active card.
    var SIDE_SCALE = 0.88;
    var SIDE_SPAN  = 1 - (1 - SIDE_SCALE) / 2;   // 0.94

    // The stage follows the deck that is actually showing — the active card, or
    // a taller neighbour peeking past it. offsetHeight is the UNtransformed
    // height; getBoundingClientRect would already have the scale baked in and
    // would feed itself a shrinking number every pass.
    function fit(){
      var h = slides[i].offsetHeight;
      // Below 721 the neighbours are shoved 84% aside and blurred to nothing —
      // letting a tall one set the height there parked the arrows 600px under a
      // short card. Only count them where they actually peek.
      if (matchMedia("(min-width: 721px)").matches){
        [prevOf(i), nextOf(i)].forEach(function(n){
          if (n !== i) h = Math.max(h, slides[n].offsetHeight * SIDE_SPAN);
        });
      }
      if (h) stage.style.height = h + "px";
    }

    function prevOf(n){ return (n - 1 + slides.length) % slides.length; }
    function nextOf(n){ return (n + 1) % slides.length; }

    function show(next){
      i = (next + slides.length) % slides.length;
      var p = prevOf(i), nx = nextOf(i);
      slides.forEach(function(s, n){
        var on = n === i;
        // with only two cards, prev and next are the same one — let next win so
        // it does not get both transforms and land at translateX(0)
        var isNext = !on && n === nx;
        var isPrev = !on && !isNext && n === p;
        s.classList.toggle("on", on);
        s.classList.toggle("next", isNext);
        s.classList.toggle("prev", isPrev);
        s.classList.toggle("side", isPrev || isNext);
        // the ones behind are decoration; a screen reader reads the active card
        if (on) s.removeAttribute("aria-hidden");
        else s.setAttribute("aria-hidden", "true");
      });
      if (count) count.textContent = ("0" + (i + 1)).slice(-2);
      fit();
    }

    /* The timer runs continuously and SKIPS ticks while paused, rather than
       being stopped and restarted by pointer events.

       This is not a style preference. show() mutates the DOM under the pointer,
       and the browser answers with a storm of synthetic pointerleave/enter on
       the box — the trailing "enter" landed after go() had already restarted
       the timer, set held = true and killed it. Auto-advance then never came
       back until you moved the mouse right out of the section. Deriving the
       state on each tick cannot be fooled by that, because there is nothing to
       get out of sync. */
    var canHover = matchMedia("(hover: hover)").matches;
    // :focus-visible, NOT :focus-within / activeElement. Clicking an arrow with
    // a mouse focuses the button, and holding on that meant auto-advance never
    // came back after a single click. focus-visible is the keyboard case only,
    // which is the one that actually needs holding.
    var FOCUS_SEL = ":focus-visible";
    try { document.querySelector(FOCUS_SEL); } catch (e) { FOCUS_SEL = null; }

    function paused(){
      if (document.hidden || dragging) return true;
      // :hover sticks after a tap on touch platforms, so only trust it where
      // the device genuinely hovers — dragging already covers swipe
      if (canHover && box.matches(":hover")) return true;
      return !!(FOCUS_SEL && box.querySelector(FOCUS_SEL));
    }
    function stop(){ if (tick) { clearInterval(tick); tick = 0; } }
    function start(){
      if (reduced || tick) return;
      tick = setInterval(function(){ if (!paused()) show(i + 1); }, DWELL);
      timers.push(tick);
    }
    // a manual move gets a full dwell, so a click never leaves you 200ms before
    // it jumps again
    function go(step){ show(i + step); stop(); start(); }

    box.querySelectorAll(".qbtn").forEach(function(b){
      on(b, "click", function(){ go(parseInt(b.getAttribute("data-step"), 10)); });
    });

    /* Swipe / drag, so the deck can be moved by hand whenever the reader wants
       rather than only by the arrows. touch-action:pan-y on the viewport gives
       us the horizontal axis and leaves the vertical one to the page, so a
       normal downward scroll through the section is never intercepted. */
    (function(){
      var view = box.querySelector(".qviewport");
      if (!view) return;
      var x0 = 0, y0 = 0, id = null;
      var THRESHOLD = 45;

      on(view, "pointerdown", function(e){
        if (e.pointerType === "mouse" && e.button !== 0) return;
        id = e.pointerId; x0 = e.clientX; y0 = e.clientY;
        dragging = true;                           // don't advance mid-drag
      });
      on(view, "pointerup", function(e){
        if (id === null || e.pointerId !== id) return;
        var dx = e.clientX - x0, dy = e.clientY - y0;
        id = null;
        dragging = false;
        // only act on a mostly-horizontal move, or a vertical flick that
        // happens to drift sideways would flip the card
        if (Math.abs(dx) > THRESHOLD && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      });
      on(view, "pointercancel", function(){ id = null; dragging = false; });
    })();

    // a reflow changes every slide's height, so re-fit rather than keep a stale
    // pixel value; webfonts landing late do the same thing
    on(window, "resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

    show(0);
    requestAnimationFrame(fit);
    start();
  })();

  /* ------------------------------------------------------------ the rows
     Each "who it's for" line opens onto the reason underneath it. The panel
     height is animated by CSS (0fr -> 1fr); this only owns the state. More
     than one may be open — these are five separate recognitions, not tabs, so
     opening the fourth should not close the one you are still reading. */
  document.querySelectorAll(".rows .rowhead").forEach(function(btn){
    on(btn, "click", function(){
      var li = btn.parentNode;
      var open = li.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* -------------------------------------------------- filmstrip hover origin
     The accent rule under each frame wipes in from the edge the pointer
     actually crossed. Pointer-guarded to match the CSS — a touch device never
     runs this, and the strip is fully readable without it.

     The rect is read once per enter, never inside a move handler, so this
     costs one layout read per hover rather than one per frame. */
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches){
    document.querySelectorAll(".frame").forEach(function(f){
      on(f, "pointerenter", function(e){
        var r = f.getBoundingClientRect();
        // which vertical edge was the pointer nearer when it crossed in
        f.style.setProperty("--ox", (e.clientX - r.left) < r.width / 2 ? "0%" : "100%");
      });
    });
  }

  /* ------------------------------------------------------- marquee throttle
     The partner row animates a transform forever. Off-screen that is a pure
     tax — it keeps a phone's compositor awake for a band nobody is looking at.
     Run it only while it is actually in view. */
  (function(){
    var track = document.querySelector(".mq-track");
    if (!track || reduced) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        track.style.animationPlayState = e.isIntersecting ? "running" : "paused";
      });
    }, { rootMargin: "120px 0px" });
    io.observe(track.parentNode);
    observers.push(io);
    // a backgrounded tab should not animate either
    on(document, "visibilitychange", function(){
      if (document.hidden) track.style.animationPlayState = "paused";
    });
  })();

  /* --------------------------------------------------- you-are-here marking */
  (function(){
    var here = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
    document.querySelectorAll(".nav a.link, .menu a").forEach(function(a){
      var href = (a.getAttribute("href") || "").replace(/\.html$/, "").replace(/\/$/, "") || "/";
      if (href === here) a.setAttribute("aria-current", "page");
    });
  })();

  /* -------------------------------------------------------------- teardown */
  function destroy(){
    if (raf) cancelAnimationFrame(raf); raf = 0;
    timers.forEach(function(t){ clearInterval(t); clearTimeout(t); }); timers.length = 0;
    observers.forEach(function(o){ o.disconnect(); }); observers.length = 0;
    listeners.forEach(function(l){ l[0].removeEventListener(l[1],l[2],l[3]); }); listeners.length = 0;
  }
  on(window, "pagehide", destroy);
  window.callsheet = { destroy: destroy };

  /* the load sequence — rule draws, headline rises, strip wipes in */
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){ document.body.classList.add("ready"); });
  });
})();


/* Auth-aware nav for the static landing: logged-in visitors get one
   MY CALLSHEET button. Owner's call — it points at /login for everyone rather
   than deep-linking to /talent|/business|/admin, so there is a single door into
   the product. Do NOT reintroduce the per-role href rewrite; the destination
   lives in the markup on purpose. Fails open to the logged-out nav on error.
   There are now two of each — one in the bar, one in the mobile menu — so both
   sides use querySelectorAll. */
fetch('/api/me',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(me){
  if(me && me.role){
    document.querySelectorAll('[data-auth="out"]').forEach(function(el){el.hidden=true});
    document.querySelectorAll('[data-auth="in"]').forEach(function(el){el.hidden=false});
  }
}).catch(function(){});
