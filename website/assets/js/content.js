/* MAXIMUS — CMS content layer.
   Reads the JSON files in /content (edited through /admin or by hand) and renders
   events, announcements, leadership profiles, recognition and programmes.
   Nothing is shown unless it is marked published/verified, and past events are
   never shown as upcoming. */
(function () {
  "use strict";

  var ICON = {
    calendar: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>',
    up: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
  };
  function ic(n) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + "</svg>";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^(https?:|mailto:|tel:|\/|[\w-]+\.html)/i.test(u) ? u : "";
  }
  function get(name) {
    return fetch("content/" + name + ".json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { return null; });
  }
  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(d) {
    return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  /* ---------- events ---------- */
  function upcoming(data) {
    var t = today();
    return ((data && data.events) || [])
      .filter(function (e) {
        var d = parseDate(e.date);
        return e.published === true && e.verified !== false && d && d >= t && e.title;
      })
      .sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });
  }
  function eventCard(e, i) {
    var d = parseDate(e.date);
    var reg = safeUrl(e.registrationUrl);
    var btn = reg
      ? '<a class="btn btn--sm" href="' + esc(reg) + '" target="_blank" rel="noopener" data-magnetic><span>Register</span>' + ic("up") + "</a>"
      : '<button class="btn btn--sm" type="button" data-register="' + i + '" data-magnetic><span>Register</span>' + ic("arrow") + "</button>";
    return (
      '<article class="ev" data-fade>' +
      '<div class="ev__date" aria-hidden="true"><b>' + d.getDate() + "</b><span>" + MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2) + "</span></div>" +
      "<div>" +
      (e.type ? '<p class="ev__type">' + esc(e.type) + "</p>" : "") +
      '<h3 class="ev__title">' + esc(e.title) + "</h3>" +
      (e.description ? '<p class="ev__desc">' + esc(e.description) + "</p>" : "") +
      '<div class="ev__meta">' +
      "<span>" + ic("calendar") + '<time datetime="' + esc(e.date) + '">' + fmtDate(d) + "</time></span>" +
      (e.time ? "<span>" + ic("clock") + esc(e.time) + (e.endTime ? " – " + esc(e.endTime) : "") + "</span>" : "") +
      (e.venue ? "<span>" + ic("pin") + esc(e.venue) + "</span>" : "") +
      "</div></div>" +
      '<div class="ev__cta">' + btn + "</div>" +
      "</article>"
    );
  }
  function eventLD(e) {
    var ld = {
      "@context": "https://schema.org", "@type": "Event", name: e.title, description: e.description || undefined,
      startDate: e.date + (e.time && /^\d{1,2}:\d{2}$/.test(e.time) ? "T" + e.time : ""),
      eventStatus: "https://schema.org/EventScheduled",
      location: e.venue ? { "@type": "Place", name: e.venue } : undefined,
      organizer: { "@type": "Organization", name: "MAXIMUS" }
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ---------- announcements ---------- */
  function liveAnnouncements(data) {
    var t = today();
    return ((data && data.items) || []).filter(function (a) {
      var exp = parseDate(a.expires);
      return a.published === true && a.title && (!exp || exp >= t);
    });
  }

  /* ---------- render ---------- */
  var state = {};
  var ready = Promise.all([get("events"), get("announcements"), get("leadership"), get("achievements"), get("programmes"), get("site")]).then(function (r) {
    state.events = upcoming(r[0]);
    state.announcements = liveAnnouncements(r[1]);
    state.profiles = ((r[2] && r[2].profiles) || []).filter(function (p) { return p.published === true && p.name; });
    var ach = r[3] || {};
    var ok = function (x) { return x && x.verified === true && x.title; };
    state.milestones = (ach.milestones || []).filter(ok);
    state.recognitions = (ach.recognitions || []).filter(ok);
    state.stories = (ach.stories || []).filter(ok);
    state.programmes = ((r[4] && r[4].items) || []).filter(function (p) { return p.published === true && p.title; });
    state.site = r[5] || {};

    // events
    each("[data-cms=events]", function (el) {
      var limit = +el.getAttribute("data-limit") || 99;
      var list = state.events.slice(0, limit);
      var empty = el.parentNode.querySelector("[data-cms-empty=events]");
      if (!list.length) { if (empty) empty.hidden = false; el.hidden = true; return; }
      if (empty) empty.hidden = true;
      el.innerHTML = list.map(eventCard).join("");
    });
    if (document.querySelector("[data-cms=events]")) state.events.forEach(eventLD);

    // announcements
    each("[data-cms=announcements]", function (el) {
      if (!state.announcements.length) { el.hidden = true; return; }
      el.hidden = false;
      el.innerHTML = state.announcements.map(function (a) {
        var link = safeUrl(a.link);
        return '<div class="announce" data-fade><b>' + ic("star") + "</b><p><strong>" + esc(a.title) + "</strong>" + (a.body ? " " + esc(a.body) : "") + "</p>" +
          (link ? '<a class="link-arrow" href="' + esc(link) + '"><span>' + esc(a.linkLabel || "Learn more") + "</span>" + ic("up") + "</a>" : "") + "</div>";
      }).join("");
    });

    // leadership profiles
    each("[data-cms=profiles]", function (el) {
      var empty = el.parentNode.querySelector("[data-cms-empty=profiles]");
      if (!state.profiles.length) { el.hidden = true; if (empty) empty.hidden = false; return; }
      if (empty) empty.hidden = true;
      el.innerHTML = state.profiles.map(function (p) {
        var img = safeUrl(p.photo);
        return '<article class="profile" data-fade><div class="profile__img">' + (img ? '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy">' : "") +
          '</div><div class="profile__body"><p class="profile__role">' + esc(p.role || "") + '</p><h3 class="h4">' + esc(p.name) + "</h3>" +
          (p.bio ? "<p>" + esc(p.bio) + "</p>" : "") + "</div></article>";
      }).join("");
    });

    // recognition / milestones / stories
    each("[data-cms=recognition]", function (el) {
      var all = state.milestones.map(function (m) { return { k: "Milestone", t: m.title, d: m.date, b: m.description }; })
        .concat(state.recognitions.map(function (m) { return { k: m.category || "Recognition", t: m.title, d: m.date, b: (m.recipient ? m.recipient + " — " : "") + (m.description || "") }; }))
        .concat(state.stories.map(function (m) { return { k: "Growth story", t: m.title, d: m.date, b: (m.name ? m.name + " — " : "") + (m.story || "") }; }))
        .sort(function (a, b) { return (b.d || "").localeCompare(a.d || ""); });
      var empty = el.parentNode.querySelector("[data-cms-empty=recognition]");
      if (!all.length) { el.hidden = true; if (empty) empty.hidden = false; return; }
      if (empty) empty.hidden = true;
      el.innerHTML = all.map(function (x) {
        var d = parseDate(x.d);
        return '<div class="tl" data-fade><p class="tl__date">' + esc(x.k) + (d ? " · " + MONTHS[d.getMonth()] + " " + d.getFullYear() : "") + '</p><h3 class="h4">' + esc(x.t) + "</h3>" + (x.b ? '<p class="muted">' + esc(x.b) + "</p>" : "") + "</div>";
      }).join("");
    });

    // programmes
    each("[data-cms=programmes]", function (el) {
      var empty = el.parentNode.querySelector("[data-cms-empty=programmes]");
      if (!state.programmes.length) { el.hidden = true; if (empty) empty.hidden = false; return; }
      if (empty) empty.hidden = true;
      el.innerHTML = state.programmes.map(function (p) {
        var link = safeUrl(p.link);
        return '<article class="res" data-fade><p class="res__type">' + esc(p.type || "Resource") + '</p><h3 class="h4">' + esc(p.title) + "</h3>" + (p.description ? "<p>" + esc(p.description) + "</p>" : "") +
          (link ? '<a class="link-arrow" href="' + esc(link) + '"><span>' + esc(p.linkLabel || "View") + "</span>" + ic("up") + "</a>" : "") + "</article>";
      }).join("");
    });

    // contact details (only if provided)
    each("[data-cms=contact]", function (el) {
      var s = state.site, rows = [];
      if (s.contactEmail) rows.push(["mail", "Email", '<a href="mailto:' + esc(s.contactEmail) + '">' + esc(s.contactEmail) + "</a>"]);
      if (s.contactPhone) rows.push(["phone", "Phone", '<a href="tel:' + esc(s.contactPhone.replace(/\s+/g, "")) + '">' + esc(s.contactPhone) + "</a>"]);
      if (s.location) rows.push(["pin", "Location", esc(s.location)]);
      if (!rows.length) { el.hidden = true; return; }
      var P = { mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>', phone: '<path d="M5 3h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 7.1 7.1l1.4-2.3L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"/>', pin: ICON.pin };
      el.innerHTML = rows.map(function (r) {
        return '<div class="cinfo__item"><b><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[r[0]] + "</svg></b><div><small>" + r[1] + "</small><span>" + r[2] + "</span></div></div>";
      }).join("");
    });

    return state;
  });

  window.MX = window.MX || {};
  window.MX.content = ready;
  window.MX.state = state;
})();
