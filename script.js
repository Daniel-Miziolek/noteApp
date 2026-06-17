const apiUrl = "/notes";
let currentSort = "az";
let shown = 0;
let listOfTitles = [];

function getCategoryClass(cat) {
    const known = ["Sport","Zdrowie","Dom","Praca","Hobby","Inne"];
    return known.includes(cat) ? `tag-${cat}` : "";
}

function updateCount(n) {
    const el = document.getElementById("notesCount");
    if (el) el.textContent = `${n} ${n === 1 ? "notatka" : n < 5 ? "notatki" : "notatek"}`;
    const empty = document.getElementById("emptyState");
    if (empty) empty.style.display = n === 0 ? "block" : "none";
}

function setSort(mode) {
    currentSort = mode;
    document.getElementById("sortAZ").classList.toggle("active", mode === "az");
    document.getElementById("sortZA").classList.toggle("active", mode === "za");
    fetchNotes();
}

async function fetchNotes() {
    const res = await fetch(apiUrl);
    let notes = await res.json();

    notes.sort((a, b) => {
        const ta = a.title.replace(/\.txt$/i, "").toLowerCase();
        const tb = b.title.replace(/\.txt$/i, "").toLowerCase();
        return currentSort === "az"
            ? ta.localeCompare(tb, "pl")
            : tb.localeCompare(ta, "pl");
    });

    const list = document.getElementById("noteList");
    list.innerHTML = "";
    updateCount(notes.length);

    notes.forEach((note, i) => {
        const li = document.createElement("li");
        li.style.animationDelay = `${i * 40}ms`;
        li.dataset.original = `${note.category}__${note.title}`; // <-- nowość
        const tagClass = getCategoryClass(note.category);
        const tagStyle = tagClass ? "" : `style="background:#1e2535;color:#94a3b8"`;
        li.innerHTML = `
            <div class="note-body">
                <div class="note-title"><input type="text" class="edit-title" value="${escHtml(note.title.replace(/\.txt$/, ""))}" disabled></div>
                <div class="note-content"><textarea class="edit-content" disabled>${escHtml(note.content)}</textarea></div>
                <div class="note-meta">
                    <span class="tag ${tagClass}" ${tagStyle}>${escHtml(note.category)}</span>
                    <button class="btn btn-save" title="Zapisz notatkę" onclick="save(this)">Zapisz</button>
                    <button class="btn btn-cancel" title="Anuluj edytowanie notatki" onclick="cancelEdit(this)">Anuluj</button>
                </div>
            </div>
            <button class="btn btn-icon" title="Usuń notatkę" onclick="deleteNote('${escAttr(note.category)}__${escAttr(note.title)}')">✕</button>
            <button class="btn btn-edit" title="Edytuj notatkę" onclick="editNote(this)"><i class="fa-solid fa-pen-to-square" style="color: var(--text-secondary);"></i></button>
        `;
        list.appendChild(li);
        listOfTitles.push(note.title);
    });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function escAttr(str) {
    return String(str).replace(/'/g,"\\'");
}

async function addNote() {
    const fileName = document.getElementById("fileName");
    const content  = document.getElementById("content");
    const category = document.getElementById("category");

    if (!fileName.value.trim() || !content.value.trim()) {
        alert("Wpisz tytuł i treść notatki!");
        return;
    }

    await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: fileName.value.trim() + ".txt",
            content: content.value.trim(),
            category: category.value
        })
    });

    fileName.value = "";
    content.value  = "";
    fileName.focus();
    fetchNotes();
    cancel();
}

async function deleteNote(title) {
    await fetch(`/notes?title=${encodeURIComponent(title)}`, { method: "DELETE" });
    fetchNotes();
}

function cancel() {
    let card =  document.getElementsByClassName("card")[0];
    let elements = document.getElementsByClassName("transparent-effect")[0];

    card.style.display = "none";
    elements.style.opacity = 1;
}

function cancelAi() {
    let card =  document.getElementsByClassName("card-ai")[0];
    let elements = document.getElementsByClassName("transparent-effect")[0];

    card.style.display = "none";
    elements.style.opacity = 1;
}

function addCategory(selectId = "category") {
    const newCategory = prompt("Nazwa nowej kategorii:");
    if (!newCategory || !newCategory.trim()) return;
    const select = document.getElementById(selectId);
    const opt = new Option(newCategory.trim(), newCategory.trim());
    select.add(opt);
    select.value = newCategory.trim();
}

function showNoteAdd() {
    let card =  document.getElementsByClassName("card")[0];
    let elements = document.getElementsByClassName("transparent-effect")[0];
    
    card.style.display = "block";
    elements.style.opacity = 0.1;
}

function showInput() {
    let input = document.getElementsByClassName("find-input")[0];

    shown = shown === 0 ? 1 : 0; 
    input.style.display = shown === 0 ? "block" : "none";
}

function showAi() {
    let card =  document.getElementsByClassName("card-ai")[0];
    let elements = document.getElementsByClassName("transparent-effect")[0];
    
    card.style.display = "block";
    elements.style.opacity = 0.1;
}

function search(ele) {
    if (event.key === 'Enter') {
        let text = ele.value;
        let textToFind = ele.value + ".txt";

        if (listOfTitles.includes(textToFind)) {
            let titles = document.getElementsByClassName("edit-title");

            for (let i = 0; i < titles.length; i++) {
                if (titles[i].value === text) {
                    titles[i].style.backgroundColor = "#6f798f";
                    titles[i].scrollIntoView();
                }
            }
        } else {
            alert("Nie ma takiej notatki");
        }
    } else if (event.key === 'Escape') {
        let titles = document.getElementsByClassName("edit-title");

        for (let i = 0; i < titles.length; i++) {
            titles[i].style.backgroundColor = "#161b22";
        }
    }
}

async function generateNote() {
    const noteDescription = document.getElementById("NoteDescription").value;
    const contentArea = document.getElementById("aiContent");

    if (!noteDescription.trim()) {
        alert("Wpisz opis notatki!");
        return;
    }

    contentArea.value = "Generowanie...";

    try {
        const prompt = `Napisz notatkę na temat: ${noteDescription}`;
        const result = await sendMessage(prompt);
        contentArea.value = result.trim();
    } catch (err) {
        console.error(err);
        contentArea.value = "";
        alert("Nie udało się wygenerować treści. Sprawdź, czy Ollama działa na localhost:11434.");
    }
}

function editNote(btn) {
    const li = btn.closest("li");
    const titleInput = li.querySelector(".edit-title");
    const contentArea = li.querySelector(".edit-content");
    li.querySelector(".btn-cancel").style.display = "block";
    li.querySelector(".btn-save").style.display = "block";

    titleInput.disabled = false;
    contentArea.disabled = false;
    titleInput.focus();
}

function cancelEdit(btn) {
    console.log("cos");
    const li = btn.closest("li");
    const titleInput = li.querySelector(".edit-title");
    const contentArea = li.querySelector(".edit-content");
    li.querySelector(".btn-cancel").style.display = "none";
    li.querySelector(".btn-save").style.display = "none";

    titleInput.disabled = true;
    contentArea.disabled = true;
}

async function sendMessage(message) {
    const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "llama3",
            prompt: message,
            stream: false
        })
    });
    const data = await res.json();
    return data.response;
}

async function save(btn) {
    const li = btn.closest("li");
    const titleInput = li.querySelector(".edit-title");
    const contentArea = li.querySelector(".edit-content");
    const categorySpan = li.querySelector(".tag");
    const oldFile = li.dataset.original;

    const newTitle = titleInput.value.trim();
    const newContent = contentArea.value.trim();
    const category = categorySpan.textContent.trim();

    if (!newTitle || !newContent) {
        alert("Tytuł i treść nie mogą być puste!");
        return;
    }

    await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            oldFile: oldFile,
            title: newTitle + ".txt",
            content: newContent,
            category: category
        })
    });

    titleInput.disabled = true;
    contentArea.disabled = true;
    li.querySelector(".btn-save").style.display = "none";
    li.querySelector(".btn-cancel").style.display = "none";

    fetchNotes();
}

async function addNoteAi() {
    const fileName = document.getElementById("aiFileName");
    const content  = document.getElementById("aiContent");
    const category = document.getElementById("aiCategory");
    const description = document.getElementById("NoteDescription");

    if (!fileName.value.trim() || !content.value.trim()) {
        alert("Wpisz tytuł i wygeneruj treść notatki!");
        return;
    }

    await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: fileName.value.trim() + ".txt",
            content: content.value.trim(),
            category: category.value
        })
    });

    fileName.value = "";
    content.value  = "";
    description.value = "";
    fetchNotes();
    cancelAi();
}

fetchNotes();