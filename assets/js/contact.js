"use strict";

// Contact page (contact/) and its "contact received" page (contact/thanks/).
// The form posts to dartfapper-api /api/contact, then goes to thanks/,
// which is the page Google Ads counts as a conversion.

const DICT = window.I18N || { en: {} };
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

let lang = "en";
try { const saved = localStorage.getItem("lang"); if (saved && DICT[saved]) lang = saved; } catch {}
const ui = (key) => (DICT[lang] && DICT[lang][key]) ?? DICT.en[key] ?? key;

function applyText() {
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = ui(el.dataset.i18n); });
  $$("[data-i18n-html]").forEach((el) => { el.innerHTML = ui(el.dataset.i18nHtml); });
  $$("[data-i18n-ph]").forEach((el) => { el.placeholder = ui(el.dataset.i18nPh); });
  $$("[data-lang-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang)));
}

$$("[data-lang-btn]").forEach((b) => b.addEventListener("click", () => {
  lang = b.dataset.langBtn;
  try { localStorage.setItem("lang", lang); } catch {}
  applyText();
}));

applyText();
$$("[data-discord]").forEach((a) => {
  if (window.DISCORD_URL) a.href = window.DISCORD_URL;
  else a.style.display = "none";
});
$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- form ---------- */
const form = $("[data-contact-form]");
if (form) {
  const params = new URLSearchParams(location.search);
  const preset = form.querySelector(`input[name="service"][value="${CSS.escape(params.get("service") || "")}"]`);
  if (preset) preset.checked = true;

  const errorBox = $("[data-contact-error]");
  const submit = $("[data-contact-submit]");
  const showError = (key) => {
    errorBox.textContent = ui(key);
    errorBox.hidden = false;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim()) return showError("contact.err.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return showError("contact.err.email");
    if (data.message.trim().length < 10) return showError("contact.err.message");
    if (!window.API_URL) return showError("contact.err.server");

    // keep the ad click id / utm tags so a lead can be traced back to its campaign
    data.source = location.search.slice(1, 200);
    submit.disabled = true;
    submit.textContent = ui("contact.sending");
    try {
      const res = await fetch(`${window.API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) return location.assign("thanks/");
      const err = await res.json().catch(() => ({}));
      showError(err.error === "rate_limited" ? "contact.err.rate" : err.field ? `contact.err.${err.field}` : "contact.err.server");
    } catch {
      showError("contact.err.server");
    }
    submit.disabled = false;
    submit.textContent = ui("contact.submit");
  });
}
