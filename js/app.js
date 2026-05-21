const VIEWS = ["catalogo", "pedidos", "clientas", "cobros", "prendas", "cuenta"];

function showView(viewId) {
  if (!VIEWS.includes(viewId)) viewId = "catalogo";

  document.querySelectorAll(".view").forEach((section) => {
    const isActive = section.id === viewId;
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });

  document.querySelectorAll(".nav-item").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });
}

function getViewFromHash() {
  const hash = location.hash.replace("#", "");
  return VIEWS.includes(hash) ? hash : "catalogo";
}

function navigate(viewId) {
  history.replaceState(null, "", `#${viewId}`);
  showView(viewId);
}

document.querySelector(".bottom-nav").addEventListener("click", (e) => {
  const link = e.target.closest(".nav-item");
  if (!link) return;
  e.preventDefault();
  navigate(link.dataset.view);
});

window.addEventListener("hashchange", () => {
  showView(getViewFromHash());
});

showView(getViewFromHash());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
