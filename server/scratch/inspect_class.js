const pdf = require("pdf-parse");
console.log("PDFParse class constructor:", pdf.PDFParse.toString().slice(0, 300));
try {
    const parser = new pdf.PDFParse(Buffer.from([]));
    console.log("Constructor succeeded! Methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
} catch (err) {
    console.error("Constructor failed:", err);
}
