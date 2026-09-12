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
