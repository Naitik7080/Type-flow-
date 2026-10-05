const toast = document.getElementById("toast");

function showMessage(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

document.querySelectorAll(".dot").forEach((dot) => {
  dot.addEventListener("click", () => {
    document.querySelectorAll(".dot").forEach(d => d.classList.remove("active"));
    dot.classList.add("active");
    showMessage("Banner changed");
  });
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav a").forEach(a => a.classList.remove("active"));
    link.classList.add("active");
  });
});
