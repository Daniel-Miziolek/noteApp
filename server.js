const http = require("http");
const fs = require("fs");
const path = require("path");

const NOTES_DIR = path.join(__dirname, "notes");

if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR);
}

const server = http.createServer((req, res) => {
    const { method } = req;
    const url = req.url;

    if (url.startsWith("/notes")) {

        if (method === "GET") {
            const files = fs.readdirSync(NOTES_DIR);

            const notes = files.map(file => {
                const raw = fs.readFileSync(path.join(NOTES_DIR, file), "utf-8");
                const [category, title] = file.split("__");

                return {
                    title: title || file,
                    content: raw,
                    category: category || "Brak"
                };
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(notes));
        }

        if (method === "POST") {
            let body = "";

            req.on("data", chunk => body += chunk);
            req.on("end", () => {
                const data = JSON.parse(body);

                const safeCategory = data.category.replace(/\s+/g, "_");
                const fileName = `${safeCategory}__${data.title}`;
                const filePath = path.join(NOTES_DIR, fileName);

                fs.writeFile(filePath, data.content, err => {
                    if (err) {
                        res.writeHead(500, { "Content-Type": "application/json" });
                        return res.end(JSON.stringify({ message: "Błąd zapisu pliku" }));
                    }

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: "ok" }));
                });
            });
            return;
        }

        if (method === "DELETE") {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const title = urlObj.searchParams.get("title");

            if (title) {
                const filePath = path.join(NOTES_DIR, title);

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "deleted" }));
                } else {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "not found" }));
                }
            }

            const files = fs.readdirSync(NOTES_DIR);
            files.forEach(file => {
                fs.unlinkSync(path.join(NOTES_DIR, file));
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ message: "cleared" }));
        }

        if (method === "PUT") {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", () => {
                const data = JSON.parse(body);
                const oldPath = path.join(NOTES_DIR, data.oldFile);

                if (!fs.existsSync(oldPath)) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ message: "not found" }));
                }

                const safeCategory = data.category.replace(/\s+/g, "_");
                const newFileName = `${safeCategory}__${data.title}`;
                const newPath = path.join(NOTES_DIR, newFileName);

                fs.writeFile(oldPath, data.content, err => {
                    if (err) {
                        res.writeHead(500, { "Content-Type": "application/json" });
                        return res.end(JSON.stringify({ message: "Błąd zapisu pliku" }));
                    }
                    if (oldPath !== newPath) {
                        fs.renameSync(oldPath, newPath);
                    }
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: "updated" }));
                });
            });
            
            return;
        }
    }

    let filePath = path.join(__dirname, url === "/" ? "index.html" : url);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found");
        } else {
            res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
            res.end(content);
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});