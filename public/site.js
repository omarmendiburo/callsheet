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
