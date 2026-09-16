/* 企业故事馆 · 交互:进度朱线 / 拇指索引 / 谱注跳转 / 描线 / 书签 */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 进度朱线 */
  var bar = document.querySelector(".reading-rule i");
  if (bar) {
    var update = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.width = (p * 100).toFixed(2) + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* 拇指索引:当前章 + 书眉联动 */
  var thumbs = document.querySelectorAll(".thumbs a[data-ch]");
  var chapters = [];
  thumbs.forEach(function (a) {
    var t = document.querySelector(a.getAttribute("href"));
    if (t) chapters.push({ link: a, el: t });
  });
  if (chapters.length) {
    var runningHead = document.querySelector(".running-head");
    var bookName = document.body.getAttribute("data-book-name") || "";
    var markHere = function () {
      var y = window.scrollY + window.innerHeight * 0.35;
      var cur = chapters[0];
      chapters.forEach(function (c) { if (c.el.offsetTop <= y) cur = c; });
      thumbs.forEach(function (a) { a.classList.remove("here"); });
      cur.link.classList.add("here");
      if (runningHead && bookName && cur.el.getAttribute("data-pin")) {
        runningHead.textContent = bookName + " · " + cur.el.getAttribute("data-pin");
      }
    };
    window.addEventListener("scroll", markHere, { passive: true });
    markHere();
  }

  /* 朱色谱注 → 大事记条目:跳转并闪现 */
  document.querySelectorAll("a.ref[href^='#']").forEach(function (a) {
    a.addEventListener("click", function () {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      target.classList.remove("ref-flash");
      void target.offsetWidth; /* 重新触发动画 */
      target.classList.add("ref-flash");
    });
  });
  if (window.location.hash && document.querySelector(".chronicle")) {
    var t = document.querySelector(window.location.hash);
    if (t && t.classList.contains("ref-flash") === false && t.tagName === "LI") {
      t.classList.add("ref-flash");
    }
  }

  /* 描线:唯一的主动效 */
  var diagram = document.querySelector(".diagram");
  var drawAll = function () {
    diagram.querySelectorAll("[data-draw], text").forEach(function (el) { el.classList.add("drawn"); });
  };
  if (diagram && !reduced && "IntersectionObserver" in window) {
    diagram.querySelectorAll("[data-draw]").forEach(function (el) {
      var len = 600;
      try {
        if (typeof el.getTotalLength === "function") len = Math.ceil(el.getTotalLength()) + 4;
      } catch (e) { /* 保持默认长度 */ }
      el.style.setProperty("--len", len);
    });
    diagram.classList.add("armed");
    var fired = false;
    var fire = function () {
      if (fired) return;
      fired = true;
      diagram.querySelectorAll("[data-draw]").forEach(function (el, i) {
        setTimeout(function () { el.classList.add("drawn"); }, i * 200);
      });
      diagram.querySelectorAll("text").forEach(function (el) {
        setTimeout(function () { el.classList.add("drawn"); }, 700);
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { fire(); io.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(diagram);
    setTimeout(fire, 6000); /* 兜底:观察未触发也保证内容可见 */
  } else if (diagram) {
    drawAll();
  }

  /* 书签:读到此处(首页不启用) */
  var pin = document.getElementById("bookmark-pin");
  var key = "story-hall:bookmark:" + (document.body.dataset.book || "index");
  if (pin) {
    var saved = null;
    try { saved = window.localStorage.getItem(key); } catch (e) { /* 无存储则不显示 */ }
    if (saved) {
      var sec = document.getElementById(saved);
      if (sec) {
        pin.hidden = false;
        pin.querySelector(".bm-ch").textContent = sec.getAttribute("data-pin") || sec.id;
      }
    }
    pin.addEventListener("click", function () {
      try { window.localStorage.removeItem(key); } catch (e) { /* 忽略 */ }
      pin.hidden = true;
    });
    window.addEventListener("scroll", function () {
      var cur = null;
      document.querySelectorAll(".chapter[id], section[id]").forEach(function (c) {
        if (c.offsetTop <= window.scrollY + window.innerHeight * 0.5) cur = c;
      });
      try {
        if (cur) {
          window.localStorage.setItem(key, cur.id);
          if (pin.hidden) {
            pin.hidden = false;
            pin.querySelector(".bm-ch").textContent = cur.getAttribute("data-pin") || cur.id;
          }
        }
      } catch (e) { /* 忽略 */ }
    }, { passive: true });
  }
})();

/* ============ 阅读状态:已读 / 收藏 / 隐藏 ============ */
(function () {
  "use strict";
  var KEY = "csg.reader.v1";
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { read: {}, fav: {}, hidden: {} }; }
    catch (e) { return { read: {}, fav: {}, hidden: {} }; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  var state = load();
  function idFromHref(href) {
    var m = String(href || "").match(/companies\/([^\/?#]+)\.html/);
    return m ? m[1] : null;
  }
  function toggle(bucket, id) {
    if (state[bucket][id]) delete state[bucket][id]; else state[bucket][id] = 1;
    save(state);
  }

  /* —— 卷内页:在书眉注入三枚印章按钮 —— */
  var bookId = document.body.getAttribute("data-book");
  var bar = document.querySelector(".masthead-bar");
  if (bookId && bar) {
    var wrap = document.createElement("span");
    wrap.className = "reader-tools";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "阅读状态");
    var defs = [
      { b: "read", on: "已读", off: "未读" },
      { b: "fav", on: "★ 已藏", off: "☆ 收藏" },
      { b: "hidden", on: "已隐藏", off: "隐藏" }
    ];
    var btns = {};
    defs.forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "reader-btn";
      b.addEventListener("click", function () {
        toggle(d.b, bookId);
        render();
      });
      btns[d.b] = b;
      wrap.appendChild(b);
    });
    bar.appendChild(wrap);
    var render = function () {
      defs.forEach(function (d) {
        var on = !!state[d.b][bookId];
        btns[d.b].textContent = on ? d.on : d.off;
        btns[d.b].classList.toggle("on", on);
        btns[d.b].setAttribute("aria-pressed", on ? "true" : "false");
      });
    };
    render();
  }

  /* —— 书架页:卡片角标 + 筛选条 —— */
  var books = document.querySelectorAll("a.gbook");
  if (books.length) {
    var items = [];
    books.forEach(function (a) {
      var id = idFromHref(a.getAttribute("href"));
      if (!id) return;
      var tag = document.createElement("span");
      tag.className = "reader-mark";
      a.appendChild(tag);
      items.push({ id: id, el: a, tag: tag });
    });

    var bar2 = document.createElement("div");
    bar2.className = "reader-filter";
    bar2.setAttribute("role", "toolbar");
    bar2.setAttribute("aria-label", "书架筛选");
    var showHidden = false;
    var tabs = [
      { k: "all", t: "全部" },
      { k: "unread", t: "未读" },
      { k: "fav", t: "收藏" },
      { k: "read", t: "已读" },
      { k: "hidden", t: "已隐藏" }
    ];
    var cur = "all";
    var tabBtns = {};
    tabs.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "reader-tab";
      b.textContent = t.t;
      b.addEventListener("click", function () {
        cur = (cur === t.k) ? "all" : t.k;
        render2();
      });
      tabBtns[t.k] = b;
      bar2.appendChild(b);
    });
    var anchor = document.querySelector("section[style*='margin-top:36px']");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar2, anchor);

    var render2 = function () {
      Object.keys(tabBtns).forEach(function (k) {
        tabBtns[k].classList.toggle("on", cur === k);
      });
      var counts = { all: 0, unread: 0, fav: 0, read: 0, hidden: 0 };
      items.forEach(function (it) {
        var isR = !!state.read[it.id], isF = !!state.fav[it.id], isH = !!state.hidden[it.id];
        it.tag.textContent = "";
        it.tag.classList.toggle("m-read", isR);
        it.tag.classList.toggle("m-fav", isF);
        it.tag.classList.toggle("m-hidden", isH);
        if (isF) it.tag.textContent = "★";
        else if (isH) it.tag.textContent = "藏";
        else if (isR) it.tag.textContent = "读";
        it.el.classList.toggle("is-fav", isF);
        it.el.classList.toggle("is-hidden", isH);
        var visible = true;
        if (isH && !showHidden && cur !== "hidden") visible = false;
        if (cur === "unread" && (isR || isH)) visible = false;
        if (cur === "fav" && !isF) visible = false;
        if (cur === "read" && !isR) visible = false;
        if (cur === "hidden" && !isH) visible = false;
        it.el.style.display = visible ? "" : "none";
        if (visible) {
          if (isH) counts.hidden++;
          else if (isF) counts.fav++;
          else if (isR) counts.read++;
          else counts.unread++;
          counts.all++;
        }
      });
      tabBtns.all.textContent = "全部(" + counts.all + ")";
      tabBtns.unread.textContent = "未读(" + counts.unread + ")";
      tabBtns.fav.textContent = "收藏(" + counts.fav + ")";
      tabBtns.read.textContent = "已读(" + counts.read + ")";
      tabBtns.hidden.textContent = "已隐藏(" + counts.hidden + ")";
    };
    var reveal = document.createElement("button");
    reveal.type = "button";
    reveal.className = "reader-tab reader-reveal";
    reveal.textContent = "显示隐藏卷";
    reveal.addEventListener("click", function () {
      showHidden = !showHidden;
      reveal.classList.toggle("on", showHidden);
      render2();
    });
    bar2.appendChild(reveal);
    render2();
  }
})();
