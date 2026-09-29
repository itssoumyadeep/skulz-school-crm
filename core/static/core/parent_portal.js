(() => {
  const toast = document.querySelector(".toast");
  let toastTimer;
  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => {
      toast.textContent = button.dataset.toast;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
    });
  });

  document.querySelectorAll('.nav-item[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-item")
        .forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  const childButton = document.querySelector(".child-button");
  childButton.addEventListener("click", () => {
    childButton.querySelector(".chevron").textContent =
      childButton.querySelector(".chevron").textContent === "⌄" ? "⌃" : "⌄";
    toast.textContent = "Child switcher is ready for additional profiles";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  });
})();
