/* ==========================================================================
   MAXIMUS — motion & interaction engine
   GSAP + ScrollTrigger + SplitText + Lenis. Everything degrades gracefully:
   reduced-motion users get a calm, fully readable site.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var HAS_GSAP = typeof window.gsap !== "undefined";
  if (!FINE) doc.classList.add("touch");
  if (REDUCED || !HAS_GSAP) doc.classList.add("no-anim");

  var lenis = null;
  var gsap = window.gsap;

  /* ---------------------------------------------------------------- utils */
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ------------------------------------------------------- year/footer etc */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------- menu ---- */
  var burger = $("[data-burger]");
  var menu = $("[data-menu]");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    if (burger) { burger.setAttribute("aria-expanded", open); burger.setAttribute("aria-label", open ? "Close menu" : "Open menu"); }
    if (menu) menu.setAttribute("aria-hidden", !open);
    if (lenis) open ? lenis.stop() : lenis.start();
    else body.style.overflow = open ? "hidden" : "";
  }
  if (burger) burger.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setMenu(false); closeModal(); }
  });

  /* ------------------------------------------------------------ forms ---- */
  var SITE = {};
  function endpoint(kind) {
    var f = (SITE && SITE.forms) || {};
    return f[kind + "Endpoint"] || "";
  }
  function validate(form) {
    var ok = true;
    $$("[required]", form).forEach(function (inp) {
      var field = inp.closest(".field");
      var bad = !inp.value.trim() || (inp.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim())) || (inp.type === "checkbox" && !inp.checked);
      if (field) field.classList.toggle("is-invalid", bad);
      if (bad && ok) { ok = false; inp.focus(); }
    });
    var tel = $("input[type=tel]", form);
    if (tel && tel.value && !/^[+\d][\d\s()-]{6,}$/.test(tel.value.trim())) {
      tel.closest(".field").classList.add("is-invalid"); if (ok) tel.focus(); ok = false;
    }
    return ok;
  }
  function wireForm(form) {
    var kind = form.getAttribute("data-form");
    var status = $(".form-status", form);
    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field"); if (f) f.classList.remove("is-invalid");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (kind === "newsletter") {
        var em = $("input[type=email]", form);
        if (!em.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { status.className = "form-status err"; status.textContent = "Please enter a valid email address."; em.focus(); return; }
      } else if (!validate(form)) { if (status) { status.className = "form-status err"; status.textContent = "Please complete the highlighted fields."; } return; }
      if ($("[name=_gotcha]", form) && $("[name=_gotcha]", form).value) return; // bot trap
      var url = endpoint(kind === "register" ? "registration" : kind);
      if (!url) {
        status.className = "form-status err";
        status.textContent = "Online submissions are being connected. Please check back shortly.";
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== "_gotcha") data[k] = v; });
      data._form = kind; data._page = location.pathname;
      var btn = $("[type=submit]", form);
      if (btn) btn.disabled = true;
      status.className = "form-status"; status.textContent = "Sending…";
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          status.className = "form-status ok";
          status.textContent = kind === "newsletter" ? "You're on the list. Welcome to MAXIMUS." : kind === "register" ? "Registration received. Watch your inbox for confirmation." : "Message received. The MAXIMUS team will be in touch.";
          form.reset();
        })
        .catch(function () { status.className = "form-status err"; status.textContent = "Something went wrong. Please try again."; })
        .then(function () { if (btn) btn.disabled = false; });
    });
  }
  $$("form[data-form]").forEach(wireForm);

  /* ------------------------------------------------------------ modal ---- */
  var modal = $("[data-modal]");
  var lastFocus = null;
  function openModal(ev) {
    if (!modal) return;
    lastFocus = document.activeElement;
    $("[data-modal-title]", modal).textContent = ev.title;
    $("[data-modal-meta]", modal).textContent = [ev.date, ev.time, ev.venue].filter(Boolean).join(" · ");
    $("input[name=event]", modal).value = ev.title + " (" + ev.date + ")";
    modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false");
    if (lenis) lenis.stop();
    setTimeout(function () { var f = $("input:not([type=hidden])", modal); if (f) f.focus(); }, 350);
  }
  function closeModal() {
    if (!modal || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }
  if (modal) {
    $$("[data-modal-close]", modal).forEach(function (b) { b.addEventListener("click", closeModal); });
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $$("a, button, input, textarea, select", modal).filter(function (x) { return !x.disabled && x.type !== "hidden"; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-register]");
    if (!b || !window.MX || !window.MX.state.events) return;
    openModal(window.MX.state.events[+b.getAttribute("data-register")]);
  });

  /* ---------------------------------------------- smooth <details> ------ */
  $$("details[data-smooth]").forEach(function (d) {
    var sum = $("summary", d), content = sum.nextElementSibling;
    sum.addEventListener("click", function (e) {
      if (!HAS_GSAP || REDUCED) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(content, { height: 0, opacity: 0, duration: .55, ease: "power3.inOut", onComplete: function () { d.open = false; gsap.set(content, { clearProps: "all" }); refresh(); } });
      } else {
        d.open = true;
        gsap.fromTo(content, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: .7, ease: "expo.out", onComplete: function () { gsap.set(content, { clearProps: "all" }); refresh(); } });
      }
    });
  });

  var totop = $("[data-totop]");
  if (totop) totop.addEventListener("click", function () { lenis ? lenis.scrollTo(0, { duration: 2.2 }) : window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* ======================================================================
     No GSAP / reduced motion — finish here with a static, readable site.
     ====================================================================== */
  function boot() {
    if (window.MX && window.MX.content) window.MX.content.then(function (s) { SITE = (s && s.site) || {}; });
    var pre = $("[data-preloader]");
    if (REDUCED || !HAS_GSAP) {
      if (pre) pre.classList.add("is-skip");
      $$("[data-fade]").forEach(function (el) { el.style.opacity = 1; });
      navState();
      window.addEventListener("scroll", navState, { passive: true });
      return;
    }
    motion();
  }

  var refresh = function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); };

  /* -------------------------------------------- nav colour / visibility */
  var nav = $("[data-nav]");
  var lastY = 0;
  function navState() {
    if (!nav) return;
    var y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > 400 && y > lastY + 2 && !body.classList.contains("menu-open"));
    if (y < lastY - 2) nav.classList.remove("is-hidden");
    lastY = y;
    // light/dark detection: sample element under the nav
    var el = document.elementFromPoint(window.innerWidth / 2, 38);
    var sec = el && el.closest("section, header.hero, footer, .marquee, .phero, .philo, .cta, .final");
    var dark = !sec || sec.matches(".dark, .blue, .hero, .phero, .philo, .cta, .final, footer, .marquee--navy, .marquee--blue, [data-dark]");
    nav.classList.toggle("is-light", !dark && y > 10);
  }

  /* ======================================================================
     Motion
     ====================================================================== */
  function motion() {
    var ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);
    if (window.CustomEase) { gsap.registerPlugin(window.CustomEase); window.CustomEase.create("mx", "0.22,1,0.36,1"); }
    var EASE = window.CustomEase ? "mx" : "expo.out";
    gsap.defaults({ ease: EASE, duration: 1.1 });
    ST.config({ ignoreMobileResize: true });

    /* Lenis smooth scroll */
    if (window.Lenis) {
      lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, syncTouch: false });
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener("click", function (e) {
          var id = a.getAttribute("href"); if (id.length < 2) return;
          var t = $(id); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.6 });
        });
      });
    }

    /* progress + nav */
    var bar = $("[data-progress]");
    ST.create({ start: 0, end: "max", onUpdate: function (self) { if (bar) bar.style.transform = "scaleX(" + self.progress + ")"; navState(); } });
    navState();

    cursor();
    magnetic();
    buttonsFill();

    /* ---- intro sequence: preloader on first visit, curtain afterwards */
    var pre = $("[data-preloader]");
    var pt = $("[data-pt]");
    var fromTransition = ss("mx-pt") === "1";
    ss("mx-pt", "0");
    var firstVisit = ss("mx-seen") !== "1";
    ss("mx-seen", "1");

    var intro = gsap.timeline({ paused: true });
    if (firstVisit && pre) {
      var paths = $$(".preloader__mark path", pre);
      paths.forEach(function (p) {
        var l = p.getTotalLength ? p.getTotalLength() : 1000;
        gsap.set(p, { strokeDasharray: l, strokeDashoffset: l, fillOpacity: 0 });
      });
      var counter = { v: 0 };
      var cnt = $("[data-count]", pre);
      intro
        .to(paths, { strokeDashoffset: 0, duration: 1.6, stagger: .18, ease: "power2.inOut" }, 0)
        .to(counter, { v: 100, duration: 1.9, ease: "power3.inOut", onUpdate: function () { cnt.textContent = Math.round(counter.v); } }, 0)
        .to(paths, { fillOpacity: 1, strokeWidth: 0, duration: .6, stagger: .08 }, 1.35)
        .to(".preloader__mark", { scale: 1.15, rotate: -6, duration: .5, ease: "power2.in" }, 2.05)
        .to(".preloader__core", { autoAlpha: 0, y: -30, duration: .5, ease: "power2.in" }, 2.15)
        .to(".preloader__panel--a", { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, 2.4)
        .to(".preloader__panel--b", { yPercent: 100, duration: 1.1, ease: "expo.inOut" }, 2.4)
        .set(pre, { display: "none" });
      intro.add(pageIn(), 2.75);
    } else {
      if (pre) pre.style.display = "none";
      if (fromTransition && pt) {
        gsap.set(pt, { visibility: "visible" });
        gsap.set([".pt__a", ".pt__b"], { yPercent: 0 });
        gsap.set(".pt__logo", { autoAlpha: 1 });
        intro
          .to(".pt__logo", { autoAlpha: 0, scale: .8, duration: .4, ease: "power2.in" }, 0)
          .to(".pt__b", { yPercent: -100, duration: .9, ease: "expo.inOut" }, .1)
          .to(".pt__a", { yPercent: -100, duration: .9, ease: "expo.inOut" }, .22)
          .set(pt, { visibility: "hidden" });
        intro.add(pageIn(), .45);
      } else {
        intro.add(pageIn(), 0);
      }
    }

    /* Wait for fonts + CMS content so split lines measure correctly */
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var content = window.MX && window.MX.content ? window.MX.content : Promise.resolve({});
    var timeout = new Promise(function (r) { setTimeout(r, 2500); });
    Promise.race([Promise.all([fontsReady, content]), timeout]).then(function () {
      if (window.MX && window.MX.state) SITE = window.MX.state.site || SITE;
      scenes();
      intro.play();
      setTimeout(refresh, 400);
    });
    window.addEventListener("load", function () { setTimeout(refresh, 200); });

    pageTransitions();
    if ($("[data-hero-canvas]")) particles($("[data-hero-canvas]"));
  }

  /* ----------------------------------------------------- page entrance */
  function pageIn() {
    var tl = gsap.timeline();
    var heroTitle = $("[data-hero-title]");
    if (heroTitle) {
      var chars = $$(".line > span", heroTitle);
      if (window.SplitText) {
        chars = [];
        $$(".line > span", heroTitle).forEach(function (s) { chars = chars.concat(new window.SplitText(s, { type: "chars" }).chars); });
      }
      tl.from(chars, { yPercent: 120, rotate: 12, duration: 1.4, stagger: { each: .028, from: "start" }, ease: "expo.out" }, 0)
        .from("[data-hero-in]", { y: 40, autoAlpha: 0, duration: 1.1, stagger: .09 }, .45)
        .from(".nav__inner > *", { y: -30, autoAlpha: 0, duration: 1, stagger: .06 }, .3);
    }
    var ph = $("[data-phero-title]");
    if (ph) {
      var lines = splitLines(ph);
      tl.from(lines, { yPercent: 115, rotate: 3, duration: 1.3, stagger: .1, ease: "expo.out" }, 0)
        .from("[data-phero-in]", { y: 36, autoAlpha: 0, duration: 1, stagger: .08 }, .35)
        .from(".phero__mark", { scale: .7, rotate: -20, autoAlpha: 0, duration: 2, ease: "expo.out" }, 0)
        .from(".phero__bg .ph", { scale: 1.25, duration: 2.4, ease: "expo.out" }, 0)
        .from(".nav__inner > *", { y: -30, autoAlpha: 0, duration: 1, stagger: .06 }, .2);
    }
    return tl;
  }

  function splitLines(el) {
    if (!window.SplitText) return [el];
    var s = new window.SplitText(el, { type: "lines", linesClass: "split-line-inner" });
    s.lines.forEach(function (l) {
      var w = document.createElement("span");
      w.className = "split-line";
      l.parentNode.insertBefore(w, l); w.appendChild(l);
      l.style.display = "block";
    });
    return s.lines;
  }

  /* ------------------------------------------------------ scroll scenes */
  function scenes() {
    var ST = window.ScrollTrigger;
    var mm = gsap.matchMedia();

    // reveal split headings
    $$("[data-split]").forEach(function (el) {
      var lines = splitLines(el);
      gsap.from(lines, { yPercent: 110, rotate: 2.5, duration: 1.25, stagger: .09, scrollTrigger: { trigger: el, start: "top 88%" } });
    });

    // fade up (incl. CMS rendered)
    ST.batch("[data-fade]", {
      start: "top 90%",
      onEnter: function (els) { gsap.fromTo(els, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: .09, overwrite: true }); }
    });
    $$("[data-fade]").forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight * .9 && !el.closest(".hero, .phero")) gsap.set(el, { autoAlpha: 1 }); });

    // staggered groups
    $$("[data-stagger]").forEach(function (g) {
      gsap.from(g.children, { y: 70, autoAlpha: 0, rotateX: -12, transformOrigin: "50% 100%", duration: 1.2, stagger: .08, scrollTrigger: { trigger: g, start: "top 85%" } });
    });

    // scrubbed word fill statements
    $$(".statement--fill, .final__text").forEach(function (el) {
      var words;
      if (window.SplitText) words = new window.SplitText(el, { type: "words", wordsClass: "word" }).words;
      else words = $$(".word", el);
      gsap.to(words, { color: function () { return el.closest(".dark, .final") ? "#FFFFFF" : "#0F172A"; }, stagger: .1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } });
      $$(".hl, .hl-g, .accent", el).forEach(function (h) { gsap.to($$(".word", h).length ? $$(".word", h) : h, { color: h.classList.contains("hl-g") ? "#7ED321" : el.closest(".dark, .final") ? "#B5F44A" : "#305EE6", ease: "none", scrollTrigger: { trigger: h, start: "top 75%", end: "top 50%", scrub: true } }); });
    });

    // clip-path image reveals + inner zoom
    $$("[data-clip]").forEach(function (fig) {
      var img = $("img", fig);
      var dir = fig.getAttribute("data-clip");
      var from = dir === "left" ? "inset(0 100% 0 0 round 22px)" : dir === "right" ? "inset(0 0 0 100% round 22px)" : "inset(100% 0 0 0 round 22px)";
      var tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 85%" } });
      tl.fromTo(fig, { clipPath: from }, { clipPath: "inset(0% 0% 0% 0% round 22px)", duration: 1.6, ease: "expo.inOut" });
      if (img) tl.fromTo(img, { scale: 1.4 }, { scale: 1, duration: 2, ease: "expo.out" }, 0.1);
    });

    // parallax images
    $$("[data-parallax]").forEach(function (fig) {
      var img = $("img", fig); if (!img) return;
      var amt = parseFloat(fig.getAttribute("data-parallax")) || 10;
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: "none", scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true } });
    });
    $$("[data-speed]").forEach(function (el) {
      var s = parseFloat(el.getAttribute("data-speed"));
      gsap.to(el, { y: function () { return s * 100; }, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // marquees: endless + react to scroll velocity
    $$("[data-marquee]").forEach(function (m) {
      var track = $(".marquee__track", m);
      var group = $(".marquee__group", m);
      if (!track || !group) return;
      // duplicate so it loops seamlessly
      for (var i = 0; i < 2; i++) track.appendChild(group.cloneNode(true)).setAttribute("aria-hidden", "true");
      var dir = m.getAttribute("data-marquee") === "right" ? 1 : -1;
      var x = 0, speed = parseFloat(m.getAttribute("data-speed-x")) || 1, boost = 0, skew = gsap.quickTo(track, "skewX", { duration: .6, ease: "power3" });
      var w = group.offsetWidth;
      window.addEventListener("resize", function () { w = group.offsetWidth; });
      ST.create({ trigger: m, start: "top bottom", end: "bottom top", onUpdate: function (self) { var v = self.getVelocity(); boost = clamp(v / 120, -18, 18); skew(clamp(-v / 400, -8, 8)); } });
      gsap.ticker.add(function (t, dt) {
        var d = (dt || 16) / 16;
        boost *= .92;
        var dirNow = boost < -1 ? -dir : dir;
        x += (speed + Math.abs(boost)) * dirNow * d;
        if (x <= -w) x += w; if (x > 0) x -= w;
        track.style.transform = "translate3d(" + x + "px,0,0) skewX(" + gsap.getProperty(track, "skewX") + "deg)";
      });
    });

    // hero: scroll out
    if ($(".hero")) {
      gsap.to(".hero__inner", { yPercent: -18, autoAlpha: .2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    }
    if ($(".phero")) {
      gsap.to(".phero__inner", { yPercent: -14, ease: "none", scrollTrigger: { trigger: ".phero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".phero__mark", { rotate: 25, yPercent: -40, ease: "none", scrollTrigger: { trigger: ".phero", start: "top top", end: "bottom top", scrub: true } });
    }

    // logo equation
    if ($(".equation")) {
      gsap.from(".equation > *", { scale: .4, autoAlpha: 0, rotate: -25, duration: 1.2, stagger: .14, ease: "back.out(1.6)", scrollTrigger: { trigger: ".equation", start: "top 80%" } });
    }

    // philosophy pinned scene
    mm.add("(min-width: 1px)", function () {
      var philo = $(".philo"); if (!philo) return;
      var words = $$(".philo__word", philo);
      var mark = $(".philo__mark", philo);
      var markPaths = $$(".logo__mark", mark);
      var tl = gsap.timeline({ scrollTrigger: { trigger: philo, start: "top top", end: "+=" + (words.length * 70) + "%", pin: true, scrub: 1 } });
      tl.fromTo(mark, { scale: .5, rotate: -30, autoAlpha: .15 }, { scale: 1.1, rotate: 0, autoAlpha: .22, duration: words.length, ease: "none" }, 0);
      tl.fromTo(markPaths, { y: function (i) { return [-120, 80, 160][i] || 0; } }, { y: 0, duration: words.length * .7, ease: "none" }, 0);
      words.forEach(function (w, i) {
        tl.fromTo(w, { autoAlpha: 0, yPercent: 60, scale: .9, filter: "blur(12px)" }, { autoAlpha: 1, yPercent: 0, scale: 1, filter: "blur(0px)", duration: .5, ease: "power3.out" }, i);
        if (i < words.length - 1) tl.to(w, { autoAlpha: 0, yPercent: -60, scale: 1.08, filter: "blur(12px)", duration: .4, ease: "power2.in" }, i + .65);
      });
      tl.to(".philo__kicker", { autoAlpha: 1, duration: .4 }, words.length - .4);
    });

    // horizontal focus track (desktop)
    mm.add("(min-width: 761px) and (min-height: 561px)", function () {
      var hs = $(".hs"); if (!hs) return;
      var track = $(".hs__track", hs);
      var cards = $$(".fcard", track);
      var counter = $("[data-hs-count]", hs);
      var barEl = $(".hs__bar span", hs);
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: hs, pin: ".hs__pin", start: "top top", end: function () { return "+=" + dist(); }, scrub: 1, invalidateOnRefresh: true,
          onUpdate: function (self) {
            if (barEl) barEl.style.transform = "scaleX(" + self.progress + ")";
            if (counter) counter.textContent = String(Math.min(cards.length - 2, Math.max(1, Math.round(self.progress * (cards.length - 2)) || 1))).padStart(2, "0");
          }
        }
      });
      cards.forEach(function (c) {
        var img = $(".ph img", c);
        if (img) gsap.fromTo(img, { xPercent: -10, scale: 1.2 }, { xPercent: 10, scale: 1.2, ease: "none", scrollTrigger: { trigger: c, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
        gsap.from(c, { rotateY: -18, z: -120, autoAlpha: .3, ease: "none", scrollTrigger: { trigger: c, containerAnimation: tween, start: "left 100%", end: "left 55%", scrub: true } });
      });
    });

    // journey line
    $$(".journey").forEach(function (j) {
      var line = $(".journey__line", j);
      var steps = $$(".jstep", j);
      var vertical = window.matchMedia("(max-width: 900px)").matches;
      gsap.to(line, {
        scaleX: vertical ? 1 : 1, scaleY: 1, ease: "none",
        scrollTrigger: {
          trigger: j, start: "top 70%", end: "bottom 60%", scrub: true,
          onUpdate: function (self) { steps.forEach(function (s, i) { s.classList.toggle("is-on", self.progress >= i / steps.length + .02); }); }
        }
      });
      gsap.from(steps, { y: 60, autoAlpha: 0, stagger: .12, duration: 1.1, scrollTrigger: { trigger: j, start: "top 80%" } });
    });

    // stacked values: shrink previous card as next arrives
    var vcards = $$(".vcard");
    vcards.forEach(function (c, i) {
      if (i === vcards.length - 1) return;
      gsap.to(c, { scale: .9, filter: "brightness(.7)", ease: "none", scrollTrigger: { trigger: vcards[i + 1], start: "top bottom", end: "top " + (80 + 20) + "px", scrub: true } });
      var t = $(".vcard__t", c);
    });
    vcards.forEach(function (c) {
      var t = $(".vcard__t", c);
      if (t) gsap.from(t, { yPercent: 40, autoAlpha: 0, duration: 1.2, scrollTrigger: { trigger: c, start: "top 75%" } });
    });

    // big culture word slides
    $$("[data-slide-x]").forEach(function (el) {
      var amt = parseFloat(el.getAttribute("data-slide-x"));
      gsap.fromTo(el, { xPercent: amt > 0 ? -amt : 0 }, { xPercent: amt > 0 ? 0 : amt, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // footer giant logo
    var giant = $(".footer__giant .logo");
    if (giant) {
      gsap.from($$("path", giant), { yPercent: 100, autoAlpha: 0, stagger: .015, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".footer__giant", start: "top 95%" } });
    }

    // CTA zoom
    $$(".cta").forEach(function (c) {
      gsap.from($(".cta__title", c), { scale: .82, autoAlpha: 0, duration: 1.6, scrollTrigger: { trigger: c, start: "top 75%" } });
      gsap.from($(".cta__mark", c), { rotate: -180, scale: 0, duration: 1.6, ease: "back.out(1.4)", scrollTrigger: { trigger: c, start: "top 75%" } });
    });

    // rotating mark badges
    $$("[data-spin-scroll]").forEach(function (el) {
      gsap.to(el, { rotate: 360, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 } });
    });

    // 3D tilt + glare
    if (FINE) {
      $$("[data-tilt]").forEach(function (el) {
        var rx = gsap.quickTo(el, "rotationX", { duration: .6, ease: "power3" });
        var ry = gsap.quickTo(el, "rotationY", { duration: .6, ease: "power3" });
        gsap.set(el, { transformPerspective: 900 });
        var max = parseFloat(el.getAttribute("data-tilt")) || 8;
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          ry((px - .5) * max * 2); rx(-(py - .5) * max * 2);
          el.style.setProperty("--x", px * 100 + "%"); el.style.setProperty("--y", py * 100 + "%");
        });
        el.addEventListener("pointerleave", function () { rx(0); ry(0); });
      });
      $$(".evf").forEach(function (el) {
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect();
          el.style.setProperty("--x", e.clientX - r.left + "px"); el.style.setProperty("--y", e.clientY - r.top + "px");
        });
      });
    }

    // re-measure after CMS renders more content
    magnetic();
  }

  /* ------------------------------------------------------ page transitions */
  function pageTransitions() {
    var pt = $("[data-pt]"); if (!pt) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a"); if (!a) return;
      var href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (/^(mailto:|tel:|#|https?:)/i.test(href) && !(href.indexOf(location.origin) === 0)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.indexOf("/admin") === 0) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      setMenu(false);
      ss("mx-pt", "1");
      gsap.set(pt, { visibility: "visible" });
      gsap.timeline({ onComplete: function () { location.href = url.href; } })
        .fromTo(".pt__a", { yPercent: 100 }, { yPercent: 0, duration: .75, ease: "expo.inOut" }, 0)
        .fromTo(".pt__b", { yPercent: 100 }, { yPercent: 0, duration: .75, ease: "expo.inOut" }, .1)
        .fromTo(".pt__logo", { autoAlpha: 0, scale: .6, rotate: -30 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: .5, ease: "back.out(2)" }, .55);
    });
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) { gsap.set(pt, { visibility: "hidden" }); gsap.set([".pt__a", ".pt__b"], { yPercent: 100 }); }
    });
  }

  /* ---------------------------------------------------------------- cursor */
  function cursor() {
    if (!FINE) return;
    var c = $(".cursor"); if (!c) return;
    doc.classList.add("has-cursor");
    var dot = $(".cursor__dot", c), ring = $(".cursor__ring", c), label = $(".cursor__label", c);
    var dx = gsap.quickTo(dot, "x", { duration: .08 }), dy = gsap.quickTo(dot, "y", { duration: .08 });
    var rx = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
    window.addEventListener("pointermove", function (e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    window.addEventListener("pointerdown", function () { c.classList.add("is-down"); });
    window.addEventListener("pointerup", function () { c.classList.remove("is-down"); });
    document.addEventListener("pointerover", function (e) {
      var l = e.target.closest("[data-cursor]");
      var h = e.target.closest("a, button, summary, [data-magnetic], label, input, textarea, select");
      c.classList.toggle("is-label", !!l);
      label.textContent = l ? l.getAttribute("data-cursor") : "";
      c.classList.toggle("is-hover", !l && !!h);
    });
    document.addEventListener("pointerleave", function () { gsap.to(c, { autoAlpha: 0, duration: .3 }); });
    document.addEventListener("pointerenter", function () { gsap.to(c, { autoAlpha: 1, duration: .3 }); });
  }

  /* -------------------------------------------------------------- magnetic */
  function magnetic() {
    if (!FINE) return;
    $$("[data-magnetic]:not([data-mag-on])").forEach(function (el) {
      el.setAttribute("data-mag-on", "");
      var s = parseFloat(el.getAttribute("data-magnetic")) || .35;
      var xt = gsap.quickTo(el, "x", { duration: .8, ease: "elastic.out(1, .4)" });
      var yt = gsap.quickTo(el, "y", { duration: .8, ease: "elastic.out(1, .4)" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        xt((e.clientX - r.left - r.width / 2) * s); yt((e.clientY - r.top - r.height / 2) * s);
      });
      el.addEventListener("pointerleave", function () { xt(0); yt(0); });
    });
  }
  function buttonsFill() {
    document.addEventListener("pointerover", function (e) {
      var b = e.target.closest(".btn"); if (!b) return;
      var r = b.getBoundingClientRect();
      b.style.setProperty("--mx", e.clientX - r.left + "px"); b.style.setProperty("--my", e.clientY - r.top + "px");
    });
  }

  /* ======================================================================
     Hero particles — thousands of points assemble into the official mark,
     flee the cursor, breathe, and explode outward as you scroll away.
     ====================================================================== */
  function particles(canvas) {
    var ctx = canvas.getContext("2d");
    var src = $("[data-hero-mark] svg");
    if (!ctx || !src) return;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, pts = [], mouse = { x: -9999, y: -9999, on: false }, scrollP = 0, t0 = performance.now(), running = true;
    var paths = $$("path", src).map(function (p) { return { d: p.getAttribute("d"), fill: p.getAttribute("fill") }; });
    var VB = src.getAttribute("viewBox").split(/\s+/).map(Number);

    function build() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var mobile = W < 760;
      var size = mobile ? Math.min(W * .82, H * .36) : Math.min(W * .31, H * .62);
      var cx = mobile ? W / 2 : W * .785, cy = mobile ? H * .3 : H * .42;
      var scale = size / VB[2];
      // rasterise the mark offscreen
      var off = document.createElement("canvas");
      var ow = Math.ceil(VB[2] * scale), oh = Math.ceil(VB[3] * scale);
      off.width = ow; off.height = oh;
      var o = off.getContext("2d");
      o.scale(scale, scale); o.translate(-VB[0], -VB[1]);
      paths.forEach(function (p) { o.fillStyle = p.fill; o.fill(new Path2D(p.d)); });
      var data = o.getImageData(0, 0, ow, oh).data;
      var gap = mobile ? 5 : Math.max(4, Math.round(size / 110));
      var next = [];
      for (var y = 0; y < oh; y += gap) {
        for (var x = 0; x < ow; x += gap) {
          var i = (y * ow + x) * 4;
          if (data[i + 3] > 128) {
            var g = data[i + 1] > data[i + 2]; // green-ish pixel
            next.push({ tx: cx - ow / 2 + x, ty: cy - oh / 2 + y, c: g ? "126,211,33" : "255,255,255" });
          }
        }
      }
      // reuse existing particles for smooth rebuilds
      pts = next.map(function (n, k) {
        var old = pts[k];
        var ang = Math.random() * Math.PI * 2, rad = Math.max(W, H) * (.6 + Math.random() * .6);
        return {
          x: old ? old.x : W / 2 + Math.cos(ang) * rad, y: old ? old.y : H / 2 + Math.sin(ang) * rad,
          vx: 0, vy: 0, tx: n.tx, ty: n.ty, c: n.c,
          r: Math.random() * 1.2 + (mobile ? .8 : 1),
          ph: Math.random() * Math.PI * 2,
          ex: (Math.random() - .5) * 2, ey: (Math.random() - .5) * 2 - .4
        };
      });
    }

    var start = performance.now();
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      var t = (now - t0) / 1000;
      var arrive = clamp((now - start) / 2600, 0, 1);
      ctx.clearRect(0, 0, W, H);
      var spread = scrollP * scrollP * Math.max(W, H) * .9;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var tx = p.tx + Math.sin(t * 1.2 + p.ph) * 1.6 + p.ex * spread;
        var ty = p.ty + Math.cos(t * 1.1 + p.ph) * 1.6 + p.ey * spread;
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (mouse.on && d2 < 14400) {
          var f = (1 - d2 / 14400) * 6.5, d = Math.sqrt(d2) || 1;
          p.vx += dx / d * f; p.vy += dy / d * f;
        }
        var k = .018 + arrive * .05;
        p.vx += (tx - p.x) * k; p.vy += (ty - p.y) * k;
        p.vx *= .82; p.vy *= .82;
        p.x += p.vx; p.y += p.vy;
        var sp = Math.min(1, Math.abs(p.vx) + Math.abs(p.vy));
        ctx.fillStyle = "rgba(" + p.c + "," + (0.55 + sp * .45) * (1 - scrollP * .7) + ")";
        ctx.fillRect(p.x, p.y, p.r + sp, p.r + sp);
      }
    }

    build();
    requestAnimationFrame(frame);
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 200); });
    var hero = canvas.closest(".hero");
    hero.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; });
    hero.addEventListener("pointerleave", function () { mouse.on = false; });
    window.ScrollTrigger.create({
      trigger: hero, start: "top top", end: "bottom top",
      onUpdate: function (s) { scrollP = s.progress; },
      onToggle: function (s) { var was = running; running = s.isActive || s.progress < 1; if (running && !was) requestAnimationFrame(frame); }
    });
    document.addEventListener("visibilitychange", function () { var was = running; running = !document.hidden; if (running && !was) requestAnimationFrame(frame); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
