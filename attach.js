// Attachments for provider profiles (images and PDFs).
// Files are stored inside Firestore as data URLs, so no paid Firebase Storage plan is needed.
// Limits keep each record under Firestore's 1 MB document size.
window.dwAttach = (function () {
  const MAX_FILES = 5;
  const MAX_PDF = 600 * 1024;        // bytes
  const MAX_DATA_LEN = 850000;       // characters in the data URL
  const OK_DATA = /^data:(image\/jpeg|application\/pdf);base64,/;

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("Could not read the file."));
      r.readAsDataURL(file);
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
      img.src = url;
    });
  }

  async function fromFile(file) {
    const name = String(file.name || "file").slice(0, 80);
    if (file.type === "application/pdf") {
      if (file.size > MAX_PDF) throw new Error("PDF must be under 600 KB. Please compress it or send a photo instead.");
      const data = await readAsDataURL(file);
      if (!data.startsWith("data:application/pdf;base64,")) throw new Error("That does not look like a PDF.");
      return { name, type: "application/pdf", size: file.size, data };
    }
    if (/^image\//.test(file.type)) {
      const img = await loadImage(file);
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.8, 0.65, 0.5, 0.4]) {
        const data = c.toDataURL("image/jpeg", q);
        if (data.length < MAX_DATA_LEN) {
          return { name: name.replace(/\.[^.]+$/, "") + ".jpg", type: "image/jpeg", size: Math.round(data.length * 0.75), data };
        }
      }
      throw new Error("That image is too large. Please choose a smaller one.");
    }
    throw new Error("Only images and PDF files are allowed.");
  }

  function kb(n) { return n >= 1024 * 1024 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }

  // Draws the list into <ul>. onDelete(item) is optional.
  function render(ul, items, onDelete) {
    ul.textContent = "";
    items.forEach((it) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = (it.name || "file") + " (" + kb(it.size || 0) + ") ";
      li.appendChild(label);
      if (OK_DATA.test(it.data || "")) {
        const a = document.createElement("a");
        a.href = it.data;
        a.download = it.name || "attachment";
        a.textContent = "Download";
        li.appendChild(a);
      }
      if (onDelete) {
        li.appendChild(document.createTextNode(" "));
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn-small btn-ghost";
        b.textContent = "Remove";
        b.addEventListener("click", () => onDelete(it));
        li.appendChild(b);
      }
      ul.appendChild(li);
    });
  }

  return { MAX_FILES, fromFile, render };
})();
