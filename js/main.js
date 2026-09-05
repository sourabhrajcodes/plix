const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const filterBar = document.getElementById("filterBar");
const galleryGrid = document.getElementById("galleryGrid");
const phoneSection = document.getElementById("phoneSection");
const phoneGrid = document.getElementById("phoneGrid");
const aboutStats = document.getElementById("aboutStats");
const contactForm = document.getElementById("contactForm");
const formStatus = document.querySelector(".form-status");
const yearEl = document.getElementById("year");
const lightbox = document.getElementById("lightbox");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxMedia = document.querySelector(".lightbox-media");
const lightboxTitle = document.querySelector(".lightbox-title");
const lightboxMeta = document.querySelector(".lightbox-meta");
const lightboxDesc = document.querySelector(".lightbox-desc");

let activeFilter = "all";
let lastFocused = null;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const whenIdle = window.requestIdleCallback || function(cb){ return setTimeout(cb, 1); };
let scrollLockPadding = 0;

function categoryLabel(id) {
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat ? cat.label : id;
}

function initials(title) {
  return title
    .split(/\s+/)
    .filter((w) => /[a-zA-Z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function renderFilters() {
  const chips = [{ id: "all", label: "All Work" }, ...CATEGORIES];
  chips.forEach(({ id, label }) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (id === activeFilter ? " active" : "");
    chip.textContent = label;
    chip.dataset.filter = id;
    chip.addEventListener("click", function() {
      activeFilter = id;
      filterBar.querySelectorAll(".chip").forEach(function(c){ c.classList.remove("active"); });
      chip.classList.add("active");
      try { chip.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest", inline: "center" }); } catch(e){}
      renderGallery(id);
    });
    filterBar.appendChild(chip);
  });
}

function makeCard(project, isPhone) {
  const card = document.createElement("article");
  card.className = "card reveal" + (isPhone ? " card-phone" : "");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", "Play " + project.title);

  const thumb = document.createElement("div");
  thumb.className = "thumb";

  const fallback = document.createElement("span");
  fallback.className = "thumb-fallback";
  fallback.textContent = initials(project.title);

  const img = document.createElement("img");
  img.src = project.thumbnail;
  img.alt = project.title;
  img.loading = "lazy";
  img.decoding = "async";
  img.fetchPriority = "low";
  if (project.thumbnail.startsWith("http") && project.thumbnail.includes("ytimg")) img.referrerPolicy = "no-referrer";
  img.addEventListener("error", () => img.remove(), { passive: true });

  const playBadge = document.createElement("span");
  playBadge.className = "play-badge";
  playBadge.textContent = "▶";

  thumb.append(fallback, img, playBadge);

  if (project.duration) {
    const duration = document.createElement("span");
    duration.className = "duration";
    duration.textContent = project.duration;
    thumb.appendChild(duration);
  }

  const body = document.createElement("div");
  body.className = "card-body";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = categoryLabel(project.category);

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = project.title;

  body.append(tag, title);

  if (project.client) {
    const client = document.createElement("p");
    client.className = "card-client";
    client.textContent = project.client;
    body.appendChild(client);
  }

  card.append(thumb, body);

  const open = () => openLightbox(project);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  return card;
}

function isVerticalProject(p) {
  return p.category === "reels" || p.embedUrl.includes("instagram.com") || (p.thumbnail && p.thumbnail.includes("ig-reel"));
}
function renderGallery(filterId) {
  galleryGrid.innerHTML = "";
  phoneGrid.innerHTML = "";

  let landscape = [];
  let phones = [];

  if (filterId === "all") {
    phones = PROJECTS.filter((p) => isVerticalProject(p));
    landscape = PROJECTS.filter((p) => !isVerticalProject(p));
  } else if (filterId === "reels") {
    phones = PROJECTS.filter((p) => p.category === "reels");
  } else if (filterId === "before-after") {
    const filtered = PROJECTS.filter((p) => p.category === filterId);
    phones = filtered.filter((p) => isVerticalProject(p));
    landscape = filtered.filter((p) => !isVerticalProject(p));
  } else {
    landscape = PROJECTS.filter((p) => p.category === filterId);
  }

  phoneSection.hidden = phones.length === 0;

  landscape.forEach((project) => {
    const card = makeCard(project, false);
    galleryGrid.appendChild(card);
    observeReveal(card);
  });

  phones.forEach((project) => {
    const card = makeCard(project, true);
    phoneGrid.appendChild(card);
    observeReveal(card);
  });
}

function buildEmbedUrl(url) {
  if (url.includes("drive.google.com")) return url;
  if (url.includes("instagram.com")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return url + sep + "autoplay=1&rel=0";
}

function fillLightbox(item) {
  const isInstagram = item.embedUrl.includes("instagram.com");
  lightboxMedia.classList.toggle("is-instagram", isInstagram);
  const iframe = document.createElement("iframe");
  iframe.src = buildEmbedUrl(item.embedUrl);
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.title = item.title;
  if (isInstagram) {
    iframe.setAttribute("scrolling", "no");
  }
  lightboxMedia.innerHTML = "";
  lightboxMedia.appendChild(iframe);

  lightboxTitle.textContent = item.title;
  lightboxDesc.textContent = item.description || "";

  const metaParts = [item.client, item.year, item.duration].filter(Boolean);
  lightboxMeta.textContent = metaParts.join(" · ");
  lightboxMeta.style.display = metaParts.length ? "" : "none";
}

function openLightbox(item) {
  lastFocused = document.activeElement;
  fillLightbox(item);
  lightbox.hidden = false;
  scrollLockPadding = window.innerWidth - document.documentElement.clientWidth;
  if (scrollLockPadding > 0) document.body.style.paddingRight = scrollLockPadding + "px";
  const nav = document.querySelector(".nav");
  if (nav && scrollLockPadding > 0) nav.style.paddingRight = "calc(clamp(1.25rem, 5vw, 3.5rem) + " + scrollLockPadding + "px)";
  document.body.style.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
  lightbox.setAttribute("aria-hidden", "false");
  document.querySelectorAll("header, main, section, footer").forEach(function(el){ if(!lightbox.contains(el)) el.setAttribute("aria-hidden","true"); });
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxMedia.innerHTML = "";
  lightboxMedia.classList.remove("is-instagram");
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  const nav = document.querySelector(".nav");
  if (nav) nav.style.paddingRight = "";
  document.documentElement.style.overscrollBehavior = "";
  lightbox.setAttribute("aria-hidden", "true");
  document.querySelectorAll("[aria-hidden='true']").forEach(function(el){ if(el !== lightbox) el.removeAttribute("aria-hidden"); });
  if (lastFocused) lastFocused.focus();
}

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  if (e.key === "Tab" && !lightbox.hidden) {
    const focusable = lightbox.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}, { passive: false });

lightbox.addEventListener("click", function(e) {
  if (e.target === lightbox) closeLightbox();
}, { passive: true });

lightboxClose.addEventListener("click", closeLightbox, { passive: true });

let touchStartY = 0;
lightbox.addEventListener("touchstart", function(e){ touchStartY = e.touches[0].clientY; }, { passive: true });
lightbox.addEventListener("touchend", function(e){
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (dy > 90 && !lightbox.hidden) closeLightbox();
}, { passive: true });

navToggle.addEventListener("click", function() {
  const isOpen = navLinks.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    const firstLink = navLinks.querySelector("a");
    if (firstLink) firstLink.focus();
  }
}, { passive: true });

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const showreelBtn = document.getElementById("showreelBtn");
if (showreelBtn) {
  showreelBtn.addEventListener("click", () => openLightbox(SHOWREEL));
}

function initBeforeAfter() {
  document.querySelectorAll("[data-ba]").forEach((wrap) => {
    const range = wrap.querySelector(".ba-range");
    const handle = wrap.querySelector(".ba-handle");
    const setPos = (v) => {
      wrap.style.setProperty("--pos", v + "%");
      if (handle) handle.style.left = v + "%";
    };
    if (!range) return;
    setPos(range.value);
    range.addEventListener("input", () => setPos(range.value));
  });
}

let observer = null;

function observeReveal(el) {
  if (!observer) return;
  observer.observe(el);
}

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  observer = new IntersectionObserver(
    function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
} else {
  document.querySelectorAll(".reveal").forEach(function(el){ el.classList.add("visible"); });
}

whenIdle(function(){ document.querySelectorAll(".reveal").forEach(observeReveal); });

document.addEventListener("touchstart", function(){}, { passive: true });
window.addEventListener("resize", function(){
  if (window.innerWidth > 900 && navLinks.classList.contains("open")) {
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
}, { passive: true });

const STATS = [
  { value: "48h", suffix: "", label: "Avg turnaround" },
  { value: "30+", suffix: "", label: "Real Estate edits" },
  { value: "2", suffix: "×", label: "Formats per cut" }
];

if (aboutStats) {
  STATS.forEach(({ value, suffix, label }) => {
    const stat = document.createElement("div");
    stat.className = "stat";
    const b = document.createElement("b");
    b.append(value);
    if (suffix) {
      const em = document.createElement("em");
      em.textContent = suffix;
      b.appendChild(em);
    }
    const small = document.createElement("small");
    small.textContent = label;
    stat.append(b, small);
    aboutStats.appendChild(stat);
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const action = contactForm.getAttribute("action") || "";

    if (action.includes("YOUR_FORM_ID")) {
      formStatus.className = "form-status err";
      formStatus.textContent = "Demo form — replace YOUR_FORM_ID with your Formspree ID to receive messages, or WhatsApp me directly.";
      return;
    }

    try {
      const res = await fetch(action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      formStatus.className = "form-status ok";
      formStatus.textContent = "Sent! I will cut your 10-sec sample soon.";
      contactForm.reset();
    } catch (err) {
      formStatus.className = "form-status err";
      formStatus.textContent = "Something went wrong. Please WhatsApp me directly.";
    }
  });
}

if (yearEl) yearEl.textContent = new Date().getFullYear();

function initPage(){
  renderFilters();
  renderGallery(activeFilter);
  initBeforeAfter();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function(){ whenIdle(initPage); }, { once: true, passive: true });
} else {
  whenIdle(initPage);
}

// ── Design switcher: Premium (default) <-> Minimal (clean functional) ──
(function initThemeSwitcher() {
  const toggle = document.getElementById("themeToggle");
  const metaTheme = document.getElementById("metaTheme");
  if (!toggle) return;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("plix-re-theme", theme); } catch (e) {}
    const isMinimal = theme === "minimal";
    toggle.textContent = isMinimal ? "Premium" : "Minimal";
    toggle.setAttribute("aria-pressed", String(isMinimal));
    toggle.title = isMinimal ? "Switch to Premium design" : "Switch to Minimal design";
    if (metaTheme) metaTheme.setAttribute("content", isMinimal ? "#ffffff" : "#fdfcf8");
  }

  let initial = "premium";
  try {
    const saved = localStorage.getItem("plix-re-theme");
    if (saved === "minimal" || saved === "premium") initial = saved;
  } catch (e) {}
  applyTheme(document.documentElement.getAttribute("data-theme") || initial);

  toggle.addEventListener("click", function() {
    const current = document.documentElement.getAttribute("data-theme") === "minimal" ? "minimal" : "premium";
    applyTheme(current === "minimal" ? "premium" : "minimal");
  });
})();
